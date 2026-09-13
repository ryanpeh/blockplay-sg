import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLanServer } from './lan-server.mjs';

let server, base, directory;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'blockplay-lan-test-'));
  await writeFile(join(directory, 'index.html'), '<h1>LAN test</h1>');
  server = createLanServer({ distDir: directory });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); await rm(directory, { recursive: true }); });
const request = async (path, body, auth, extraHeaders) => {
  const response = await fetch(base + '/api/lan' + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { 'x-lan-id': auth.id, 'x-lan-token': auth.token } : {}), ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
};

test('host-star signaling, authenticated cursors and guest departure', async () => {
  const { data: host } = await request('/rooms', { name: ' Host\u0000 ' });
  assert.match(host.code, /^[A-F0-9]{6}$/);
  assert.equal(host.peers[0].name, 'Host');
  const path = `/rooms/${host.code}`;
  const { data: guest } = await request(path + '/join', { name: 'Guest' });
  const joined = await request(path + '/poll', undefined, host);
  assert.equal(joined.data.events[0].type, 'joined');
  assert.equal(joined.data.events[0].id, guest.id);
  assert.equal((await request(path + '/poll', undefined, { ...host, token: 'wrong' })).status, 403);
  assert.equal((await request(path + '/signal', { to: guest.id, description: { type: 'offer', sdp: 'local-offer' } }, host)).status, 200);
  const offered = await request(path + '/poll', undefined, guest);
  assert.equal(offered.data.events[0].description.sdp, 'local-offer');
  assert.deepEqual((await request(path + `/poll?after=${offered.data.events[0].sequence}`, undefined, guest)).data.events, []);
  assert.equal((await request(path + '/signal', { to: host.id, description: { type: 'offer', sdp: 'invalid-direction' } }, guest)).status, 400);
  assert.equal((await request(path + '/signal', { to: host.id, description: { type: 'answer', sdp: 'local-answer' } }, guest)).status, 200);
  assert.equal((await request(path + '/leave', {}, guest)).status, 200);
  const last = (await request(path + '/poll', undefined, host)).data.events.at(-1);
  assert.equal(last.type, 'left');
  assert.equal(last.id, guest.id);
  await request(path + '/leave', {}, host);
  assert.equal((await request(path + '/join', { name: 'Late' })).status, 404);
});

test('four-player cap, guest isolation, foreign origins and size bounds', async () => {
  const { data: host } = await request('/rooms', { name: 'Host' });
  const path = `/rooms/${host.code}`;
  const { data: guest } = await request(path + '/join', { name: 'Guest' });
  const { data: other } = await request(path + '/join', { name: 'Other' });
  await request(path + '/join', { name: 'Last' });
  assert.equal((await request(path + '/join', { name: 'Overflow' })).status, 409);
  assert.equal((await request(path + '/signal', { to: other.id, description: { type: 'answer', sdp: 'no-guest-relay' } }, guest)).status, 400);
  assert.equal((await request('/rooms', { name: 'Blocked' }, undefined, { Origin: 'https://foreign.example' })).status, 403);
  assert.equal((await request(path + '/signal', { to: guest.id, description: { type: 'offer', sdp: 'x'.repeat(33_000) } }, host)).status, 400);
  assert.equal((await request(path + '/signal', { to: guest.id, description: { type: 'offer', sdp: 'x'.repeat(50_000) } }, host)).status, 413);
  await request(path + '/leave', {}, host);
});

test('serves built app and reports a recognizable health endpoint', async () => {
  assert.equal((await request('/health')).data.service, 'blockplay-lan');
  assert.match(await (await fetch(base + '/')).text(), /LAN test/);
  assert.equal((await fetch(base + '/missing.glb')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 403);
});
