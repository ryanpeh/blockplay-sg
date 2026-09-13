"""Original visual game meshes. Run with Blender --background --python this_file."""
import bpy, math, json, random, sys, shutil, numpy as np
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parents[1]
random.seed(21)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials): bpy.data.materials.remove(d)

def mat(name, color, metal=0, rough=.6):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    # Subtle, original surface variation packed into the GLB; no external textures.
    rng=np.random.default_rng(sum(ord(c) for c in name)); n=256
    grain=rng.normal(1,.026,(n,n,1))
    pixels=np.ones((n,n,4),dtype=np.float32)
    linear=np.clip(np.array(color)[None,None,:]*grain,0,1)
    pixels[:,:,:3]=np.where(linear<=.0031308,12.92*linear,1.055*linear**(1/2.4)-.055)
    img=bpy.data.images.new(name+' surface',width=n,height=n); img.pixels.foreach_set(pixels.ravel()); img.pack()
    tex=m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=img; m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    return m
olive=mat('Olive polymer',(.115,.145,.073),0,.68)
olive2=mat('Olive raised panels',(.16,.185,.10),0,.64)
steel=mat('Parkerized steel',(.045,.054,.058),.72,.38)
edge=mat('Machined edges',(.16,.18,.18),.8,.32)
rubber=mat('Black rubber',(.016,.020,.018),0,.87)
glass=mat('Coated optic glass',(.025,.15,.17),.7,.16)
sand=mat('Canvas khaki',(.32,.275,.17),0,.95)
sand2=mat('Canvas alternate',(.26,.24,.16),0,.95)
concrete=mat('Concrete',(.36,.38,.35),0,.96)
white=mat('Off white paint',(.74,.75,.67),0,.8)
orange=mat('Traffic orange',(.65,.115,.018),0,.58)
red=mat('Oxide red paint',(.39,.037,.025),0,.8)
paper=mat('Target backing',(.49,.40,.26),0,.95)
ROOT=None; PART='body'; objects=[]; catalog=[]

# Modeling coordinates: longitudinal, lateral, height. Export: right +X, up +Y, forward -Z.
def v(p): return Vector((p[1],p[0],p[2]))
def finish(o,name,m,bevel=0):
    o.name=name; o.data.materials.append(m); o.parent=ROOT; o['part']=PART; objects.append(o)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL'); mod.width=bevel; mod.segments=3
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
        for f in o.data.polygons:f.use_smooth=True
        normal=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL'); normal.keep_sharp=True; normal.weight=50
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return o
def box(name,p,size,m,bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1,location=v(p)); o=bpy.context.object
    o.dimensions=(size[1],size[0],size[2]); return finish(o,name,m,bevel)
def cyl(name,p,r,length,m,axis='l',verts=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=length,location=v(p))
    o=bpy.context.object
    if axis=='l': o.rotation_euler[0]=math.pi/2
    elif axis=='w': o.rotation_euler[1]=math.pi/2
    o=finish(o,name,m,.0007)
    for f in o.data.polygons: f.use_smooth=len(f.vertices)==4
    return o
def profile(name,points,width,m,side=0,bevel=.002):
    n=len(points); vertices=[(side+s*width/2,l,h) for s in [-1,1] for l,h in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    return finish(o,name,m,bevel)
def rod(name,a,b,r,m):
    d=v(b)-v(a); o=cyl(name,tuple((a[i]+b[i])/2 for i in range(3)),r,d.length,m,axis='z',verts=12)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return o
def socket(name,p):
    o=bpy.data.objects.new(ROOT.name+'__'+name,None); bpy.context.collection.objects.link(o); o.parent=ROOT; o.location=v(p); o.empty_display_size=.025
    o['socket']=True; objects.append(o)
def begin(id):
    global ROOT,objects,PART
    objects=[]; PART='body'; ROOT=bpy.data.objects.new(id,None); bpy.context.collection.objects.link(ROOT)
    ROOT['asset_id']=id; ROOT['units']='meters'; ROOT['forward']='-Z in glTF'
def screws(points,width):
    for i,(l,h) in enumerate(points):
        for s in [-1,1]:
            cyl('Fastener', (l,s*width/2,h),.004,.002,edge,'w',12)
            box('Fastener recess',(l,s*(width/2+.0011),h),(.004,.0005,.001),rubber,.0001)
def end(id,title,category,description):
    # Merge only within detachable parts; retain multiple PBR material slots.
    for part in sorted(set(o.get('part') for o in objects if o.type=='MESH')):
        group=[o for o in ROOT.children if o.type=='MESH' and o.get('part')==part]
        bpy.ops.object.select_all(action='DESELECT')
        for o in group:o.select_set(True)
        bpy.context.view_layer.objects.active=group[0]; bpy.ops.object.join(); group[0].name=ROOT.name+'__'+part
        bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        # UVs supplied for future texturing; shipped appearance uses PBR factors.
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(island_margin=.015); bpy.ops.object.mode_set(mode='OBJECT')
        tri=group[0].modifiers.new('Export triangulation','TRIANGULATE'); bpy.ops.object.modifier_apply(modifier=tri.name)
    children=list(ROOT.children)
    meshes=[o for o in children if o.type=='MESH']
    corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    lo=[min(c[i] for c in corners) for i in range(3)]; hi=[max(c[i] for c in corners) for i in range(3)]
    bpy.ops.object.select_all(action='DESELECT'); ROOT.select_set(True)
    for o in children:o.select_set(True)
    out=BASE/'public/models'/f'{id}.glb'
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False)
    catalog.append(dict(id=id,title=title,category=category,description=description,file=f'/models/{id}.glb',triangles=sum(len(o.data.polygons) for o in meshes),bytes=out.stat().st_size,dimensions=[round(hi[0]-lo[0],3),round(hi[2]-lo[2],3),round(hi[1]-lo[1],3)],sockets=[o.name for o in children if o.type=='EMPTY'],root=ROOT.name))
    return ROOT

begin('sar21-inspired')
profile('Bullpup shell',[(-.425,.065),(-.425,.218),(-.33,.245),(.225,.235),(.275,.185),(.255,.11),(.09,.09),(.015,.075),(-.14,.09),(-.28,.07)],.071,olive,.0,.007)
box('Butt pad',(-.433,0,.14),(.022,.078,.167),rubber,.006)
profile('Upper receiver',[(-.31,.225),(-.30,.265),(.18,.263),(.224,.232)],.057,steel,bevel=.003)
profile('Cheek panel',[(-.4,.195),(-.38,.235),(-.20,.245),(-.13,.209)],.076,olive2,bevel=.003)
profile('Pistol grip',[(-.02,.12),(.037,.1),(.00,-.047),(-.048,-.063),(-.066,-.033)],.037,olive,bevel=.006)
profile('Trigger guard lower',[(-.049,-.044),(.07,-.034),(.107,.098),(.089,.1),(.06,-.017),(-.04,-.028)],.022,olive,bevel=.003)
profile('Trigger',[(.032,.085),(.044,.082),(.047,.045),(.031,.023),(.023,.03),(.032,.05)],.009,steel,bevel=.001)
for i in range(5):box('Grip texture',(-.029,0,-.027+i*.018),(.046,.040,.004),rubber,.001)
for s in [-1,1]:
    profile('Handguard inset',[(.085,.13),(.235,.142),(.251,.184),(.083,.181)],.002,olive2,side=s*.0365)
    for i in range(5):box('Handguard vent',(.103+i*.025,s*.039,.2),(.015,.002,.008),rubber,.002)
    box('Ejection recess',(-.235,s*.037,.164),(.075,.003,.022),steel)
    cyl('Selector dial',(-.076,s*.04,.13),.011,.005,steel,'w')
cyl('Barrel',(.304,0,.197),.012,.135,steel)
cyl('Gas collar',(.257,0,.197),.02,.025,steel)
cyl('Muzzle shroud',(.387,0,.197),.017,.048,steel)
cyl('Muzzle dark face',(.4115,0,.197),.010,.001,rubber)
for s in [-1,1]:
    for i in range(3):box('Muzzle slots',(.375+i*.009,s*.016,.197),(.004,.001,.013),rubber,.0004)
# Distinctive elevated integrated optic, with open space below.
PART='optic'
for l in [-.15,.13]:profile('Optic bridge',[(l-.028,.256),(l+.025,.256),(l+.015,.315),(l-.015,.319)],.035,olive,bevel=.003)
cyl('Optic tube',(-.015,0,.328),.026,.30,olive)
for l in [-.174,.144]:cyl('Optic housing',(l,0,.328),.032,.035,rubber)
for l in [-.192,.162]:cyl('Optic lens',(l,0,.328),.024,.001,glass)
cyl('Optic turret',(-.03,0,.36),.014,.018,steel,'z')
box('Optic top rib',(-.01,0,.356),(.24,.017,.007),olive)
PART='body'
screws([(-.36,.115),(-.11,.186),(.06,.215),(.21,.15)],.075)
PART='magazine'
profile('Magazine',[(-.274,.104),(-.208,.103),(-.19,-.099),(-.209,-.142),(-.272,-.132),(-.28,-.068)],.035,steel,bevel=.004)
for s in [-1,1]:
    for i in range(3):box('Magazine ribs',(-.261+i*.02,s*.019,-.022),(.005,.002,.165),edge,.001)
box('Magazine base',(-.241,0,-.134),(.071,.041,.014),rubber)
PART='body'; socket('socket_muzzle',(.414,0,.197)); socket('socket_grip',(0,0,0)); socket('socket_support',(.17,0,.105)); socket('socket_sight',(-.19,0,.328)); socket('socket_eject',(-.23,.043,.164))
sar=end('sar21-inspired','SAR 21 / Bullpup','Weapon','SAR 21-inspired silhouette with elevated optic, olive polymer and detachable rear magazine.')

# Fast, reproducible optic update without rebuilding the other assets or studio renders.
if '--sar-only' in sys.argv:
    shutil.copy2(BASE/'public/models/sar21-inspired.glb', BASE.parent/'public/models/field-kit/sar21-inspired.glb')
    for manifest in [BASE/'public/models/manifest.json', BASE.parent/'public/models/field-kit/manifest.json']:
        if manifest.exists():
            entries=json.loads(manifest.read_text())
            if isinstance(entries, list):
                entries=[catalog[0] if entry['id']=='sar21-inspired' else entry for entry in entries]
                manifest.write_text(json.dumps(entries,indent=2))
    sys.exit(0)

begin('ultimax-inspired')
profile('Stock',[(-.50,.21),(-.49,.025),(-.40,.02),(-.32,.09),(-.22,.115),(-.22,.19)],.062,olive,bevel=.005)
box('Recoil pad',(-.506,0,.118),(.02,.07,.202),rubber,.005)
box('Receiver',(-.071,0,.178),(.325,.064,.098),steel,.004)
box('Top cover',(-.068,0,.234),(.33,.07,.019),steel)
profile('Grip',[(-.18,.138),(-.12,.124),(-.135,-.027),(-.178,-.04),(-.21,-.014)],.038,olive,bevel=.006)
for i in range(5):box('Grip ribs',(-.167,0,-.008+i*.019),(.05,.041,.004),rubber,.001)
rod('Guard lower',(-.156,0,.052),(-.073,0,.052),.004,steel); rod('Guard front',(-.073,0,.052),(-.053,0,.135),.004,steel)
rod('Trigger',(-.102,0,.133),(-.115,0,.082),.004,steel)
cyl('Barrel',(.30,0,.198),.012,.47,steel)
cyl('Front collar',(.157,0,.198),.025,.04,steel)
profile('Handguard',[(.095,.135),(.295,.135),(.31,.18),(.30,.223),(.099,.223)],.06,olive,bevel=.004)
for s in [-1,1]:
    for i in range(8):box('Cooling vent',(.117+i*.023,s*.0305,.20),(.014,.002,.016),rubber,.002)
    box('Receiver side plate',(-.04,s*.034,.185),(.21,.003,.054),edge)
    box('Ejection port',(.03,s*.036,.197),(.073,.002,.028),rubber)
cyl('Flash shroud',(.544,0,.198),.017,.06,steel)
cyl('Muzzle face',(.5745,0,.198),.009,.001,rubber)
for l in [.41,.44]:cyl('Barrel band',(l,0,.198),.018,.015,edge)
box('Front sight',(.422,0,.238),(.013,.016,.076),steel)
box('Rear sight',(-.192,0,.273),(.027,.036,.06),steel)
box('Rear aperture',(-.177,0,.287),(.001,.016,.013),rubber)
for l in [-.02,.16]:rod('Carry handle mount',(l,0,.24),(l,0,.30),.006,steel)
cyl('Carry handle',(.07,0,.309),.015,.18,olive)
cyl('Foregrip',(.205,0,.082),.022,.13,olive,'z')
for i in range(5):cyl('Foregrip ridges',(.205,0,.037+i*.021),.023,.004,rubber,'z')
for s in [-1,1]:
    rod('Folded bipod',(.421,s*.025,.175),(.20,s*.036,.108),.006,steel)
    box('Bipod foot',(.195,s*.036,.11),(.037,.018,.012),steel)
screws([(-.20,.19),(-.10,.18),(.08,.18)],.072)
PART='magazine'; cyl('Drum magazine',(-.005,0,.012),.095,.095,steel)
for l in [-.055,.045]:
    cyl('Drum rim',(l,0,.012),.099,.008,edge)
    cyl('Drum inset',(l*1.09,0,.012),.075,.002,rubber)
    cyl('Drum hub',(l*1.12,0,.012),.026,.005,steel)
box('Drum attachment',(-.005,0,.11),(.055,.033,.047),steel)
PART='body'; socket('socket_muzzle',(.576,0,.198)); socket('socket_grip',(-.16,0,.02)); socket('socket_support',(.205,0,.07)); socket('socket_sight',(-.21,0,.28)); socket('socket_eject',(.03,.039,.197))
ult=end('ultimax-inspired','Ultimax / Support','Weapon','Ultimax-inspired support weapon with drum magazine, carry handle and folded bipod.')

begin('supply-crate')
box('Case',(0,0,.225),(.48,.72,.41),olive,.018); box('Lid',(0,0,.455),(.50,.74,.07),olive2,.012)
for w in [-.31,.31]:
    for l in [-.20,.20]:box('Corner bumper',(l,w,.25),(.065,.06,.44),rubber,.008)
for w in [-.22,.22]:
    box('Lid reinforcement',(0,w,.497),(.44,.035,.025),olive,.006)
    for l in [-.251,.251]:box('Latch',(l,w,.386),(.018,.045,.068),edge)
for w in [-.373,.373]:
    for l in [-.08,.08]:box('Handle mount',(l,w,.29),(.032,.018,.045),steel)
    rod('Handle',(-.08,w,.275),(.08,w,.275),.009,rubber)
box('Inventory plate',(-.245,0,.255),(.003,.18,.075),rubber,.001)
for i in range(9):box('Inventory marking',(-.247,-.069+i*.017,.255),(.001,.006,.038 if i%3 else .05),white,.0001)
crate=end('supply-crate','Equipment case','Prop','Stackable olive transit case with reinforced corners, latches and inventory plate.')

begin('jersey-barrier')
# Cross section along depth, extrusion along width.
profile('Cast concrete',[(-.29,0),(.29,0),(.29,.13),(.12,.47),(.10,.85),(-.10,.85),(-.12,.47),(-.29,.13)],1.8,concrete,bevel=.012)
for w in [-.70,.70]:
    box('Reflector housing',(-.107,w,.72),(.018,.13,.095),rubber)
    box('Reflector',(-.118,w,.72),(.003,.105,.064),orange)
    cyl('Lift recess',(0,w,.852),.031,.003,rubber,'z')
for w in [-.56,0,.56]:box('Warning panel',(-.118,w,.52),(.016,.27,.16),white,.002)
bar=end('jersey-barrier','Concrete barrier','Prop','Road-scale concrete cover with inset lift points and reflective orange markers.')

begin('sandbag-wall')
for row in range(3):
    for i in range(4 if row%2==0 else 3):
        w=(i-(3 if row%2==0 else 2)/2)*.46
        o=box('Filled canvas bag',(random.uniform(-.018,.018),w,.11+row*.183),(.36,.48,.215),sand if (row+i)%2 else sand2,.075)
        o.rotation_euler[2]=random.uniform(-.05,.05)
        # Raised, understated sewn edge.
        box('Bag seam',(-.17,w,.11+row*.183),(.008,.35,.008),sand2,.003)
bags=end('sandbag-wall','Sandbag cover','Prop','Three staggered courses of rounded canvas sandbags; a single placeable cover module.')

begin('range-target')
for w in [-.23,.23]:
    box('Steel upright',(0,w,.70),(.032,.032,1.4),steel)
    box('Foot',(0,w,.024),(.58,.065,.048),steel,.004)
box('Target board',(0,0,1.29),(.035,.62,.82),paper,.005)
for radius,m in [(.245,white),(.195,rubber),(.148,white),(.10,rubber),(.052,red)]:
    cyl('Target ring',(-.019-(.245-radius)*.022,0,1.30),radius,.001,m,'l',64)
for w in [-.285,.285]:
    for h in [.91,1.67]:cyl('Board bolt',(-.02,w,h),.008,.004,edge,'l',12)
target=end('range-target','Range target','Prop','Freestanding circular scoring target with steel feet and replaceable board.')

begin('traffic-cone')
box('Weighted base',(0,0,.033),(.37,.37,.066),rubber,.02)
# Each frustum shares exact radius at its boundary.
for a,b,m in [(0,.18,orange),(.18,.30,white),(.30,.43,orange),(.43,.50,white),(.50,.57,orange)]:
    r=lambda z:.14-(.112*z/.57)
    bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r(a),radius2=r(b),depth=b-a,location=v((0,0,.065+(a+b)/2)))
    finish(bpy.context.object,'Cone band',m)
cyl('Top inset',(0,0,.636),.019,.002,rubber,'z')
cone=end('traffic-cone','Traffic cone','Prop','Weighted road cone with two reflective bands for Singapore street dressing.')

(BASE/'public/models/manifest.json').write_text(json.dumps(catalog,indent=2))

# Save clean, editable asset library with named collections and no baked transforms.
for root in [sar,ult,crate,bar,bags,target,cone]:
    c=bpy.data.collections.new(root.name); bpy.context.scene.collection.children.link(c)
    for o in [root]+list(root.children):
        for old in list(o.users_collection):old.objects.unlink(o)
        c.objects.link(o)
    root.hide_render=True
    for o in root.children:o.hide_render=True
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.render.engine='CYCLES'; bpy.context.scene.cycles.samples=32
bpy.context.scene.world.color=(.16,.16,.16)
bpy.context.scene.view_settings.view_transform='AgX'
# Spread editable sources across the Blender workspace for immediate inspection.
for i,root in enumerate([sar,ult,crate,bar,bags,target,cone]):root.location.x=i*2.2
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=3
            area.spaces.active.region_3d.view_location=(0,0,.1)
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'blender/sg-field-kit.blend'))
for root in [sar,ult,crate,bar,bags,target,cone]:root.location.x=0

# Individual studio renders, also used by the Three.js asset browser.
studio=bpy.data.collections.new('Studio'); bpy.context.scene.collection.children.link(studio)
ROOT=None; PART='studio'; objects=[]
floor=box('Studio floor',(0,0,-.03),(200,200,.05),mat('Studio slate',(.045,.06,.067)),0)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size in [((3,-4,5),650,4),((-3,1,3),500,3),((0,4,4),700,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,(0,0,.3))
bpy.ops.object.camera_add(); cam=bpy.context.object; bpy.context.scene.camera=cam; cam.data.type='ORTHO'
bpy.context.scene.render.resolution_x=1400; bpy.context.scene.render.resolution_y=1000; bpy.context.scene.render.resolution_percentage=100
for asset,root in zip(catalog,[sar,ult,crate,bar,bags,target,cone]):
    root.hide_render=False
    for o in root.children:o.hide_render=False
    if asset['category']=='Weapon':
        floor.hide_render=True; cam.location=(1.15,.8,.64); center=(0,0,.13); cam.data.ortho_scale=1.18 if root==sar else 1.5
    else:
        floor.hide_render=False; center=(0,0,asset['dimensions'][1]/2); cam.location=(2.6,-3.4,2.3); cam.data.ortho_scale=max(asset['dimensions'])*1.65
    aim(cam,center); bpy.context.scene.render.filepath=str(BASE/'renders'/f"{asset['id']}.png"); bpy.ops.render.render(write_still=True)
    root.hide_render=True
    for o in root.children:o.hide_render=True
print('ASSET PACK COMPLETE',json.dumps(catalog))
