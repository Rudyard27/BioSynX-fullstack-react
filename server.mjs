import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.BIOSYNX_DB_PATH || path.join(ROOT, 'data', 'biosynx.sqlite');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const MANAGER_EMAIL = (process.env.BIOSYNX_MANAGER_EMAIL || 'manager@biosynx.local').trim().toLowerCase();
const MANAGER_NAME = (process.env.BIOSYNX_MANAGER_NAME || 'Manager').trim().slice(0, 80) || 'Manager';
const MANAGER_PASSWORD = process.env.BIOSYNX_MANAGER_PASSWORD || process.env.BIOSYNX_ADMIN_PASSWORD || '';
const SESSION_MS = 4 * 60 * 60 * 1000;
const SIMULATE = process.env.SIMULATE_TELEMETRY !== 'false';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const MATERIALS = ['Bouse fraîche', 'Bouse pré-séchée', 'Résidus de riz', 'Poudre de charbon', 'Briquettes'];
const STATUSES = ['À préparer', 'En cours', 'Terminé'];
const sessions = new Map();
const loginAttempts = new Map();
const DUMMY_SALT = Buffer.from('BioSynX-login-dummy-salt-v1', 'utf8');

const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
if (!validEmail(MANAGER_EMAIL) || MANAGER_PASSWORD.length < 12 || MANAGER_PASSWORD.startsWith('remplacer-par-')) {
  console.error('Configuration manquante : définis BIOSYNX_MANAGER_EMAIL et un BIOSYNX_MANAGER_PASSWORD unique (12 caractères minimum). BIOSYNX_ADMIN_PASSWORD reste accepté pour la migration.');
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('manager','member')),
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    material TEXT NOT NULL,
    mass_kg REAL NOT NULL CHECK (mass_kg > 0),
    moisture_pct REAL CHECK (moisture_pct IS NULL OR (moisture_pct >= 0 AND moisture_pct <= 100)),
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER,
    moisture_pct REAL NOT NULL,
    temperature_c REAL NOT NULL,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY(lot_id) REFERENCES lots(id)
  );
  CREATE INDEX IF NOT EXISTS idx_measurements_recorded ON measurements(recorded_at DESC);
  CREATE TABLE IF NOT EXISTS recipe (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    manure_min INTEGER NOT NULL,
    manure_max INTEGER NOT NULL,
    charcoal_min INTEGER NOT NULL,
    charcoal_max INTEGER NOT NULL,
    test_manure_pct INTEGER NOT NULL,
    test_charcoal_pct INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('lot_create','lot_update','lot_archive','recipe_update')),
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reviewer_id INTEGER REFERENCES users(id),
    review_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    reviewed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_requests_status_created ON requests(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_requests_requester_created ON requests(requester_id, created_at DESC);
`);

const nowIso = () => new Date().toISOString();
const managerSalt = randomBytes(16);
const managerHash = scryptSync(MANAGER_PASSWORD, managerSalt, 64).toString('hex');
const existingManager = db.prepare('SELECT id FROM users WHERE email=?').get(MANAGER_EMAIL);
if (existingManager) {
  db.prepare("UPDATE users SET name=?,role='manager',salt=?,password_hash=?,active=1 WHERE id=?")
    .run(MANAGER_NAME, managerSalt.toString('hex'), managerHash, Number(existingManager.id));
} else {
  db.prepare("INSERT INTO users(email,name,role,salt,password_hash,active,created_at) VALUES(?,?,'manager',?,?,1,?)")
    .run(MANAGER_EMAIL, MANAGER_NAME, managerSalt.toString('hex'), managerHash, nowIso());
}

const seed = db.prepare('SELECT COUNT(*) AS n FROM lots').get();
if (Number(seed.n) === 0) {
  const insertLot = db.prepare('INSERT INTO lots(code,material,mass_kg,moisture_pct,stage,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
  const now = nowIso();
  const activeId = Number(insertLot.run('BSX-024', 'Bouse pré-séchée', 12.5, 31, 'Séchage solaire', 'En cours', now, now).lastInsertRowid);
  insertLot.run('BSX-023', 'Résidus de riz', 18, 12, 'Prêt pour pyrolyse', 'À préparer', now, now);
  const insertMeasurement = db.prepare('INSERT INTO measurements(lot_id,moisture_pct,temperature_c,recorded_at) VALUES(?,?,?,?)');
  for (let i = 0; i < 24; i++) {
    const hoursAgo = 23 - i;
    const moisture = 62 - (31 * i / 23) + Math.sin(i * .7) * .7;
    const temperature = 39.5 + Math.sin(i * .45) * 3.4;
    insertMeasurement.run(activeId, Math.round(moisture * 10) / 10, Math.round(temperature * 10) / 10, new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString());
  }
  db.prepare('INSERT INTO recipe(id,manure_min,manure_max,charcoal_min,charcoal_max,test_manure_pct,test_charcoal_pct,updated_at) VALUES(1,30,50,50,70,40,60,?)').run(now);
  db.prepare('INSERT INTO events(kind,message,created_at) VALUES(?,?,?)').run('system', 'Base BioSynX initialisée en mode télémétrie simulée.', now);
}

const countEvents = db.prepare('INSERT INTO events(kind,message,created_at) VALUES(?,?,?)');
const asUser = row => row ? ({ id: Number(row.id), email: row.email, name: row.name, role: row.role, active: Boolean(row.active) }) : null;
const asLot = row => row ? ({ id: Number(row.id), code: row.code, material: row.material, massKg: Number(row.mass_kg), moisturePct: row.moisture_pct == null ? null : Number(row.moisture_pct), stage: row.stage, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }) : null;
const asRequest = row => row ? ({ id: Number(row.id), type: row.type, payload: JSON.parse(row.payload_json), status: row.status, reviewNote: row.review_note, createdAt: row.created_at, reviewedAt: row.reviewed_at, requester: { id: Number(row.requester_id), name: row.requester_name, email: row.requester_email }, reviewer: row.reviewer_id ? { id: Number(row.reviewer_id), name: row.reviewer_name } : null }) : null;
const activeLotQuery = db.prepare("SELECT * FROM lots WHERE archived=0 AND status='En cours' ORDER BY updated_at DESC LIMIT 1");

if (SIMULATE) {
  const tick = db.prepare('INSERT INTO measurements(lot_id,moisture_pct,temperature_c,recorded_at) VALUES(?,?,?,?)');
  const updateLot = db.prepare('UPDATE lots SET moisture_pct=?, updated_at=? WHERE id=?');
  setInterval(() => {
    try {
      const lot = activeLotQuery.get();
      if (!lot) return;
      const currentMoisture = Number(lot.moisture_pct ?? 31);
      const nextMoisture = Math.max(18, Math.round((currentMoisture - 0.03 + (Math.random() - .5) * .05) * 10) / 10);
      const nextTemp = Math.round((42 + Math.sin(Date.now() / 13000) * 2 + (Math.random() - .5) * .4) * 10) / 10;
      const at = nowIso();
      updateLot.run(nextMoisture, at, Number(lot.id));
      tick.run(Number(lot.id), nextMoisture, nextTemp, at);
      db.prepare('DELETE FROM measurements WHERE id NOT IN (SELECT id FROM measurements ORDER BY recorded_at DESC LIMIT 5000)').run();
    } catch (err) { console.error('Erreur simulateur:', err.message); }
  }, 15000).unref();
}

function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}
function sessionCookie(token, maxAge) {
  return `biosynx_session=${token || ''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`;
}
function currentSession(req) {
  const value = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('biosynx_session='))?.slice('biosynx_session='.length);
  const session = value && sessions.get(value);
  if (!session || session.expiresAt < Date.now()) { if (value) sessions.delete(value); return null; }
  const userRow = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(session.userId);
  if (!userRow) { sessions.delete(value); return null; }
  session.expiresAt = Date.now() + SESSION_MS;
  return { token: value, csrf: session.csrf, expiresAt: session.expiresAt, user: asUser(userRow) };
}
function originIsSame(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto === 'https' || COOKIE_SECURE ? 'https' : 'http';
  return origin === `${proto}://${req.headers.host}`;
}
async function readJson(req, maxBytes = 16000) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) throw Object.assign(new Error('Corps de requête trop volumineux.'), { status: 413 });
  }
  if (!body) return {};
  try { return JSON.parse(body); } catch { throw Object.assign(new Error('JSON invalide.'), { status: 400 }); }
}
function auth(req, res, write = false) {
  const session = currentSession(req);
  if (!session) { send(res, 401, { error: 'Authentification requise.' }); return null; }
  if (write && (!originIsSame(req) || req.headers['x-csrf-token'] !== session.csrf)) { send(res, 403, { error: 'Vérification CSRF refusée.' }); return null; }
  return session;
}
function requireManager(session, res) {
  if (session.user.role !== 'manager') { send(res, 403, { error: 'Action réservée au manager.' }); return false; }
  return true;
}
function rateLimited(ip) {
  const now = Date.now(), recent = (loginAttempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  loginAttempts.set(ip, recent);
  return recent.length >= 5;
}
function noteAttempt(ip) {
  const attempts = loginAttempts.get(ip) || [];
  attempts.push(Date.now());
  loginAttempts.set(ip, attempts);
}
function stageFor(material) {
  return ({ 'Bouse fraîche': 'Égouttage / pré-séchage', 'Bouse pré-séchée': 'Séchage solaire', 'Résidus de riz': 'Préparation avant pyrolyse', 'Poudre de charbon': 'Formulation', 'Briquettes': 'Séchage des briquettes' })[material];
}
function validateLotCreate(body) {
  if (!MATERIALS.includes(body.material)) throw Object.assign(new Error('Intrant non reconnu.'), { status: 400 });
  if (!Number.isFinite(body.massKg) || body.massKg < 0.1 || body.massKg > 10000) throw Object.assign(new Error('La masse doit être comprise entre 0,1 et 10 000 kg.'), { status: 400 });
  if (body.moisturePct !== null && body.moisturePct !== undefined && (!Number.isFinite(body.moisturePct) || body.moisturePct < 0 || body.moisturePct > 100)) throw Object.assign(new Error('Humidité hors plage (0–100 %).'), { status: 400 });
  return { material: body.material, massKg: body.massKg, moisturePct: body.moisturePct ?? null };
}
function validateRecipe(body) {
  const m = body.testManurePct, c = body.testCharcoalPct;
  if (!Number.isInteger(m) || m < 30 || m > 50 || !Number.isInteger(c) || c < 50 || c > 70 || m + c !== 100) throw Object.assign(new Error('Ratio invalide : bouse 30–50 %, charbon 50–70 %, total égal à 100 %.'), { status: 400 });
  return { testManurePct: m, testCharcoalPct: c };
}
function createLot(payload, actor) {
  const latest = db.prepare("SELECT MAX(CAST(substr(code,5) AS INTEGER)) AS n FROM lots WHERE code LIKE 'BSX-%'").get();
  const code = `BSX-${String(Number(latest?.n || 0) + 1).padStart(3, '0')}`;
  const now = nowIso();
  const result = db.prepare("INSERT INTO lots(code,material,mass_kg,moisture_pct,stage,status,created_at,updated_at) VALUES(?,?,?,?,?,'À préparer',?,?)")
    .run(code, payload.material, payload.massKg, payload.moisturePct, stageFor(payload.material), now, now);
  countEvents.run('lot', `${actor.name} (${actor.email}) a créé le lot ${code} (${payload.material}).`, now);
  return asLot(db.prepare('SELECT * FROM lots WHERE id=?').get(Number(result.lastInsertRowid)));
}
function makeRequest(session, type, payload) {
  const now = nowIso();
  const result = db.prepare('INSERT INTO requests(requester_id,type,payload_json,status,created_at) VALUES(?,?,?,\'pending\',?)')
    .run(session.user.id, type, JSON.stringify(payload), now);
  countEvents.run('request', `${session.user.name} a soumis une demande ${type} (#${Number(result.lastInsertRowid)}).`, now);
  return Number(result.lastInsertRowid);
}
function applyRequest(row, actor) {
  const payload = JSON.parse(row.payload_json);
  if (row.type === 'lot_create') return createLot(validateLotCreate(payload), actor);
  if (row.type === 'lot_update') {
    const lot = db.prepare('SELECT * FROM lots WHERE id=? AND archived=0').get(Number(payload.lotId));
    if (!lot) throw Object.assign(new Error('Le lot ciblé n’existe plus ou est archivé.'), { status: 409 });
    if (payload.status !== undefined && !STATUSES.includes(payload.status)) throw Object.assign(new Error('Statut de lot invalide.'), { status: 409 });
    if (payload.moisturePct !== undefined && payload.moisturePct !== null && (!Number.isFinite(payload.moisturePct) || payload.moisturePct < 0 || payload.moisturePct > 100)) throw Object.assign(new Error('Humidité invalide.'), { status: 409 });
    if (Object.hasOwn(payload, 'moisturePct') && payload.moisturePct === null) {
      db.prepare('UPDATE lots SET status=?,moisture_pct=NULL,updated_at=? WHERE id=?').run(payload.status ?? lot.status, nowIso(), Number(lot.id));
    } else {
      db.prepare('UPDATE lots SET status=?,moisture_pct=?,updated_at=? WHERE id=?').run(payload.status ?? lot.status, payload.moisturePct ?? lot.moisture_pct, nowIso(), Number(lot.id));
    }
    countEvents.run('lot', `${actor.name} (${actor.email}) a approuvé une modification du lot ${lot.code}.`, nowIso());
    return null;
  }
  if (row.type === 'lot_archive') {
    const lot = db.prepare('SELECT * FROM lots WHERE id=? AND archived=0').get(Number(payload.lotId));
    if (!lot) throw Object.assign(new Error('Le lot ciblé n’existe plus ou est déjà archivé.'), { status: 409 });
    db.prepare("UPDATE lots SET archived=1,status='Archivé',updated_at=? WHERE id=?").run(nowIso(), Number(lot.id));
    countEvents.run('lot', `${actor.name} (${actor.email}) a archivé le lot ${lot.code}.`, nowIso());
    return null;
  }
  if (row.type === 'recipe_update') {
    const recipe = validateRecipe(payload);
    db.prepare('UPDATE recipe SET test_manure_pct=?,test_charcoal_pct=?,updated_at=? WHERE id=1').run(recipe.testManurePct, recipe.testCharcoalPct, nowIso());
    countEvents.run('recipe', `${actor.name} (${actor.email}) a défini le ratio : ${recipe.testManurePct} % bouse / ${recipe.testCharcoalPct} % charbon.`, nowIso());
    return null;
  }
  throw Object.assign(new Error('Type de demande inconnu.'), { status: 400 });
}
function fetchRequests(user) {
  const rows = user.role === 'manager'
    ? db.prepare(`SELECT r.*,u.name AS requester_name,u.email AS requester_email,rv.name AS reviewer_name FROM requests r JOIN users u ON u.id=r.requester_id LEFT JOIN users rv ON rv.id=r.reviewer_id ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 100`).all()
    : db.prepare(`SELECT r.*,u.name AS requester_name,u.email AS requester_email,rv.name AS reviewer_name FROM requests r JOIN users u ON u.id=r.requester_id LEFT JOIN users rv ON rv.id=r.reviewer_id WHERE r.requester_id=? ORDER BY r.created_at DESC LIMIT 100`).all(user.id);
  return rows.map(asRequest);
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try {
    if (req.method === 'GET' && p === '/') {
      const fs = await import('node:fs/promises');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(await fs.readFile(path.join(ROOT, 'public', 'index.html')));
    }
    if (req.method === 'GET' && p.startsWith('/assets/')) {
      const fs = await import('node:fs/promises');
      const publicDir = path.resolve(ROOT, 'public');
      const filePath = path.resolve(publicDir, p.slice(1));
      if (!filePath.startsWith(publicDir + path.sep)) return send(res, 403, { error: 'Accès refusé.' });
      try {
        const file = await fs.readFile(filePath);
        const type = ({ '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' })[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600' });
        return res.end(file);
      } catch { return send(res, 404, { error: 'Fichier introuvable.' }); }
    }
    if (req.method === 'GET' && p === '/api/session') {
      const session = currentSession(req);
      return send(res, 200, { authenticated: !!session, csrf: session?.csrf || null, user: session?.user || null });
    }
    if (req.method === 'POST' && p === '/api/login') {
      if (!originIsSame(req)) return send(res, 403, { error: 'Origine refusée.' });
      const ip = req.socket.remoteAddress || 'local';
      if (rateLimited(ip)) return send(res, 429, { error: 'Trop de tentatives. Réessaie dans 15 minutes.' });
      const body = await readJson(req);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const userRow = validEmail(email) ? db.prepare('SELECT * FROM users WHERE email=?').get(email) : null;
      const salt = userRow ? Buffer.from(userRow.salt, 'hex') : DUMMY_SALT;
      const candidateHash = await scrypt(password.slice(0, 512) || '\0', salt, 64);
      const valid = Boolean(userRow && userRow.active && password.length <= 512 && timingSafeEqual(candidateHash, Buffer.from(userRow.password_hash, 'hex')));
      if (!valid) { noteAttempt(ip); return send(res, 401, { error: 'Adresse e-mail ou mot de passe incorrect.' }); }
      loginAttempts.delete(ip);
      const token = randomBytes(32).toString('base64url');
      const csrf = randomBytes(24).toString('base64url');
      sessions.set(token, { csrf, userId: Number(userRow.id), expiresAt: Date.now() + SESSION_MS });
      return send(res, 200, { authenticated: true, csrf, user: asUser(userRow) }, { 'Set-Cookie': sessionCookie(token, Math.floor(SESSION_MS / 1000)) });
    }
    const write = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '');
    const session = auth(req, res, write);
    if (!session) return;

    if (req.method === 'POST' && p === '/api/logout') {
      sessions.delete(session.token);
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (req.method === 'GET' && p === '/api/dashboard') {
      const latest = db.prepare('SELECT * FROM measurements ORDER BY recorded_at DESC LIMIT 1').get();
      const activeRow = activeLotQuery.get();
      const activeLot = asLot(activeRow);
      const flux = Number(db.prepare('SELECT COUNT(DISTINCT material) AS n FROM lots WHERE archived=0').get().n);
      const moisture = Number(latest?.moisture_pct ?? activeRow?.moisture_pct ?? 0);
      const progressPct = Math.max(0, Math.min(100, Math.round((62 - moisture) / (62 - 18) * 100)));
      return send(res, 200, { activeLot, moisturePct: moisture, temperatureC: Number(latest?.temperature_c ?? 0), progressPct, fluxCount: flux, source: 'simulated', simulated: true, updatedAt: latest?.recorded_at ?? nowIso() });
    }
    if (req.method === 'GET' && p === '/api/measurements') {
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 24)));
      const rows = db.prepare('SELECT m.id,m.moisture_pct,m.temperature_c,m.recorded_at,l.code AS lot_code FROM measurements m LEFT JOIN lots l ON l.id=m.lot_id ORDER BY m.recorded_at DESC LIMIT ?').all(limit);
      return send(res, 200, { items: rows.map(r => ({ id: Number(r.id), moisturePct: Number(r.moisture_pct), temperatureC: Number(r.temperature_c), recordedAt: r.recorded_at, lotCode: r.lot_code })) });
    }
    if (req.method === 'GET' && p === '/api/lots') {
      const rows = db.prepare('SELECT * FROM lots WHERE archived=0 ORDER BY created_at DESC LIMIT 200').all();
      return send(res, 200, { items: rows.map(asLot) });
    }
    const lotMatch = p.match(/^\/api\/lots\/(\d+)(\/archive)?$/);
    if (lotMatch && req.method === 'GET' && !lotMatch[2]) {
      const row = db.prepare('SELECT * FROM lots WHERE id=? AND archived=0').get(Number(lotMatch[1]));
      return row ? send(res, 200, { item: asLot(row) }) : send(res, 404, { error: 'Lot introuvable.' });
    }
    if (lotMatch && req.method === 'PATCH' && !lotMatch[2]) {
      const id = Number(lotMatch[1]);
      const lot = db.prepare('SELECT * FROM lots WHERE id=? AND archived=0').get(id);
      if (!lot) return send(res, 404, { error: 'Lot introuvable.' });
      const body = await readJson(req);
      const payload = { lotId: id };
      if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return send(res, 400, { error: 'Statut non autorisé.' });
        payload.status = body.status;
      }
      if (body.moisturePct !== undefined) {
        if (body.moisturePct !== null && (!Number.isFinite(body.moisturePct) || body.moisturePct < 0 || body.moisturePct > 100)) return send(res, 400, { error: 'Humidité hors plage (0–100 %).' });
        payload.moisturePct = body.moisturePct;
      }
      if (Object.keys(payload).length === 1) return send(res, 400, { error: 'Aucun changement à enregistrer.' });
      if (session.user.role !== 'manager') {
        const requestId = makeRequest(session, 'lot_update', payload);
        return send(res, 202, { pending: true, requestId, message: 'Demande envoyée au manager pour validation.' });
      }
      const status = payload.status ?? lot.status;
      const moisture = Object.hasOwn(payload, 'moisturePct') ? payload.moisturePct : lot.moisture_pct;
      db.prepare('UPDATE lots SET status=?,moisture_pct=?,updated_at=? WHERE id=?').run(status, moisture, nowIso(), id);
      countEvents.run('lot', `${session.user.name} (${session.user.email}) a modifié le lot ${lot.code}.`, nowIso());
      return send(res, 200, { item: asLot(db.prepare('SELECT * FROM lots WHERE id=?').get(id)) });
    }
    if (lotMatch && req.method === 'POST' && lotMatch[2]) {
      const lot = db.prepare('SELECT * FROM lots WHERE id=? AND archived=0').get(Number(lotMatch[1]));
      if (!lot) return send(res, 404, { error: 'Lot introuvable.' });
      if (session.user.role !== 'manager') {
        const requestId = makeRequest(session, 'lot_archive', { lotId: Number(lot.id) });
        return send(res, 202, { pending: true, requestId, message: 'Demande d’archivage envoyée au manager.' });
      }
      db.prepare("UPDATE lots SET archived=1,status='Archivé',updated_at=? WHERE id=?").run(nowIso(), Number(lot.id));
      countEvents.run('lot', `${session.user.name} (${session.user.email}) a archivé le lot ${lot.code}.`, nowIso());
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && p === '/api/lots') {
      const payload = validateLotCreate(await readJson(req));
      if (session.user.role !== 'manager') {
        const requestId = makeRequest(session, 'lot_create', payload);
        return send(res, 202, { pending: true, requestId, message: 'Demande de création envoyée au manager.' });
      }
      return send(res, 201, { item: createLot(payload, session.user) });
    }
    if (req.method === 'GET' && p === '/api/recipe') {
      const row = db.prepare('SELECT * FROM recipe WHERE id=1').get();
      return send(res, 200, { manureMin: row.manure_min, manureMax: row.manure_max, charcoalMin: row.charcoal_min, charcoalMax: row.charcoal_max, testManurePct: row.test_manure_pct, testCharcoalPct: row.test_charcoal_pct, updatedAt: row.updated_at });
    }
    if (req.method === 'PUT' && p === '/api/recipe') {
      const recipe = validateRecipe(await readJson(req));
      if (session.user.role !== 'manager') {
        const requestId = makeRequest(session, 'recipe_update', recipe);
        return send(res, 202, { pending: true, requestId, message: 'Proposition de formulation envoyée au manager.' });
      }
      db.prepare('UPDATE recipe SET test_manure_pct=?,test_charcoal_pct=?,updated_at=? WHERE id=1').run(recipe.testManurePct, recipe.testCharcoalPct, nowIso());
      countEvents.run('recipe', `${session.user.name} (${session.user.email}) a défini le ratio : ${recipe.testManurePct} % bouse / ${recipe.testCharcoalPct} % charbon.`, nowIso());
      return send(res, 200, { ok: true, testManurePct: recipe.testManurePct, testCharcoalPct: recipe.testCharcoalPct });
    }
    if (req.method === 'GET' && p === '/api/requests') return send(res, 200, { items: fetchRequests(session.user) });
    const reviewMatch = p.match(/^\/api\/requests\/(\d+)\/review$/);
    if (reviewMatch && req.method === 'POST') {
      if (!requireManager(session, res)) return;
      const body = await readJson(req);
      if (!['approved', 'rejected'].includes(body.decision)) return send(res, 400, { error: 'Décision invalide.' });
      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
      db.exec('BEGIN IMMEDIATE');
      try {
        const requestRow = db.prepare('SELECT * FROM requests WHERE id=?').get(Number(reviewMatch[1]));
        if (!requestRow) throw Object.assign(new Error('Demande introuvable.'), { status: 404 });
        if (requestRow.status !== 'pending') throw Object.assign(new Error('Cette demande a déjà été traitée.'), { status: 409 });
        if (body.decision === 'approved') applyRequest(requestRow, session.user);
        const at = nowIso();
        db.prepare('UPDATE requests SET status=?,reviewer_id=?,review_note=?,reviewed_at=? WHERE id=? AND status=\'pending\'')
          .run(body.decision, session.user.id, note, at, Number(requestRow.id));
        countEvents.run('review', `${session.user.name} a ${body.decision === 'approved' ? 'approuvé' : 'refusé'} la demande #${Number(requestRow.id)}${note ? ` : ${note}` : ''}.`, at);
        db.exec('COMMIT');
        return send(res, 200, { ok: true, status: body.decision });
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }
    if (req.method === 'GET' && p === '/api/team') {
      if (!requireManager(session, res)) return;
      const rows = db.prepare('SELECT id,email,name,role,active,created_at FROM users ORDER BY CASE role WHEN \'manager\' THEN 0 ELSE 1 END,name COLLATE NOCASE').all();
      return send(res, 200, { items: rows.map(u => ({ id: Number(u.id), email: u.email, name: u.name, role: u.role, active: Boolean(u.active), createdAt: u.created_at })) });
    }
    if (req.method === 'POST' && p === '/api/team') {
      if (!requireManager(session, res)) return;
      const body = await readJson(req);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!validEmail(email)) return send(res, 400, { error: 'Adresse e-mail invalide.' });
      if (name.length < 2 || name.length > 80) return send(res, 400, { error: 'Le nom doit contenir entre 2 et 80 caractères.' });
      if (password.length < 12 || password.length > 512) return send(res, 400, { error: 'Le mot de passe provisoire doit contenir au moins 12 caractères.' });
      if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return send(res, 409, { error: 'Un compte existe déjà avec cette adresse.' });
      const salt = randomBytes(16);
      const hash = await scrypt(password, salt, 64);
      const result = db.prepare("INSERT INTO users(email,name,role,salt,password_hash,active,created_at) VALUES(?,?,'member',?,?,1,?)")
        .run(email, name, salt.toString('hex'), hash.toString('hex'), nowIso());
      countEvents.run('team', `${session.user.name} a créé le compte membre ${email}.`, nowIso());
      const user = asUser(db.prepare('SELECT * FROM users WHERE id=?').get(Number(result.lastInsertRowid)));
      return send(res, 201, { item: user });
    }
    const teamMatch = p.match(/^\/api\/team\/(\d+)$/);
    if (teamMatch && req.method === 'PATCH') {
      if (!requireManager(session, res)) return;
      const id = Number(teamMatch[1]);
      const member = db.prepare('SELECT * FROM users WHERE id=?').get(id);
      if (!member || member.role !== 'member') return send(res, 404, { error: 'Compte membre introuvable.' });
      const body = await readJson(req);
      if (body.active !== undefined && typeof body.active !== 'boolean') return send(res, 400, { error: 'État de compte invalide.' });
      const password = body.password;
      if (password !== undefined && (typeof password !== 'string' || password.length < 12 || password.length > 512)) return send(res, 400, { error: 'Le nouveau mot de passe doit contenir au moins 12 caractères.' });
      if (body.active === undefined && password === undefined) return send(res, 400, { error: 'Aucun changement à enregistrer.' });
      if (password !== undefined) {
        const salt = randomBytes(16);
        const hash = await scrypt(password, salt, 64);
        db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt.toString('hex'), hash.toString('hex'), id);
      }
      if (body.active !== undefined) db.prepare('UPDATE users SET active=? WHERE id=?').run(body.active ? 1 : 0, id);
      if (body.active === false || password !== undefined) for (const [token, item] of sessions) if (item.userId === id) sessions.delete(token);
      countEvents.run('team', `${session.user.name} a mis à jour le compte membre ${member.email}.`, nowIso());
      return send(res, 200, { item: asUser(db.prepare('SELECT * FROM users WHERE id=?').get(id)) });
    }
    if (req.method === 'GET' && p === '/api/events') {
      const rows = db.prepare('SELECT id,kind,message,created_at FROM events ORDER BY created_at DESC LIMIT 50').all();
      return send(res, 200, { items: rows.map(r => ({ id: Number(r.id), kind: r.kind, message: r.message, createdAt: r.created_at })) });
    }
    if (req.method === 'GET' && p === '/favicon.ico') { res.writeHead(204); return res.end(); }
    return send(res, 404, { error: 'Route introuvable.' });
  } catch (err) {
    console.error('Erreur requête:', err.message);
    return send(res, err.status || 500, { error: err.status ? err.message : 'Erreur interne du serveur.' });
  }
});

server.listen(PORT, HOST, () => console.log(`BioSynX disponible sur http://${HOST}:${PORT} · base ${DB_PATH} · télémétrie ${SIMULATE ? 'simulée' : 'désactivée'}`));
setInterval(() => { for (const [token, session] of sessions) if (session.expiresAt < Date.now()) sessions.delete(token); }, 60_000).unref();
process.on('SIGINT', () => { server.close(() => { db.close(); process.exit(0); }); });
process.on('SIGTERM', () => { server.close(() => { db.close(); process.exit(0); }); });
