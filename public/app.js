// Team Management Dashboard — vanilla frontend. All rules are enforced
// server-side; the UI only reflects what the acting user is allowed to do.
let S = null;
let actorId = Number(localStorage.getItem('actorId') || 1);
let currentView = 'overview';
let calCursor = new Date();
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => new Date().toISOString().slice(0, 10);
const ydayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
const person = (id) => S.people.find((p) => p.id === id);
const personName = (id) => person(id)?.name || '—';
const colById = (id) => S.columns.find((c) => c.id === id);
const doneCol = () => S.columns.find((c) => c.kind === 'done');
const reviewCol = () => S.columns.find((c) => c.kind === 'review');
const actor = () => person(actorId) || S.people[0];
const canApproveTask = (t) => actor().role === 'head_noc' || (actor().role === 'osp' && t.createdById === actor().id);

function toast(msg, ok = true) {
  const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden');
  el.style.background = ok ? '#12233a' : '#b42318';
  setTimeout(() => el.classList.add('hidden'), 3500);
}
async function api(path, method = 'GET', body) {
  const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify({ ...body, actorId }) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
async function refresh() {
  S = await (await fetch('/api/state')).json();
  renderActor(); renderAll();
}
function renderActor() {
  const sel = $('#actorSelect');
  sel.innerHTML = S.people.filter((p) => p.active && p.role !== 'field_tech')
    .map((p) => `<option value="${p.id}" ${p.id === actorId ? 'selected' : ''}>${esc(p.name)} — ${esc(p.department)}</option>`).join('');
  const a = actor();
  $('#actorRole').textContent = `${a.department} · ${a.role.replace(/_/g, ' ')}`;
}
function switchView(v) {
  currentView = v;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + v));
  renderAll();
}
function renderAll() {
  if (!S) return;
  if (currentView === 'overview') renderOverview();
  if (currentView === 'board') renderBoard();
  if (currentView === 'todo') renderTodo();
  if (currentView === 'calendar') renderCalendar();
  if (currentView === 'materials') renderMaterials();
  if (currentView === 'team') renderTeam();
  if (currentView === 'activity') renderActivity();
}

// ---- Overview: Yesterday / Today ----
function renderOverview() {
  const t = todayStr(), y = ydayStr();
  const doneY = S.tasks.filter((x) => x.completedAt && x.completedAt.slice(0, 10) === y);
  const dueT = S.tasks.filter((x) => x.dueDate === t && colById(x.columnId)?.kind !== 'done');
  const overdue = S.tasks.filter((x) => x.dueDate && x.dueDate < t && colById(x.columnId)?.kind !== 'done');
  const matY = S.materialDays.find((d) => d.date === y);
  const usedY = matY ? matY.lines.reduce((s, l) => s + (l.usedQty || 0), 0) : 0;
  const onShift = S.shifts.filter((s) => s.date === t);
  const attention = S.tasks.filter((x) => colById(x.columnId)?.kind === 'review');
  $('#view-overview').innerHTML = `
    <h2>Yesterday → Today</h2>
    <p class="muted">${y} → ${t} · What finished yesterday, what is due today, what material went out, who is on board.</p>
    <div class="cards">
      <div class="card ok"><div class="big">${doneY.length}</div><div class="label">Done yesterday</div></div>
      <div class="card"><div class="big">${dueT.length}</div><div class="label">Due today</div></div>
      <div class="card ${overdue.length ? 'warn' : ''}"><div class="big">${overdue.length}</div><div class="label">Overdue</div></div>
      <div class="card"><div class="big">${usedY}</div><div class="label">Material used yesterday (units)</div></div>
      <div class="card"><div class="big">${onShift.length}</div><div class="label">On shift today</div></div>
      <div class="card ${attention.length ? 'warn' : ''}"><div class="big">${attention.length}</div><div class="label">Needs attention (Pending Approval)</div></div>
    </div>
    <div class="panel"><h3>Done yesterday</h3>${doneY.length ? `<ul>${doneY.map((x) => `<li>${esc(x.title)} — ${esc(personName(x.assigneeId))}</li>`).join('')}</ul>` : '<p class="muted">Nothing completed yesterday.</p>'}</div>
    <div class="panel"><h3>Due today</h3>${dueT.length ? `<ul>${dueT.map((x) => `<li><a href="#" data-open="${x.id}">${esc(x.title)}</a> — ${esc(personName(x.assigneeId))} · ${esc(x.location || '')}</li>`).join('')}</ul>` : '<p class="muted">Nothing due today.</p>'}
    ${overdue.length ? `<h3>Overdue</h3><ul>${overdue.map((x) => `<li>${esc(x.title)} — due ${esc(x.dueDate)}</li>`).join('')}</ul>` : ''}</div>
    <div class="panel"><h3>Who is on board today (${t})</h3>${onShift.length ? `<ul>${onShift.map((s) => `<li>${esc(personName(s.personId))} — ${esc(s.shiftName)} ${esc(s.startTime)}–${esc(s.endTime)} (${esc(s.department)})</li>`).join('')}</ul>` : '<p class="muted">No shifts recorded for today — import the shift sheet.</p>'}</div>
    <div class="panel"><h3>Material out yesterday</h3>${matY ? `<table><tr><th>Item</th><th>Issued</th><th>Used</th><th>Returned</th><th>Variance</th></tr>${matY.lines.map((l) => { const v = l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0); return `<tr><td>${esc(l.name)}</td><td>${l.issuedQty} ${esc(l.unit)}</td><td>${l.usedQty ?? '—'}</td><td>${l.returnedQty ?? '—'}</td><td class="${v ? 'var-bad' : 'var-ok'}">${v}</td></tr>`; }).join('')}</table><p class="muted">Status: ${esc(matY.status)}${matY.status === 'approved' ? ' by ' + esc(personName(matY.checkedById)) : ''}</p>` : '<p class="muted">No material day recorded for yesterday.</p>'}</div>`;
  bindOpenLinks();
}

// ---- Kanban ----
function taskCard(t) {
  const ev = t.files.filter((f) => f.category === 'evidence').length;
  const col = colById(t.columnId);
  return `<div class="task" draggable="true" data-id="${t.id}" data-open="${t.id}">
    <div class="t">${esc(t.title)}</div>
    <div class="m">${esc(t.customer || t.location || '')}</div>
    <div class="m"><span class="pill ${t.priority === 'high' || t.priority === 'urgent' ? t.priority : ''}">${esc(t.priority)}</span>
    <span class="pill">${esc(t.taskKind)}</span>${t.dueDate ? `<span>Due ${esc(t.dueDate)}</span>` : ''}</div>
    <div class="m">${esc(personName(t.assigneeId))} · ${esc(t.department || '')}</div>
    ${ev ? `<div class="badge-cam">📷 ${ev} evidence</div>` : ''}
    <div class="m"><select class="move-to" data-id="${t.id}"><option value="">Move to…</option>${S.columns.map((c) => `<option value="${c.id}" ${c.id === col.id ? 'disabled' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
  </div>`;
}
function renderBoard() {
  const q = ($('#boardFilter').value || '').toLowerCase();
  const tasks = S.tasks.filter((t) => !q || [t.title, t.customer, t.location, personName(t.assigneeId)].join(' ').toLowerCase().includes(q));
  $('#board').innerHTML = S.columns.map((c) => {
    const list = tasks.filter((t) => t.columnId === c.id);
    return `<div class="column" data-col="${c.id}"><h3>${esc(c.name)} (${list.length})
      <span><button class="btn small" data-rename-col="${c.id}">✎</button>
      <button class="btn small" data-del-col="${c.id}">✕</button></span></h3>
      ${list.map(taskCard).join('') || '<p class="muted">Empty</p>'}</div>`;
  }).join('');
  document.querySelectorAll('.task').forEach((el) => {
    el.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', el.dataset.id));
  });
  document.querySelectorAll('.column').forEach((colEl) => {
    colEl.addEventListener('dragover', (e) => { e.preventDefault(); colEl.classList.add('dragover'); });
    colEl.addEventListener('dragleave', () => colEl.classList.remove('dragover'));
    colEl.addEventListener('drop', async (e) => {
      e.preventDefault(); colEl.classList.remove('dragover');
      await moveTask(Number(e.dataTransfer.getData('text/plain')), Number(colEl.dataset.col));
    });
  });
  document.querySelectorAll('.move-to').forEach((sel) => sel.addEventListener('change', async () => {
    if (sel.value) await moveTask(Number(sel.dataset.id), Number(sel.value));
  }));
  document.querySelectorAll('[data-rename-col]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const name = prompt('Rename column:', colById(Number(b.dataset.renameCol)).name);
    if (name) { try { S = await api(`/api/columns/${b.dataset.renameCol}`, 'PATCH', { name }); renderAll(); } catch (err) { toast(err.message, false); } }
  }));
  document.querySelectorAll('[data-del-col]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this column? Its tasks move to the first column.')) return;
    try { S = await api(`/api/columns/${b.dataset.delCol}`, 'DELETE', {}); renderAll(); } catch (err) { toast(err.message, false); }
  }));
  bindOpenLinks();
}
async function moveTask(id, columnId) {
  const t = S.tasks.find((x) => x.id === id);
  const col = colById(columnId);
  if (col?.kind === 'done' && !canApproveTask(t)) {
    toast(`Only a supervisor or admin can approve a task to Done. ${actor().role === 'osp' ? 'OSP can only approve tasks they dropped themselves.' : 'Head NOC can approve anything.'}`, false);
    return;
  }
  try { S = await api(`/api/tasks/${id}/move`, 'POST', { columnId }); toast(`“${t.title}” → ${col.name}`); renderAll(); }
  catch (err) { toast(err.message, false); }
}

// ---- To-Do ----
function renderTodo() {
  const groups = {};
  for (const t of S.tasks) { const k = personName(t.assigneeId); (groups[k] = groups[k] || []).push(t); }
  $('#view-todo').innerHTML = `<h2>To-Do list</h2><p class="muted">Same tasks as the Kanban, grouped by assignee. Field technicians appear as assignees only — they have no login.</p>` +
    Object.entries(groups).map(([who, list]) => `<div class="panel"><h3>${esc(who)}</h3><ul>${list.map((t) => `<li><a href="#" data-open="${t.id}">${esc(t.title)}</a> — ${esc(colById(t.columnId)?.name || '')}${t.dueDate ? ` · due ${esc(t.dueDate)}` : ''} <span class="pill">${esc(t.priority)}</span></li>`).join('')}</ul></div>`).join('');
  bindOpenLinks();
}
function bindOpenLinks() {
  document.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('select,input,button,textarea')) return;
    e.preventDefault(); e.stopPropagation(); openTask(Number(el.dataset.open));
  }));
}

// ---- Calendar ----
function renderCalendar() {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  const first = new Date(y, m, 1), daysIn = new Date(y, m + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const monthName = first.toLocaleString('en', { month: 'long', year: 'numeric' });
  let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<div></div>';
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const due = S.tasks.filter((t) => t.dueDate === ds);
    const sh = S.shifts.filter((s) => s.date === ds);
    cells += `<div class="day ${ds === todayStr() ? 'today' : ''}" data-day="${ds}"><b>${d}</b>
      ${due.map((t) => `<div>📌 <a href="#" data-open="${t.id}">${esc(t.title.slice(0, 28))}</a></div>`).join('')}
      ${sh.map((s) => `<div>🕐 ${esc(personName(s.personId))} (${esc(s.shiftName)})</div>`).join('')}</div>`;
  }
  $('#view-calendar').innerHTML = `<h2>Calendar — ${monthName}</h2>
    <p><button class="btn" id="calPrev">‹ Prev</button> <button class="btn" id="calNext">Next ›</button>
    <button class="btn" id="calToday">Today</button></p>
    <div class="cal">${cells}</div>
    <div class="panel"><h3>Shift import</h3>
      <p class="muted">Upload a CSV (or paste it below) with columns Date | Name | Shift | Start | End | Department | Notes. Names are matched to people; re-importing the same person + date replaces the old shift instead of duplicating it.</p>
      <p><a class="btn" href="/api/shifts/template.csv">Download CSV template</a></p>
      <p><input type="file" id="csvFile" accept=".csv,text/csv"></p>
      <textarea id="csvPaste" rows="4" style="width:100%" placeholder="2026-11-08,Bima Prasetyo,Pagi,07:00,15:00,NOC,"></textarea>
      <p><button class="btn primary" id="csvPreviewBtn">Preview import</button></p>
      <div id="csvPreview"></div>
    </div>
    <div class="panel"><h3>Who is on board — pick a day</h3><p class="muted">Click any day above to see its shifts here.</p><div id="dayDetail"></div></div>`;
  $('#calPrev').onclick = () => { calCursor = new Date(y, m - 1, 1); renderCalendar(); };
  $('#calNext').onclick = () => { calCursor = new Date(y, m + 1, 1); renderCalendar(); };
  $('#calToday').onclick = () => { calCursor = new Date(); renderCalendar(); };
  document.querySelectorAll('.cal .day').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const ds = el.dataset.day;
    const sh = S.shifts.filter((s) => s.date === ds);
    const due = S.tasks.filter((t) => t.dueDate === ds);
    $('#dayDetail').innerHTML = `<h4>${ds}</h4>
      <p><b>On shift:</b> ${sh.length ? sh.map((s) => `${esc(personName(s.personId))} — ${esc(s.shiftName)} ${esc(s.startTime)}–${esc(s.endTime)}`).join('<br>') : 'nobody recorded'}</p>
      <p><b>Tasks due:</b> ${due.length ? due.map((t) => esc(t.title)).join('<br>') : 'none'}</p>`;
  }));
  $('#csvFile').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { $('#csvPaste').value = r.result; }; r.readAsText(f);
  });
  $('#csvPreviewBtn').onclick = () => {
    const rows = parseCsv($('#csvPaste').value);
    if (!rows.length) { toast('Nothing to import — paste CSV first.', false); return; }
    const matched = rows.filter((r) => S.people.some((p) => p.name.toLowerCase() === (r.name || '').toLowerCase()));
    $('#csvPreview').innerHTML = `<table><tr><th>Date</th><th>Name</th><th>Shift</th><th>Match</th></tr>${rows.map((r) => {
      const ok = S.people.some((p) => p.name.toLowerCase() === (r.name || '').toLowerCase());
      return `<tr><td>${esc(r.date || '')}</td><td>${esc(r.name || '')}</td><td>${esc(r.shift || '')}</td><td>${ok ? '✓ matched' : '✗ no such person'}</td></tr>`;
    }).join('')}</table>
    <p>${matched.length} matched / ${rows.length - matched.length} no such person.</p>
    <p><button class="btn primary" id="csvImportBtn">Import ${rows.length} rows</button></p>`;
    $('#csvImportBtn').onclick = async () => {
      try { const r = await api('/api/shifts/import', 'POST', { rows }); S = r.state; toast(`Import done: ${r.created} created, ${r.replaced} replaced, ${r.skipped} skipped.`); renderAll(); }
      catch (err) { toast(err.message, false); }
    };
  };
  bindOpenLinks();
}
function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const hasHead = head.includes('date') && head.includes('name');
  const body = hasHead ? lines.slice(1) : lines;
  return body.map((l) => {
    const c = l.split(',').map((x) => x.trim());
    return { date: c[0] || '', name: c[1] || '', shift: c[2] || '', start: c[3] || '', end: c[4] || '', department: c[5] || '', notes: c[6] || '' };
  }).filter((r) => r.date && r.name);
}

// ---- Materials daily cycle ----
function renderMaterials() {
  const days = [...S.materialDays].sort((a, b) => b.date.localeCompare(a.date));
  const a = actor();
  $('#view-materials').innerHTML = `<h2>Materials — daily cycle</h2>
  <p class="muted"><b>Morning:</b> Warehouse issues everything that might be used that day. <b>During the day:</b> CS logs used / returned and submits the report. <b>Next day:</b> Warehouse checks it against issued data and approves or flags it. Issued − (used + returned) = variance; anything other than 0 is highlighted.</p>
  ${days.map((d) => {
    const tot = d.lines.reduce((s, l) => ({ i: s.i + l.issuedQty, u: s.u + (l.usedQty || 0), r: s.r + (l.returnedQty || 0) }), { i: 0, u: 0, r: 0 });
    const variance = tot.i - tot.u - tot.r;
    return `<div class="panel"><h3>${esc(d.date)} — status: ${esc(d.status)}${d.status === 'approved' ? ` (checked by ${esc(personName(d.checkedById))})` : ''}${d.status === 'flagged' ? ` — ${esc(d.checkNote)}` : ''}</h3>
    <table><tr><th>Item</th><th>Issued</th><th>Used</th><th>Returned</th><th>Variance</th></tr>
    ${d.lines.map((l) => { const v = l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0); return `<tr><td>${esc(l.name)}</td><td>${l.issuedQty} ${esc(l.unit)}</td><td>${l.usedQty ?? '—'}</td><td>${l.returnedQty ?? '—'}</td><td class="${v ? 'var-bad' : 'var-ok'}">${v}</td></tr>`; }).join('')}
    <tr><td><b>Total</b></td><td><b>${tot.i}</b></td><td><b>${tot.u}</b></td><td><b>${tot.r}</b></td><td class="${variance ? 'var-bad' : 'var-ok'}"><b>${variance}</b></td></tr></table>
    ${d.status === 'open' && a.role === 'cs' ? `<h4>Log used / returned (Customer Service)</h4>${d.lines.map((l) => `<div><label>${esc(l.name)} — issued ${l.issuedQty} ${esc(l.unit)}</label>
      <input type="number" min="0" step="any" id="used-${l.id}" value="${l.usedQty ?? ''}" placeholder="Used" style="width:90px">
      <input type="number" min="0" step="any" id="ret-${l.id}" value="${l.returnedQty ?? ''}" placeholder="Returned" style="width:90px">
      <button class="btn small" data-log-line="${l.id}" data-day="${d.id}">Save</button></div>`).join('')}
      <p><button class="btn primary" data-submit-day="${d.id}">Submit daily report</button></p>` : ''}
    ${d.status === 'open' && a.role === 'warehouse_manager' ? `<h4>Issue more material (Warehouse Manager)</h4>
      <div><input id="issue-name-${d.id}" list="matNames" placeholder="Item name" style="width:200px"> <input id="issue-qty-${d.id}" type="number" min="0" step="any" placeholder="Qty" style="width:80px"> <input id="issue-unit-${d.id}" placeholder="Unit" value="pcs" style="width:70px">
      <button class="btn" data-issue-day="${d.id}" data-date="${d.date}">Issue</button></div>
      <datalist id="matNames">${S.materialNames.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>` : ''}
    ${d.status === 'submitted' && a.role === 'warehouse_manager' ? `<h4>Check this report (Warehouse Manager)</h4>
      <p><button class="btn primary" data-check-day="${d.id}" data-decision="approved">Approve — matches my data</button>
      <button class="btn danger" data-check-day="${d.id}" data-decision="flagged">Flag mismatch</button></p>` : ''}
    ${d.status === 'submitted' && a.role !== 'warehouse_manager' ? '<p class="muted">Submitted — awaiting Warehouse check (next day).</p>' : ''}
    </div>`;
  }).join('')}
  <div class="panel"><h3>Issue morning material for a new day (Warehouse Manager)</h3>
    <p class="muted">Pick a date and list everything that might be used. This creates that day's issue list.</p>
    <label>Date <input type="date" id="newDayDate" value="${todayStr()}"></label>
    <div id="issueLines"><div><input class="il-name" list="matNames" placeholder="Item name"> <input class="il-qty" type="number" min="0" step="any" placeholder="Qty"> <input class="il-unit" placeholder="Unit" value="pcs"></div></div>
    <p><button class="btn" id="addIssueLine">+ Add line</button> <button class="btn primary" id="submitIssue">Issue morning material</button></p>
  </div>`;
  document.querySelectorAll('[data-log-line]').forEach((b) => b.addEventListener('click', async () => {
    try { S = await api(`/api/material-days/${b.dataset.day}/log`, 'POST', { lineId: Number(b.dataset.logLine), usedQty: Number(document.getElementById('used-' + b.dataset.logLine).value), returnedQty: Number(document.getElementById('ret-' + b.dataset.logLine).value) }); toast('Logged.'); renderAll(); }
    catch (err) { toast(err.message, false); }
  }));
  document.querySelectorAll('[data-submit-day]').forEach((b) => b.addEventListener('click', async () => {
    try { S = await api(`/api/material-days/${b.dataset.submitDay}/submit`, 'POST', {}); toast('Daily report submitted — awaiting Warehouse check.'); renderAll(); }
    catch (err) { toast(err.message, false); }
  }));
  document.querySelectorAll('[data-check-day]').forEach((b) => b.addEventListener('click', async () => {
    const note = b.dataset.decision === 'flagged' ? prompt('What does not match?') || '' : '';
    try { S = await api(`/api/material-days/${b.dataset.checkDay}/check`, 'POST', { decision: b.dataset.decision, note }); toast(`Report ${b.dataset.decision}.`); renderAll(); }
    catch (err) { toast(err.message, false); }
  }));
  document.querySelectorAll('[data-issue-day]').forEach((b) => b.addEventListener('click', async () => {
    const name = document.getElementById(`issue-name-${b.dataset.issueDay}`).value;
    const qty = Number(document.getElementById(`issue-qty-${b.dataset.issueDay}`).value);
    const unit = document.getElementById(`issue-unit-${b.dataset.issueDay}`).value || 'pcs';
    try { S = await api(`/api/material-days/${b.dataset.date}/issue`, 'POST', { lines: [{ name, qty, unit }] }); toast('Issued.'); renderAll(); }
    catch (err) { toast(err.message, false); }
  }));
  $('#addIssueLine').onclick = () => {
    const div = document.createElement('div');
    div.innerHTML = '<input class="il-name" list="matNames" placeholder="Item name"> <input class="il-qty" type="number" min="0" step="any" placeholder="Qty"> <input class="il-unit" placeholder="Unit" value="pcs">';
    $('#issueLines').appendChild(div);
  };
  $('#submitIssue').onclick = async () => {
    const lines = [...document.querySelectorAll('#issueLines > div')].map((div) => ({
      name: div.querySelector('.il-name').value.trim(),
      qty: Number(div.querySelector('.il-qty').value),
      unit: div.querySelector('.il-unit').value || 'pcs',
    })).filter((l) => l.name && l.qty > 0);
    if (!lines.length) { toast('Add at least one line with a name and qty.', false); return; }
    try { S = await api(`/api/material-days/${$('#newDayDate').value}/issue`, 'POST', { lines }); toast('Morning material issued.'); renderAll(); }
    catch (err) { toast(err.message, false); }
  };
}

// ---- Team ----
function renderTeam() {
  const roles = { head_noc: 'Head NOC — approves anything', osp: 'OSP — drops projects, approves only own dropped tasks', noc: 'NOC — monitors, assigns, creates handover / reminder tasks', cs: 'Customer Service — logs daily material', warehouse_manager: 'Warehouse Manager — issues + checks material', field_tech: 'Field technician — assignee only, no login' };
  const byDept = {};
  for (const p of S.people) { (byDept[p.department] = byDept[p.department] || []).push(p); }
  $('#view-team').innerHTML = `<h2>Team</h2><p class="muted">One account per person, grouped by department. Field technicians have no account — they are assignees only, and NOC updates their work.</p>` +
    Object.entries(byDept).map(([dept, list]) => `<div class="panel"><h3>${esc(dept)}</h3><table><tr><th>Name</th><th>Role</th><th>Can approve?</th></tr>${list.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(roles[p.role] || p.role)}</td><td>${p.role === 'head_noc' ? 'Anything' : p.role === 'osp' ? 'Own dropped tasks only' : 'No'}</td></tr>`).join('')}</table></div>`).join('');
}

// ---- Activity ----
function renderActivity() {
  $('#view-activity').innerHTML = `<h2>Activity log</h2><div class="panel"><ul>${S.activity.map((a) => `<li><b>${esc(personName(a.actorId))}</b> — ${esc(a.text)} <span class="muted">(${new Date(a.createdAt).toLocaleString('id-ID')})</span></li>`).join('')}</ul></div>`;
}

// ---- Task detail modal ----
let openTaskId = null;
let pendingCaption = '';
function openTask(id) {
  openTaskId = id;
  const t = S.tasks.find((x) => x.id === id);
  if (!t) return;
  const col = colById(t.columnId);
  const ev = t.files.filter((f) => f.category === 'evidence');
  const files = t.files.filter((f) => f.category !== 'evidence');
  const isReview = col.kind === 'review';
  const canAppr = canApproveTask(t);
  $('#taskDetail').innerHTML = `
    <h2>${esc(t.title)}</h2>
    <p class="muted">${esc(t.taskKind)} · ${esc(t.department || '')} · ${esc(col.name)} · Priority: ${esc(t.priority)} · Due: ${esc(t.dueDate || '—')}</p>
    <p>${esc(t.description || '')}</p>
    <p class="muted">Customer: ${esc(t.customer || '—')} · Location: ${esc(t.location || '—')} · Service: ${esc(t.serviceId || '—')} · Dropped by: ${esc(personName(t.createdById))} · Assigned to: ${esc(personName(t.assigneeId))}</p>
    ${isReview ? (ev.length ? `<div class="okbox">Evidence attached: ${ev.length} photo(s) — review below before approving.</div>`
      : `<div class="warnbox"><b>⚠ No evidence photos.</b> This task was sent for approval with no proof. Ask for photos before approving.</div>`) : ''}
    ${isReview ? `<p>${canAppr ? `<button class="btn primary" id="approveBtn">Approve → Done</button>` : `<button class="btn primary" disabled title="You cannot approve this task">Approve → Done</button>`}
    <button class="btn danger" id="rejectBtn" ${canAppr ? '' : 'disabled'}>Reject back</button>
    ${!canAppr ? `<span class="muted">${actor().role === 'osp' ? 'OSP can only approve tasks they dropped themselves.' : 'Only Head NOC (anything) or OSP (own dropped tasks) can approve.'}</span>` : ''}</p>` : ''}
    <p><label>Move to <select id="modalMove">${S.columns.map((c) => `<option value="${c.id}" ${c.id === col.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></p>
    <h3>Evidence photos</h3>
    <div class="gallery">${ev.map((f) => `<figure style="margin:0"><img src="/api/files/${f.id}" data-lightbox="${f.id}" data-cap="${esc(f.caption || f.name)}" alt="${esc(f.caption || 'evidence')}">
      <figcaption class="muted">${esc(f.caption || f.name)} · ${esc(personName(f.createdById))} · ${new Date(f.createdAt).toLocaleDateString()}</figcaption></figure>`).join('') || '<p class="muted">No evidence photos yet.</p>'}</div>
    <div class="chip-row" id="capChips">${['ONT installed', 'Speedtest result', 'Before/After', 'ODP installed', 'Cable pulled'].map((c) => `<button type="button" data-cap="${c}">${c}</button>`).join('')}</div>
    <p><input type="file" id="evInput" accept="image/*" multiple> <span class="muted">Caption: <b id="capLabel">—</b> (tap a chip above, or leave blank)</span></p>
    <h3>Material (ad-hoc, per task)</h3>
    <ul>${t.materials.map((m) => `<li>${esc(m.name)} — ${m.qty} ${esc(m.unit)}${m.serial ? ` · SN ${esc(m.serial)}` : ''} (${esc(m.direction)})</li>`).join('') || '<li class="muted">No material logged on this task.</li>'}</ul>
    <p><input id="matName" list="matNames2" placeholder="Item name" style="width:180px"> <input id="matQty" type="number" min="0" step="any" placeholder="Qty" style="width:80px"> <input id="matUnit" placeholder="Unit" value="pcs" style="width:70px"> <input id="matSerial" placeholder="Serial (optional)" style="width:150px"> <button class="btn" id="addMatBtn">Add material</button></p>
    <datalist id="matNames2">${S.materialNames.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
    <h3>Files</h3>
    <ul>${files.map((f) => `<li><a href="/api/files/${f.id}" target="_blank">${esc(f.name)}</a> <button class="btn small" data-del-file="${f.id}">✕</button></li>`).join('') || '<li class="muted">No files.</li>'}</ul>
    <p><input type="file" id="fileInput"> <button class="btn" id="uploadFileBtn">Attach file</button></p>
    <p><button class="btn danger" id="deleteTaskBtn">Delete task</button></p>`;
  $('#taskModal').classList.remove('hidden');
  $('#modalMove').addEventListener('change', async (e) => {
    await moveTask(t.id, Number(e.target.value)); openTask(t.id);
  });
  const appr = $('#approveBtn'); if (appr) appr.onclick = async () => {
    try { S = await api(`/api/tasks/${t.id}/move`, 'POST', { columnId: doneCol().id }); toast('Approved → Done.'); $('#taskModal').classList.add('hidden'); renderAll(); }
    catch (err) { toast(err.message, false); }
  };
  const rej = $('#rejectBtn'); if (rej) rej.onclick = async () => {
    const reason = prompt('Rejection reason:') || '';
    try { S = await api(`/api/tasks/${t.id}/reject`, 'POST', { reason }); toast('Rejected back to In Progress.'); $('#taskModal').classList.add('hidden'); renderAll(); }
    catch (err) { toast(err.message, false); }
  };
  document.querySelectorAll('#capChips button').forEach((b) => b.addEventListener('click', () => { pendingCaption = b.dataset.cap; $('#capLabel').textContent = pendingCaption; }));
  const readAsDataUrl = (f) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(f); });
  $('#evInput').addEventListener('change', async (e) => {
    for (const f of e.target.files) {
      const data = await readAsDataUrl(f);
      try { S = await api(`/api/tasks/${t.id}/files`, 'POST', { name: f.name, mimeType: f.type, data, category: 'evidence', caption: pendingCaption }); }
      catch (err) { toast(err.message, false); return; }
    }
    pendingCaption = ''; toast('Evidence photo(s) added.'); openTask(t.id); renderAll();
  });
  $('#fileInput') && $('#uploadFileBtn').addEventListener('click', async () => {
    const f = $('#fileInput').files[0]; if (!f) { toast('Pick a file first.', false); return; }
    const data = await readAsDataUrl(f);
    try { S = await api(`/api/tasks/${t.id}/files`, 'POST', { name: f.name, mimeType: f.type, data, category: 'file', caption: '' }); toast('File attached.'); openTask(t.id); renderAll(); }
    catch (err) { toast(err.message, false); }
  });
  document.querySelectorAll('[data-del-file]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this file?')) return;
    try { S = await api(`/api/files/${b.dataset.delFile}`, 'DELETE', {}); openTask(t.id); renderAll(); } catch (err) { toast(err.message, false); }
  }));
  $('#addMatBtn').addEventListener('click', async () => {
    const name = $('#matName').value.trim(), qty = Number($('#matQty').value);
    if (!name || !(qty > 0)) { toast('Material name and qty > 0 are required.', false); return; }
    try { S = await api(`/api/tasks/${t.id}/materials`, 'POST', { name, qty, unit: $('#matUnit').value || 'pcs', serial: $('#matSerial').value }); toast('Material added.'); openTask(t.id); renderAll(); }
    catch (err) { toast(err.message, false); }
  });
  $('#deleteTaskBtn').addEventListener('click', async () => {
    if (!confirm('Delete this task?')) return;
    try { S = await api(`/api/tasks/${t.id}`, 'DELETE', {}); $('#taskModal').classList.add('hidden'); toast('Task deleted.'); renderAll(); }
    catch (err) { toast(err.message, false); }
  });
  document.querySelectorAll('[data-lightbox]').forEach((img) => img.addEventListener('click', () => {
    $('#lightboxImg').src = '/api/files/' + img.dataset.lightbox;
    $('#lightboxCap').textContent = img.dataset.cap || '';
    $('#lightbox').classList.remove('hidden');
  }));
}

// ---- New task ----
function newTaskForm() {
  const staff = S.people.filter((p) => p.role !== 'field_tech');
  const field = S.people.filter((p) => p.role === 'field_tech');
  $('#taskDetail').innerHTML = `<h2>New task</h2>
    <div class="form-grid">
      <div><label>Title <input id="ntTitle" style="width:100%"></label></div>
      <div><label>Kind <select id="ntKind" style="width:100%"><option value="ticket">Ticket</option><option value="project">Project</option><option value="maintenance">Maintenance</option><option value="handover">Handover (oncoming shift)</option><option value="reminder">Reminder (future maintenance/project)</option></select></label></div>
      <div><label>Department <select id="ntDept" style="width:100%">${[...new Set(S.people.map((p) => p.department))].map((d) => `<option>${esc(d)}</option>`).join('')}</select></label></div>
      <div><label>Priority <select id="ntPri" style="width:100%"><option>normal</option><option>high</option><option>urgent</option></select></label></div>
      <div><label>Assign to (field techs are assignees only) <select id="ntAssignee" style="width:100%"><option value="">— unassigned —</option><optgroup label="Staff">${staff.map((p) => `<option value="${p.id}">${esc(p.name)} (${esc(p.department)})</option>`).join('')}</optgroup><optgroup label="Field tech (no login)">${field.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup></select></label></div>
      <div><label>Due date <input id="ntDue" type="date" style="width:100%"></label></div>
      <div><label>Customer <input id="ntCust" style="width:100%"></label></div>
      <div><label>Location <input id="ntLoc" style="width:100%"></label></div>
      <div><label>Service ID <input id="ntSvc" style="width:100%"></label></div>
    </div>
    <label>Description <textarea id="ntDesc" rows="3" style="width:100%"></textarea></label>
    <p><button class="btn primary" id="ntCreate">Create task</button></p>`;
  $('#taskModal').classList.remove('hidden');
  $('#ntCreate').onclick = async () => {
    const title = $('#ntTitle').value.trim();
    if (!title) { toast('Title is required.', false); return; }
    try {
      S = await api('/api/tasks', 'POST', { title, taskKind: $('#ntKind').value, department: $('#ntDept').value, priority: $('#ntPri').value, assigneeId: $('#ntAssignee').value ? Number($('#ntAssignee').value) : null, dueDate: $('#ntDue').value || null, customer: $('#ntCust').value, location: $('#ntLoc').value, serviceId: $('#ntSvc').value, description: $('#ntDesc').value });
      $('#taskModal').classList.add('hidden'); toast('Task created.'); switchView('board');
    } catch (err) { toast(err.message, false); }
  };
}

// ---- Init ----
document.querySelectorAll('#nav button').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
$('#actorSelect').addEventListener('change', (e) => { actorId = Number(e.target.value); localStorage.setItem('actorId', String(actorId)); renderAll(); });
$('#closeModal').addEventListener('click', () => $('#taskModal').classList.add('hidden'));
$('#closeLightbox').addEventListener('click', () => $('#lightbox').classList.add('hidden'));
$('#taskModal').addEventListener('click', (e) => { if (e.target.id === 'taskModal') $('#taskModal').classList.add('hidden'); });
$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') $('#lightbox').classList.add('hidden'); });
$('#newTaskBtn').addEventListener('click', newTaskForm);
$('#addColBtn').addEventListener('click', async () => {
  const name = prompt('New column name:'); if (!name) return;
  try { S = await api('/api/columns', 'POST', { name }); renderAll(); } catch (err) { toast(err.message, false); }
});
$('#boardFilter').addEventListener('input', () => { if (currentView === 'board') renderBoard(); });
refresh().catch((err) => { document.getElementById('main').innerHTML = '<p>Failed to load: ' + esc(err.message) + '</p>'; });
