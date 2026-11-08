// Team Management Dashboard — standalone, self-hostable version.
// Node.js + Express + SQLite (node:sqlite, no native addons), vanilla frontend.
// Single-user demo auth: the client sends `actorId` ("Acting as" switcher).
// All approval / material-cycle rules are enforced here on the server,
// never only in the UI.
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'app.db');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, department TEXT NOT NULL,
  role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS columns (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'normal',
  sortOrder INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '',
  customer TEXT DEFAULT '', location TEXT DEFAULT '', serviceId TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal', dueDate TEXT, department TEXT DEFAULT '',
  taskKind TEXT NOT NULL DEFAULT 'ticket', assigneeId INTEGER, createdById INTEGER,
  columnId INTEGER NOT NULL, completedAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS task_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT, taskId INTEGER NOT NULL, name TEXT NOT NULL,
  qty REAL NOT NULL, unit TEXT NOT NULL DEFAULT 'pcs', serial TEXT DEFAULT '',
  direction TEXT NOT NULL DEFAULT 'out', createdById INTEGER, createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT, taskId INTEGER NOT NULL, name TEXT NOT NULL,
  mimeType TEXT DEFAULT '', size INTEGER DEFAULT 0, category TEXT NOT NULL DEFAULT 'file',
  caption TEXT DEFAULT '', storedPath TEXT NOT NULL, createdById INTEGER, createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, personId INTEGER NOT NULL, date TEXT NOT NULL,
  shiftName TEXT NOT NULL, startTime TEXT DEFAULT '', endTime TEXT DEFAULT '',
  department TEXT DEFAULT '', notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS material_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'open',
  issuedById INTEGER, submittedById INTEGER, submittedAt TEXT,
  checkedById INTEGER, checkedAt TEXT, checkNote TEXT DEFAULT '', checkDecision TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS daily_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT, dayId INTEGER NOT NULL, name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs', issuedQty REAL NOT NULL, usedQty REAL, returnedQty REAL,
  serial TEXT DEFAULT '', taskId INTEGER, createdById INTEGER, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT, actorId INTEGER, taskId INTEGER,
  text TEXT NOT NULL, createdAt TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_person_date ON shifts(personId, date);
`);

const nowIso = () => new Date().toISOString();
const dayStr = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };

function logActivity(actorId, taskId, text) {
  db.prepare('INSERT INTO activity (actorId, taskId, text, createdAt) VALUES (?,?,?,?)')
    .run(actorId ?? null, taskId ?? null, text, nowIso());
}
function getPerson(id) {
  return id == null ? null : db.prepare('SELECT * FROM people WHERE id=?').get(id);
}
function actorFrom(req) {
  const id = req.body?.actorId ?? req.query?.actorId;
  const p = getPerson(id == null ? null : Number(id));
  return p && p.active ? p : null;
}
function requireActor(req, res) {
  const a = actorFrom(req);
  if (!a) { res.status(401).json({ error: 'Unknown or inactive user. Pick a person in the "Acting as" switcher.' }); return null; }
  return a;
}
// Warehouse Manager sees Materials only — enforced server-side, not just
// by hiding navigation in the UI. WM may only use the material endpoints
// (issue morning material, view material days, check/approve a report).
const WM_ONLY_ERROR = 'Warehouse Manager only has access to Materials.';
const isWarehouseManager = (actor) => actor?.role === 'warehouse_manager';
// Approval rule (server-enforced): Head NOC approves anything; OSP approves
// only tasks they dropped themselves; everyone else cannot approve to Done.
function canApprove(actor, task) {
  if (!actor) return false;
  if (actor.role === 'head_noc') return true;
  if (actor.role === 'osp' && task.createdById === actor.id) return true;
  return false;
}
function approvalHint(actor, task) {
  if (actor?.role === 'osp' && task.createdById !== actor.id)
    return 'OSP can only approve tasks they dropped themselves — this one was dropped by ' +
      (getPerson(task.createdById)?.name || 'someone else') + '.';
  return 'Only Head NOC can approve anything; OSP only their own dropped tasks.';
}

// ---- Seed (mock demo data, dates relative to first run so Yesterday/Today stay meaningful) ----
function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) c FROM people').get().c;
  if (count > 0) return;
  const today = new Date();
  const y = addDays(today, -1), t2 = addDays(today, 1), t3 = addDays(today, 2), t4 = addDays(today, 3);
  const D = { y: dayStr(y), t: dayStr(today), t2: dayStr(t2), t3: dayStr(t3), t4: dayStr(t4) };

  const people = [
    [1, 'Rivaldo', 'Head NOC', 'head_noc'],
    [2, 'Bima Prasetyo', 'NOC', 'noc'],
    [3, 'Sari Wulandari', 'NOC', 'noc'],
    [9, 'Fajar Nugroho', 'OSP', 'osp'],
    [10, 'Dewi Anggraini', 'Customer Service', 'cs'],
    [8, 'Putri Ayu', 'Warehouse', 'warehouse_manager'],
    [5, 'Agus Salim', 'Field', 'field_tech'],
    [4, 'Dedi Kurniawan', 'Field', 'field_tech'],
    [7, 'Joko Santoso', 'Field', 'field_tech'],
    [6, 'Rina Marlina', 'Field', 'field_tech'],
  ];
  const insP = db.prepare('INSERT INTO people (id,name,department,role,active) VALUES (?,?,?,?,1)');
  for (const p of people) insP.run(...p);

  const cols = [['Backlog', 'normal', 0], ['To Do', 'normal', 1], ['In Progress', 'normal', 2],
    ['Waiting', 'normal', 3], ['Pending Approval', 'review', 4], ['Done', 'done', 5]];
  const insC = db.prepare('INSERT INTO columns (name,kind,sortOrder) VALUES (?,?,?)');
  for (const c of cols) insC.run(...c);
  const colId = (name) => db.prepare('SELECT id FROM columns WHERE name=?').get(name).id;

  const insT = db.prepare(`INSERT INTO tasks (title,description,customer,location,serviceId,priority,
    dueDate,department,taskKind,assigneeId,createdById,columnId,completedAt,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const T = (o) => insT.run(o.title, o.description || '', o.customer || '', o.location || '',
    o.serviceId || '', o.priority || 'normal', o.dueDate || null, o.department || '',
    o.taskKind || 'ticket', o.assigneeId ?? null, o.createdById ?? null, o.columnId,
    o.completedAt || null, nowIso(), nowIso());
  T({ title: 'Install baru FTTH — Ibu Ratna', description: 'Tarik drop cable dari ODP terdekat, aktivasi PPPoE, test speed di lokasi.',
    customer: 'Ratna Wijaya', location: 'Binong, Subang', serviceId: 'SWN-2026-1187', dueDate: D.y,
    department: 'Field', assigneeId: 5, createdById: 2, columnId: colId('Done'), completedAt: D.y + 'T15:40:00.000Z' });
  T({ title: 'Perbaikan LOS — Bapak Dedi, Jatiroke', description: 'Redaman tinggi di ODP, cek splicing dan ganti pigtail bila perlu.',
    customer: 'Dedi Supriadi', location: 'Jatiroke, Sumedang', serviceId: 'SWN-2026-0931', priority: 'high',
    dueDate: D.y, department: 'Field', assigneeId: 6, createdById: 4, columnId: colId('Done'), completedAt: D.y + 'T13:05:00.000Z' });
  T({ title: 'Ganti ONT rusak — Bapak Haji Oman', description: 'ONT lama mati total (power adapter terbakar). Bawa ONT pengganti dan adapter baru.',
    customer: 'H. Oman Suryana', location: 'Cisalak, Subang', serviceId: 'SWN-2026-0744',
    dueDate: D.t, department: 'Field', assigneeId: 7, createdById: 4, columnId: colId('To Do') });
  T({ title: 'Project: Pasang ODP baru — Cibogo', description: 'OSP project: pasang ODP 1:16 baru, tarik distribusi 300 m, splice dan label port. Dropped by OSP — OSP can approve this one themselves, NOC cannot.',
    location: 'Cibogo', priority: 'high', dueDate: D.t2, department: 'OSP', taskKind: 'project',
    assigneeId: 5, createdById: 9, columnId: colId('Pending Approval') });
  T({ title: 'Migrasi pelanggan ke VLAN baru — Cluster Cipunagara', description: 'Pindahkan 12 pelanggan dari VLAN 210 ke VLAN 312, update PPPoE profile di router agregasi.',
    location: 'Cipunagara, Subang', dueDate: D.t, department: 'NOC', taskKind: 'maintenance',
    assigneeId: 3, createdById: 3, columnId: colId('Pending Approval') });
  T({ title: 'Cek redaman OLT port 3 — POP Binong', description: 'Rx power beberapa ONT di port ini di bawah -27 dBm. Cek splitter dan patch cord di ODF.',
    location: 'POP Binong', priority: 'high', dueDate: D.t, department: 'NOC', taskKind: 'maintenance',
    assigneeId: 3, createdById: 2, columnId: colId('In Progress') });
  T({ title: 'Handover shift malam — pantau OLT Binong', description: 'NOC handover for the oncoming night shift: pantau OLT Binong, follow up alarm bila ada.',
    dueDate: D.t2, department: 'NOC', taskKind: 'handover', assigneeId: 2, createdById: 2, columnId: colId('To Do') });
  T({ title: 'Install baru — Warnet Berkah Net', description: 'Pelanggan usaha, minta bandwidth 50 Mbps dedicated. Survey lokasi dulu untuk jalur kabel.',
    customer: 'Berkah Net (Pak Yudi)', location: 'Subang Kota', serviceId: 'SWN-2026-1201', priority: 'urgent',
    dueDate: D.t2, department: 'Field', taskKind: 'project', assigneeId: 6, createdById: 9, columnId: colId('To Do') });
  T({ title: 'Tarik kabel backbone — Jl. Raya Pagaden', description: 'Menunggu izin penanaman tiang dari desa. Follow up Kamis.',
    location: 'Pagaden, Subang', dueDate: D.t4, department: 'Field', taskKind: 'project',
    assigneeId: 5, createdById: 9, columnId: colId('Waiting') });
  T({ title: 'Audit uplink POP — cek utilisasi LAG', description: 'Upload traffic menumpuk di satu interface LAG. Cek hash distribution di CRS dan router.',
    location: 'POP Binong', priority: 'high', dueDate: D.t3, department: 'NOC', taskKind: 'maintenance',
    assigneeId: 2, createdById: 1, columnId: colId('Backlog') });

  // Per-task ad-hoc materials on the two completed jobs.
  const insM = db.prepare(`INSERT INTO task_materials (taskId,name,qty,unit,serial,direction,createdById,createdAt) VALUES (?,?,?,?,?,?,?,?)`);
  const tid = (title) => db.prepare('SELECT id FROM tasks WHERE title=?').get(title).id;
  insM.run(tid('Install baru FTTH — Ibu Ratna'), 'ONT ZTE F660', 1, 'pcs', 'ZTEGC8A41F02', 'out', 5, nowIso());
  insM.run(tid('Install baru FTTH — Ibu Ratna'), 'Drop cable', 60, 'm', '', 'out', 5, nowIso());
  insM.run(tid('Install baru FTTH — Ibu Ratna'), 'Konektor SC/APC', 2, 'pcs', '', 'out', 5, nowIso());
  insM.run(tid('Perbaikan LOS — Bapak Dedi, Jatiroke'), 'Pigtail SC/APC', 1, 'pcs', '', 'out', 6, nowIso());
  insM.run(tid('Perbaikan LOS — Bapak Dedi, Jatiroke'), 'Sleeve protector', 2, 'pcs', '', 'out', 6, nowIso());
  insM.run(tid('Ganti ONT rusak — Bapak Haji Oman'), 'ONT Huawei HG8245H', 1, 'pcs', '', 'out', 7, nowIso());

  const insS = db.prepare('INSERT INTO shifts (personId,date,shiftName,startTime,endTime,department,notes) VALUES (?,?,?,?,?,?,?)');
  insS.run(5, D.y, 'Pagi', '07:00', '15:00', 'Field', '');
  insS.run(6, D.y, 'Pagi', '07:00', '15:00', 'Field', '');
  insS.run(3, D.y, 'Malam', '20:00', '08:00', 'NOC', '');
  insS.run(2, D.t, 'Pagi', '07:00', '15:00', 'NOC', '');
  insS.run(3, D.t, 'Pagi', '07:00', '15:00', 'NOC', '');
  insS.run(1, D.t, 'Malam', '20:00', '08:00', 'Head NOC', '');
  insS.run(4, D.t, 'Pagi', '07:00', '15:00', 'Field', '');
  insS.run(5, D.t, 'Siang', '13:00', '21:00', 'Field', '');
  insS.run(6, D.t, 'Siang', '13:00', '21:00', 'Field', '');
  insS.run(7, D.t2, 'Pagi', '07:00', '15:00', 'Field', '');
  insS.run(3, D.t2, 'Malam', '20:00', '08:00', 'NOC', '');
  insS.run(2, D.t2, 'Pagi', '07:00', '15:00', 'NOC', '');

  // Material days: yesterday submitted (awaiting WM check), today open.
  const insD = db.prepare(`INSERT INTO material_days (date,status,issuedById,submittedById,submittedAt) VALUES (?,?,?,?,?)`);
  insD.run(D.y, 'submitted', 8, 10, nowIso());
  insD.run(D.t, 'open', 8, null, null);
  const dayId = (d) => db.prepare('SELECT id FROM material_days WHERE date=?').get(d).id;
  const insL = db.prepare(`INSERT INTO daily_lines (dayId,name,unit,issuedQty,usedQty,returnedQty,createdById,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const [n, u, iq, uq, rq] of [
    ['ONT ZTE F660', 'pcs', 2, 1, 1], ['Drop cable', 'm', 100, 60, 40],
    ['Konektor SC/APC', 'pcs', 10, 2, 8], ['Pigtail SC/APC', 'pcs', 2, 1, 1]]) {
    insL.run(dayId(D.y), n, u, iq, uq, rq, 8, nowIso(), nowIso());
  }
  for (const [n, u, iq] of [
    ['ONT Huawei HG8245H', 'pcs', 1], ['Drop cable', 'm', 50],
    ['Splitter 1:8', 'pcs', 1], ['Konektor SC/APC', 'pcs', 10]]) {
    insL.run(dayId(D.t), n, u, iq, null, null, 8, nowIso(), nowIso());
  }
  logActivity(10, null, `submitted daily material report for ${D.y} — awaiting Warehouse check`);
  logActivity(8, null, `issued morning material for ${D.y} (demo cycle)`);
  logActivity(3, 5, 'moved “Migrasi pelanggan ke VLAN baru — Cluster Cipunagara” to Pending Approval');
  logActivity(6, 2, 'completed “Perbaikan LOS — Bapak Dedi, Jatiroke”');
  logActivity(5, 1, 'completed “Install baru FTTH — Ibu Ratna”');
}
seedIfEmpty();

// ---- API ----
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function fullState(actor = null) {
  const people = db.prepare('SELECT * FROM people ORDER BY department, name').all();
  const materialDays = db.prepare('SELECT * FROM material_days ORDER BY date DESC').all().map((d) => ({
    ...d,
    lines: db.prepare('SELECT * FROM daily_lines WHERE dayId=? ORDER BY id').all(d.id),
  }));
  const materialNames = db.prepare(
    `SELECT DISTINCT name FROM (SELECT name FROM daily_lines UNION SELECT name FROM task_materials) ORDER BY name`).all().map((r) => r.name);
  // A Warehouse Manager never receives task/board/calendar/team/activity
  // data — only the people names the Materials view needs for attribution
  // (issued by / submitted by / checked by) plus the material data itself.
  if (isWarehouseManager(actor)) {
    return { people, columns: [], tasks: [], shifts: [], materialDays, activity: [], materialNames };
  }
  const columns = db.prepare('SELECT * FROM columns ORDER BY sortOrder').all();
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY id').all().map((t) => ({
    ...t,
    materials: db.prepare('SELECT * FROM task_materials WHERE taskId=? ORDER BY id').all(t.id),
    files: db.prepare('SELECT id,taskId,name,mimeType,size,category,caption,createdById,createdAt FROM files WHERE taskId=? ORDER BY id').all(t.id),
  }));
  const shifts = db.prepare('SELECT * FROM shifts ORDER BY date, startTime').all();
  const activity = db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT 100').all();
  return { people, columns, tasks, shifts, materialDays, activity, materialNames };
}
// WM gate: any /api request from a Warehouse Manager that is not one of the
// material endpoints below is rejected here, before any route handler runs.
// Allowed for WM: GET /api/state (restricted payload, see fullState),
// GET /api/health, GET /api/material-days, POST issue, POST check.
// CS-only log/submit stay 403 for WM via their own role checks as well.
const WM_ALLOWED = [
  ['GET', /^\/api\/state$/],
  ['GET', /^\/api\/health$/],
  ['GET', /^\/api\/material-days$/],
  ['POST', /^\/api\/material-days\/[^/]+\/issue$/],
  ['POST', /^\/api\/material-days\/\d+\/check$/],
];
app.use('/api', (req, res, next) => {
  const a = actorFrom(req);
  // req.path is mount-relative inside app.use('/api'), so match on the full URL path.
  const fullPath = req.originalUrl.split('?')[0];
  if (isWarehouseManager(a) && !WM_ALLOWED.some(([m, re]) => req.method === m && re.test(fullPath))) {
    return res.status(403).json({ error: WM_ONLY_ERROR });
  }
  next();
});
app.get('/api/state', (req, res) => res.json(fullState(actorFrom(req))));
app.get('/api/health', (req, res) => res.json({ ok: true, today: dayStr(new Date()) }));

// --- Tasks ---
app.post('/api/tasks', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const b = req.body;
  if (!b.title) return res.status(400).json({ error: 'Title is required.' });
  const firstCol = db.prepare('SELECT id FROM columns ORDER BY sortOrder LIMIT 1').get();
  const colId = b.columnId || firstCol.id;
  const r = db.prepare(`INSERT INTO tasks (title,description,customer,location,serviceId,priority,dueDate,
    department,taskKind,assigneeId,createdById,columnId,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    b.title, b.description || '', b.customer || '', b.location || '', b.serviceId || '',
    b.priority || 'normal', b.dueDate || null, b.department || '', b.taskKind || 'ticket',
    b.assigneeId ?? null, actor.id, colId, nowIso(), nowIso());
  logActivity(actor.id, r.lastInsertRowid, `created “${b.title}”`);
  res.status(201).json(fullState());
});
app.patch('/api/tasks/:id', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  const b = req.body;
  const fields = ['title', 'description', 'customer', 'location', 'serviceId', 'priority', 'dueDate', 'department', 'taskKind', 'assigneeId'];
  const sets = [], vals = [];
  for (const f of fields) if (b[f] !== undefined) { sets.push(`${f}=?`); vals.push(b[f]); }
  if (sets.length) db.prepare(`UPDATE tasks SET ${sets.join(', ')}, updatedAt=? WHERE id=?`).run(...vals, nowIso(), t.id);
  res.json(fullState());
});
app.delete('/api/tasks/:id', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  if (actor.role !== 'head_noc' && t.createdById !== actor.id)
    return res.status(403).json({ error: 'Only Head NOC or the task creator can delete a task.' });
  db.prepare('DELETE FROM files WHERE taskId=?').run(t.id);
  db.prepare('DELETE FROM task_materials WHERE taskId=?').run(t.id);
  db.prepare('DELETE FROM tasks WHERE id=?').run(t.id);
  logActivity(actor.id, null, `deleted “${t.title}”`);
  res.json(fullState());
});

// Move / approve / reject — approval enforced here, not in the UI.
app.post('/api/tasks/:id/move', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  const col = db.prepare('SELECT * FROM columns WHERE id=?').get(req.body.columnId);
  if (!col) return res.status(400).json({ error: 'Column not found.' });
  if (col.kind === 'done' && !canApprove(actor, t))
    return res.status(403).json({ error: `Cannot approve “${t.title}” to Done. ${approvalHint(actor, t)}` });
  db.prepare('UPDATE tasks SET columnId=?, completedAt=?, updatedAt=? WHERE id=?')
    .run(col.id, col.kind === 'done' ? nowIso() : null, nowIso(), t.id);
  logActivity(actor.id, t.id,
    col.kind === 'done' ? `approved “${t.title}” to Done`
    : col.kind === 'review' ? `sent “${t.title}” for approval`
    : `moved “${t.title}” to ${col.name}`);
  res.json(fullState());
});
app.post('/api/tasks/:id/reject', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  if (!canApprove(actor, t))
    return res.status(403).json({ error: `Cannot reject “${t.title}”. ${approvalHint(actor, t)}` });
  const back = db.prepare("SELECT id FROM columns WHERE kind='normal' AND name='In Progress'").get()
    || db.prepare('SELECT id FROM columns ORDER BY sortOrder LIMIT 1').get();
  db.prepare('UPDATE tasks SET columnId=?, completedAt=NULL, updatedAt=? WHERE id=?').run(back.id, nowIso(), t.id);
  logActivity(actor.id, t.id, `rejected “${t.title}” back to In Progress${req.body.reason ? `: ${req.body.reason}` : ''}`);
  res.json(fullState());
});

// --- Columns ---
app.post('/api/columns', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (!req.body.name) return res.status(400).json({ error: 'Column name is required.' });
  const max = db.prepare('SELECT MAX(sortOrder) m FROM columns').get().m ?? -1;
  db.prepare('INSERT INTO columns (name,kind,sortOrder) VALUES (?,?,?)')
    .run(req.body.name, req.body.kind || 'normal', max + 1);
  res.status(201).json(fullState());
});
app.patch('/api/columns/:id', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (req.body.name) db.prepare('UPDATE columns SET name=? WHERE id=?').run(req.body.name, req.params.id);
  if (req.body.kind) db.prepare('UPDATE columns SET kind=? WHERE id=?').run(req.body.kind, req.params.id);
  res.json(fullState());
});
app.delete('/api/columns/:id', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const cols = db.prepare('SELECT * FROM columns ORDER BY sortOrder').all();
  if (cols.length <= 1) return res.status(400).json({ error: 'Cannot delete the last column.' });
  const first = cols.find((c) => String(c.id) !== req.params.id);
  db.prepare('UPDATE tasks SET columnId=? WHERE columnId=?').run(first.id, req.params.id);
  db.prepare('DELETE FROM columns WHERE id=?').run(req.params.id);
  res.json(fullState());
});

// --- People ---
app.post('/api/people', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (actor.role !== 'head_noc') return res.status(403).json({ error: 'Only Head NOC can add people.' });
  const b = req.body;
  if (!b.name || !b.role) return res.status(400).json({ error: 'Name and role are required.' });
  db.prepare('INSERT INTO people (name,department,role,active) VALUES (?,?,?,1)')
    .run(b.name, b.department || '', b.role);
  res.status(201).json(fullState());
});
app.patch('/api/people/:id', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (actor.role !== 'head_noc') return res.status(403).json({ error: 'Only Head NOC can edit people.' });
  const b = req.body;
  const sets = [], vals = [];
  for (const f of ['name', 'department', 'role', 'active']) if (b[f] !== undefined) { sets.push(`${f}=?`); vals.push(b[f]); }
  if (sets.length) db.prepare(`UPDATE people SET ${sets.join(', ')} WHERE id=?`).run(...vals, req.params.id);
  res.json(fullState());
});

// --- Shifts + CSV import ---
app.post('/api/shifts', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const b = req.body;
  if (!b.personId || !b.date || !b.shiftName) return res.status(400).json({ error: 'Person, date and shift are required.' });
  db.prepare(`INSERT INTO shifts (personId,date,shiftName,startTime,endTime,department,notes)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(personId,date) DO UPDATE SET
    shiftName=excluded.shiftName, startTime=excluded.startTime, endTime=excluded.endTime,
    department=excluded.department, notes=excluded.notes`)
    .run(b.personId, b.date, b.shiftName, b.startTime || '', b.endTime || '', b.department || '', b.notes || '');
  res.status(201).json(fullState());
});
app.delete('/api/shifts/:id', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  db.prepare('DELETE FROM shifts WHERE id=?').run(req.params.id);
  res.json(fullState());
});
app.post('/api/shifts/import', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const rows = req.body.rows;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array.' });
  let created = 0, replaced = 0, skipped = 0; const details = [];
  for (const r of rows) {
    const person = r.name ? db.prepare('SELECT * FROM people WHERE LOWER(name)=LOWER(?) AND active=1').get(String(r.name).trim()) : null;
    if (!person || !r.date || !r.shift) { skipped++; details.push({ row: r, status: 'skipped', reason: person ? 'missing date/shift' : `no such person: ${r.name || ''}` }); continue; }
    const existing = db.prepare('SELECT id FROM shifts WHERE personId=? AND date=?').get(person.id, r.date);
    db.prepare(`INSERT INTO shifts (personId,date,shiftName,startTime,endTime,department,notes)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT(personId,date) DO UPDATE SET
      shiftName=excluded.shiftName, startTime=excluded.startTime, endTime=excluded.endTime,
      department=excluded.department, notes=excluded.notes`)
      .run(person.id, r.date, r.shift, r.start || '', r.end || '', r.department || person.department, r.notes || '');
    if (existing) { replaced++; details.push({ row: r, status: 'replaced' }); }
    else { created++; details.push({ row: r, status: 'created' }); }
  }
  logActivity(actor.id, null, `imported shifts: ${created} created, ${replaced} replaced, ${skipped} skipped`);
  res.json({ created, replaced, skipped, details, state: fullState() });
});
app.get('/api/shifts/template.csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="shift-template.csv"');
  res.send('Date,Name,Shift,Start,End,Department,Notes\n2026-11-08,Bima Prasetyo,Pagi,07:00,15:00,NOC,\n2026-11-08,Rivaldo,Malam,20:00,08:00,Head NOC,\n');
});

// --- Materials: daily cycle ---
// Morning: Warehouse issues. Daytime: CS logs used/returned + submits.
// Next day: Warehouse checks vs issued data and approves or flags.
function getOrCreateDay(date, issuedById) {
  let d = db.prepare('SELECT * FROM material_days WHERE date=?').get(date);
  if (!d) {
    const r = db.prepare('INSERT INTO material_days (date,status,issuedById) VALUES (?,? ,?)')
      .run(date, 'open', issuedById ?? null);
    d = db.prepare('SELECT * FROM material_days WHERE id=?').get(r.lastInsertRowid);
  }
  return d;
}
app.get('/api/material-days', (req, res) => {
  res.json(fullState().materialDays);
});
app.post('/api/material-days/:date/issue', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (actor.role !== 'warehouse_manager')
    return res.status(403).json({ error: 'Only the Warehouse Manager can issue morning material.' });
  const lines = req.body.lines;
  if (!Array.isArray(lines) || !lines.length) return res.status(400).json({ error: 'lines must be a non-empty array of {name, qty, unit}.' });
  const day = getOrCreateDay(req.params.date, actor.id);
  if (day.status !== 'open') return res.status(400).json({ error: `Material day ${day.date} is ${day.status} and cannot be changed.` });
  const ins = db.prepare(`INSERT INTO daily_lines (dayId,name,unit,issuedQty,usedQty,returnedQty,createdById,createdAt,updatedAt) VALUES (?,?,?,?,NULL,NULL,?,?,?)`);
  for (const l of lines) {
    if (!l.name || !(Number(l.qty) > 0)) return res.status(400).json({ error: 'Each line needs a name and qty > 0.' });
    ins.run(day.id, l.name, l.unit || 'pcs', Number(l.qty), actor.id, nowIso(), nowIso());
  }
  db.prepare('UPDATE material_days SET issuedById=? WHERE id=?').run(actor.id, day.id);
  logActivity(actor.id, null, `issued morning material for ${day.date} (${lines.length} lines)`);
  res.json(fullState(actor));
});
app.post('/api/material-days/:id/log', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (actor.role !== 'cs')
    return res.status(403).json({ error: 'Only Customer Service logs material used for the day.' });
  const day = db.prepare('SELECT * FROM material_days WHERE id=?').get(req.params.id);
  if (!day) return res.status(404).json({ error: 'Material day not found.' });
  if (day.status !== 'open') return res.status(400).json({ error: `Material day ${day.date} is ${day.status}; only an open day can be logged.` });
  const line = db.prepare('SELECT * FROM daily_lines WHERE id=? AND dayId=?').get(req.body.lineId, day.id);
  if (!line) return res.status(404).json({ error: 'Material line not found.' });
  const used = Number(req.body.usedQty), ret = Number(req.body.returnedQty);
  if (!(used >= 0) || !(ret >= 0)) return res.status(400).json({ error: 'usedQty and returnedQty must be numbers >= 0.' });
  if (used + ret > line.issuedQty)
    return res.status(400).json({ error: `Used (${used}) + returned (${ret}) exceeds issued (${line.issuedQty}) for “${line.name}”.` });
  db.prepare('UPDATE daily_lines SET usedQty=?, returnedQty=?, updatedAt=? WHERE id=?').run(used, ret, nowIso(), line.id);
  res.json(fullState());
});
app.post('/api/material-days/:id/submit', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (actor.role !== 'cs')
    return res.status(403).json({ error: 'Only Customer Service submits the daily material report.' });
  const day = db.prepare('SELECT * FROM material_days WHERE id=?').get(req.params.id);
  if (!day) return res.status(404).json({ error: 'Material day not found.' });
  if (day.status !== 'open') return res.status(400).json({ error: `Material day ${day.date} is ${day.status}.` });
  const pending = db.prepare('SELECT name FROM daily_lines WHERE dayId=? AND (usedQty IS NULL OR returnedQty IS NULL)').all(day.id);
  if (pending.length)
    return res.status(400).json({ error: `Cannot submit yet — ${pending.length} line(s) still unlogged: ${pending.map((p) => p.name).join(', ')}.` });
  db.prepare('UPDATE material_days SET status=?, submittedById=?, submittedAt=? WHERE id=?')
    .run('submitted', actor.id, nowIso(), day.id);
  logActivity(actor.id, null, `submitted daily material report for ${day.date} — awaiting Warehouse check`);
  res.json(fullState());
});
app.post('/api/material-days/:id/check', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (actor.role !== 'warehouse_manager')
    return res.status(403).json({ error: 'Only the Warehouse Manager checks the daily material report.' });
  const day = db.prepare('SELECT * FROM material_days WHERE id=?').get(req.params.id);
  if (!day) return res.status(404).json({ error: 'Material day not found.' });
  if (day.status !== 'submitted') return res.status(400).json({ error: `Material day ${day.date} is ${day.status}; only a submitted report can be checked.` });
  const decision = req.body.decision === 'flagged' ? 'flagged' : 'approved';
  db.prepare(`UPDATE material_days SET status=?, checkedById=?, checkedAt=?, checkNote=? WHERE id=?`)
    .run(decision, actor.id, nowIso(), req.body.note || '', day.id);
  logActivity(actor.id, null, `${decision} daily material report for ${day.date}${req.body.note ? `: ${req.body.note}` : ''}`);
  res.json(fullState(actor));
});

// --- Per-task ad-hoc materials (no master catalog) ---
app.post('/api/tasks/:id/materials', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  const b = req.body;
  if (!b.name || !(Number(b.qty) > 0)) return res.status(400).json({ error: 'Material name and qty > 0 are required.' });
  db.prepare(`INSERT INTO task_materials (taskId,name,qty,unit,serial,direction,createdById,createdAt) VALUES (?,?,?,?,?,?,?,?)`)
    .run(t.id, b.name, Number(b.qty), b.unit || 'pcs', b.serial || '', b.direction || 'out', actor.id, nowIso());
  res.status(201).json(fullState());
});
app.delete('/api/tasks/:id/materials/:mid', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  db.prepare('DELETE FROM task_materials WHERE id=? AND taskId=?').run(req.params.mid, req.params.id);
  res.json(fullState());
});

// --- Files & evidence photos (base64 JSON upload; stored on disk) ---
app.post('/api/tasks/:id/files', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found.' });
  const b = req.body;
  if (!b.name || !b.data) return res.status(400).json({ error: 'File name and base64 data are required.' });
  const buf = Buffer.from(String(b.data).split(',').pop(), 'base64');
  if (!buf.length || buf.length > 25 * 1024 * 1024) return res.status(400).json({ error: 'Invalid file data (max 25 MB).' });
  const safe = String(b.name).replace(/[^a-zA-Z0-9._-]/g, '_');
  const stored = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, stored), buf);
  const r = db.prepare(`INSERT INTO files (taskId,name,mimeType,size,category,caption,storedPath,createdById,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(t.id, b.name, b.mimeType || '', buf.length,
    b.category === 'evidence' ? 'evidence' : 'file', b.caption || '', stored, actor.id, nowIso());
  logActivity(actor.id, t.id, b.category === 'evidence' ? `added evidence photo “${b.name}” to “${t.title}”` : `attached file “${b.name}” to “${t.title}”`);
  res.status(201).json(fullState());
});
app.get('/api/files/:id', (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id=?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'File not found.' });
  const p = path.join(UPLOADS_DIR, path.basename(f.storedPath));
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'File missing on disk.' });
  res.setHeader('Content-Type', f.mimeType || 'application/octet-stream');
  res.sendFile(p);
});
app.patch('/api/files/:id', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  if (req.body.caption !== undefined) db.prepare('UPDATE files SET caption=? WHERE id=?').run(req.body.caption, req.params.id);
  res.json(fullState());
});
app.delete('/api/files/:id', (req, res) => {
  const actor = requireActor(req, res); if (!actor) return;
  const f = db.prepare('SELECT * FROM files WHERE id=?').get(req.params.id);
  if (f) { try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(f.storedPath))); } catch { /* already gone */ } }
  db.prepare('DELETE FROM files WHERE id=?').run(req.params.id);
  res.json(fullState());
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Team Management Dashboard listening on http://0.0.0.0:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
