import * as THREE from 'three';
import { expect, it } from 'vitest';
import { visiblePilotContacts } from './fps-pilot-perception';

it('only exposes on-screen, unobstructed contacts, with no world coordinates or stats', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(65, 1, .08, 200);
  const geometry = new THREE.BoxGeometry(1, 2, 1), material = new THREE.MeshBasicMaterial();
  const target = new THREE.Mesh(geometry, material); target.position.set(0, 0, -12); scene.add(target);
  const subject = { id: 'visible', root: target, points: [new THREE.Vector3(0, 0, -12)], radius: .3 };
  const observe = () => visiblePilotContacts(camera, scene, [subject]);
  expect(observe()).toHaveLength(1);
  expect(Object.keys(observe()[0]).sort()).toEqual(['angularRadius', 'id', 'pitchError', 'yawError']);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 4, .5), material); wall.position.z = -6; scene.add(wall);
  expect(observe()).toEqual([]);
  wall.visible = false; expect(observe()).toHaveLength(1);
  camera.rotation.y = Math.PI; expect(observe()).toEqual([]);
  camera.rotation.y = 0;
  expect(visiblePilotContacts(camera, scene, [subject], () => true)).toEqual([]);
  target.visible = false; expect(observe()).toEqual([]);
  geometry.dispose(); wall.geometry.dispose(); material.dispose();
});

it('reports the signed mouse-look correction without exposing off-screen targets', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(65, 1, .08, 200);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  mesh.position.set(2, 1, -10); scene.add(mesh);
  const subject = { id: 'right-above', root: mesh, points: [mesh.position.clone()], radius: .3 };
  const [contact] = visiblePilotContacts(camera, scene, [subject]);
  expect(contact.yawError).toBeLessThan(0); expect(contact.pitchError).toBeGreaterThan(0);
  subject.points[0].x = 50; mesh.position.x = 50;
  expect(visiblePilotContacts(camera, scene, [subject])).toEqual([]);
  mesh.geometry.dispose(); mesh.material.dispose();
});
