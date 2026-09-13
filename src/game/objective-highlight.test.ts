import { expect, it, vi } from 'vitest';
import { Group, Mesh, MeshBasicMaterial, Scene, TorusGeometry } from 'three';
import { createObjectiveHighlight } from './objective-highlight';

it('moves the beacon between stamps and restores original shared materials', () => {
  const scene = new Scene(), material = new MeshBasicMaterial({ color: 'orange' }), geometry = new TorusGeometry();
  const a = new Group(), b = new Group();
  a.add(new Mesh(geometry, material)); b.add(new Mesh(geometry, material)); a.position.set(45, 3, 65); b.position.set(103, 3, -77);
  const highlight = createObjectiveHighlight(scene);
  highlight.select(a); highlight.update(0);
  expect(highlight.group.visible).toBe(true); expect(highlight.group.position.toArray()).toEqual([45, 0, 65]);
  expect((a.children[0] as Mesh).material).not.toBe(material); expect((b.children[0] as Mesh).material).toBe(material);
  highlight.select(b); highlight.update(1);
  expect((a.children[0] as Mesh).material).toBe(material); expect(highlight.group.position.toArray()).toEqual([103, 0, -77]);
  expect(a.position.toArray()).toEqual([45, 3, 65]); expect(b.position.toArray()).toEqual([103, 3, -77]);
  highlight.dispose(); expect((b.children[0] as Mesh).material).toBe(material); expect(scene.children).not.toContain(highlight.group);
  geometry.dispose(); material.dispose();
});
it('hides completed/absent objectives and disposes decorative resources', () => {
  const highlight = createObjectiveHighlight(new Scene()), stamp = new Group();
  const mesh = highlight.group.children[0] as Mesh, dispose = vi.spyOn(mesh.geometry, 'dispose');
  highlight.select(stamp); highlight.update(0); stamp.visible = false; highlight.update(1); expect(highlight.group.visible).toBe(false);
  highlight.select(); highlight.update(2); expect(highlight.group.visible).toBe(false);
  highlight.dispose(); expect(dispose).toHaveBeenCalledOnce();
});
