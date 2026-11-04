import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer as createTcpServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

const root = path.resolve(new URL('..', import.meta.url).pathname);
async function freePort() {
  const server = createTcpServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('Rôles et approbations : seules les validations manager appliquent les changements', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'biosynx-test-'));
  const port = await freePort();
  const managerEmail = 'manager@example.test';
  const managerPassword = 'Manager-BioSynX-Test-2026!';
  const memberEmail = 'membre@example.test';
  const memberPassword = 'Membre-BioSynX-Test-2026!';
  const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', BIOSYNX_MANAGER_EMAIL: managerEmail, BIOSYNX_MANAGER_NAME: 'Manager BioSynX', BIOSYNX_MANAGER_PASSWORD: managerPassword, BIOSYNX_DB_PATH: path.join(temp, 'test.sqlite'), SIMULATE_TELEMETRY: 'false' }, stdio: 'ignore' });
  t.after(async () => { child.kill('SIGTERM'); await new Promise(resolve => setTimeout(resolve, 200)); await rm(temp, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch(`${base}/api/session`); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'server starts');
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const [appScript, appStyles] = await Promise.all([fetch(`${base}/assets/app.js`), fetch(`${base}/assets/app.css`)]);
  assert.equal(appScript.status, 200, 'React bundle is available before login');
  assert.match(appScript.headers.get('content-type'), /^text\/javascript/);
  assert.equal(appStyles.status, 200, 'React styles are available before login');
  assert.match(appStyles.headers.get('content-type'), /^text\/css/);
  assert.equal((await fetch(`${base}/api/dashboard`)).status, 401);

  async function login(email, password) {
    const response = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email, password }) });
    const body = await response.json();
    assert.equal(response.status, 200, body.error);
    return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: body.csrf, user: body.user };
  }
  const manager = await login(managerEmail, managerPassword);
  assert.equal(manager.user.role, 'manager');
  const managerHeaders = { 'Content-Type': 'application/json', Origin: base, Cookie: manager.cookie, 'X-CSRF-Token': manager.csrf };
  const dashboard = await fetch(`${base}/api/dashboard`, { headers: managerHeaders });
  assert.equal(dashboard.status, 200);
  assert.equal((await dashboard.json()).simulated, true);
  const managerLot = await fetch(`${base}/api/lots`, { method: 'POST', headers: managerHeaders, body: JSON.stringify({ material: 'Résidus de riz', massKg: 3, moisturePct: 11 }) });
  assert.equal(managerLot.status, 201, 'manager can apply a change directly');

  const createMember = await fetch(`${base}/api/team`, { method: 'POST', headers: managerHeaders, body: JSON.stringify({ name: 'Membre Test', email: memberEmail, password: memberPassword }) });
  assert.equal(createMember.status, 201);
  assert.equal((await createMember.json()).item.role, 'member');
  const member = await login(memberEmail, memberPassword);
  assert.equal(member.user.role, 'member');
  const memberHeaders = { 'Content-Type': 'application/json', Origin: base, Cookie: member.cookie, 'X-CSRF-Token': member.csrf };
  assert.equal((await fetch(`${base}/api/team`, { headers: memberHeaders })).status, 403, 'member cannot read/manage team accounts');

  const lotsBefore = await fetch(`${base}/api/lots`, { headers: memberHeaders }).then(r => r.json());
  const createLot = await fetch(`${base}/api/lots`, { method: 'POST', headers: memberHeaders, body: JSON.stringify({ material: 'Bouse fraîche', massKg: 8.5, moisturePct: 78 }) });
  assert.equal(createLot.status, 202);
  const createLotRequest = await createLot.json();
  assert.equal(createLotRequest.pending, true);
  const lotsPending = await fetch(`${base}/api/lots`, { headers: memberHeaders }).then(r => r.json());
  assert.equal(lotsPending.items.length, lotsBefore.items.length, 'unapproved lot is not applied');
  const pendingAsMember = await fetch(`${base}/api/requests`, { headers: memberHeaders }).then(r => r.json());
  const lotRequest = pendingAsMember.items.find(r => r.id === createLotRequest.requestId);
  assert.equal(lotRequest.status, 'pending');
  const memberApprove = await fetch(`${base}/api/requests/${lotRequest.id}/review`, { method: 'POST', headers: memberHeaders, body: JSON.stringify({ decision: 'approved' }) });
  assert.equal(memberApprove.status, 403, 'member cannot approve requests');
  const managerReview = await fetch(`${base}/api/requests/${lotRequest.id}/review`, { method: 'POST', headers: managerHeaders, body: JSON.stringify({ decision: 'approved' }) });
  assert.equal(managerReview.status, 200);
  const lotsAfterApproval = await fetch(`${base}/api/lots`, { headers: managerHeaders }).then(r => r.json());
  assert.equal(lotsAfterApproval.items.length, lotsBefore.items.length + 1, 'approved lot is applied');

  const recipeBefore = await fetch(`${base}/api/recipe`, { headers: memberHeaders }).then(r => r.json());
  const proposeRecipe = await fetch(`${base}/api/recipe`, { method: 'PUT', headers: memberHeaders, body: JSON.stringify({ testManurePct: 45, testCharcoalPct: 55 }) });
  assert.equal(proposeRecipe.status, 202);
  assert.equal((await fetch(`${base}/api/recipe`, { headers: memberHeaders }).then(r => r.json())).testManurePct, recipeBefore.testManurePct, 'recipe unchanged before approval');
  const memberRequests = await fetch(`${base}/api/requests`, { headers: memberHeaders }).then(r => r.json());
  const recipeRequest = memberRequests.items.find(r => r.type === 'recipe_update' && r.status === 'pending');
  assert.ok(recipeRequest);
  const approvedRecipe = await fetch(`${base}/api/requests/${recipeRequest.id}/review`, { method: 'POST', headers: managerHeaders, body: JSON.stringify({ decision: 'approved', note: 'Essai accepté' }) });
  assert.equal(approvedRecipe.status, 200);
  const recipeAfter = await fetch(`${base}/api/recipe`, { headers: managerHeaders }).then(r => r.json());
  assert.equal(recipeAfter.testManurePct, 45);
  assert.equal(recipeAfter.testCharcoalPct, 55);

  const archive = await fetch(`${base}/api/lots/2/archive`, { method: 'POST', headers: memberHeaders, body: '{}' });
  assert.equal(archive.status, 202, 'member archival is only a request');
  const archiveRequest = (await fetch(`${base}/api/requests`, { headers: managerHeaders }).then(r => r.json())).items.find(r => r.type === 'lot_archive' && r.status === 'pending');
  assert.ok(archiveRequest);
  const approveArchive = await fetch(`${base}/api/requests/${archiveRequest.id}/review`, { method: 'POST', headers: managerHeaders, body: JSON.stringify({ decision: 'approved' }) });
  assert.equal(approveArchive.status, 200);
  assert.equal((await fetch(`${base}/api/lots/2`, { headers: managerHeaders })).status, 404, 'approved archival is applied');

  const noCsrf = await fetch(`${base}/api/recipe`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: member.cookie }, body: JSON.stringify({ testManurePct: 40, testCharcoalPct: 60 }) });
  assert.equal(noCsrf.status, 403);
  const logout = await fetch(`${base}/api/logout`, { method: 'POST', headers: managerHeaders, body: '{}' });
  assert.equal(logout.status, 200);
  assert.equal((await fetch(`${base}/api/dashboard`, { headers: { Cookie: manager.cookie } })).status, 401);
});
