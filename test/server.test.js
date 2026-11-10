'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');
const http = require('node:http');

test('serves the game and health endpoint', async t => {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  const game = await fetch(base);
  assert.equal(game.status, 200);
  assert.match(await game.text(), /STREET SOCCER 3D/);
});
