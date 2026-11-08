// Team Management Dashboard — vanilla frontend. All rules are enforced
// server-side; the UI only reflects what the acting user is allowed to do.
let S = null;
let actorId = Number(localStorage.getItem('actorId') || 1);
// ---- i18n: EN / ID. Default English; toggle persisted in localStorage.
// Proper names, ticket/customer/material names are never translated.
let lang = 'en';
try { const _l = localStorage.getItem('tmd-lang'); if (_l === 'en' || _l === 'id') lang = _l; } catch { /* storage blocked: stay English */ }
const I18N = {
en: {
  nav_overview:'Overview', nav_board:'Kanban', nav_todo:'To-Do', nav_calendar:'Calendar', nav_materials:'Materials', nav_team:'Team', nav_activity:'Activity',
  acting_as:'Acting as', demo_badge:'Prototype · demo data',
  theme_dark:'🌙 Dark', theme_light:'☀️ Light',
  subtitle:'PT Sakti Wijaya Network · NOC / OSP / Customer Service / Warehouse',
  overview_title:'Yesterday → Today', overview_sub:'What finished yesterday, what is due today, what material went out, who is on board.',
  done_yesterday:'Done yesterday', due_today:'Due today', overdue:'Overdue', mat_used_yday:'Material used yesterday (units)',
  on_shift_today:'On shift today', needs_attention:'Needs attention (Pending Approval)',
  done_yesterday_h:'Done yesterday', due_today_h:'Due today', overdue_h:'Overdue', onboard_h:'Who is on board today',
  mat_out_yday:'Material out yesterday', nothing_done_yday:'Nothing completed yesterday.', nothing_due_today:'Nothing due today.',
  no_shifts_today:'No shifts recorded today — import a shift file.', no_mat_yday:'No material record for yesterday.',
  status_label:'Status', by_label:'by',
  new_task:'+ Add task', add_column:'+ Add column', filter_ph:'Filter by city, customer, technician…',
  empty_col:'Empty', move_to:'Move to…',
  todo_title:'To-Do list', todo_sub:'Same tasks as the Kanban, grouped by assignee. Field technicians appear as assignees only — they have no login.',
  cal_title:'Calendar', prev:'‹ Prev', next:'Next ›', today_btn:'Today',
  shift_import:'Shift import', shift_import_help:'Upload a CSV (or paste it below) with columns Date | Name | Shift | Start | End | Department | Notes. Names are matched to people; re-importing the same person + date replaces the old shift instead of duplicating it.',
  download_template:'Download CSV template', preview_import:'Preview import', import_rows:'Import',
  matched:'matched', no_such_person:'no such person', match_ok:'✓ matched', match_no:'✗ no such person',
  nothing_to_import:'Nothing to import — paste CSV first.',
  onboard_pick:'Who is on board — pick a day', click_day:'Click any day above to see its shifts here.',
  on_shift:'On shift', tasks_due:'Tasks due', nobody:'nobody recorded', none:'none',
  mat_title:'Materials — daily cycle',
  mat_help:'Morning: Warehouse issues everything that might be used that day. During the day: CS logs used / returned and submits the report. Next day: Warehouse checks it against issued data and approves or flags it. Issued − (used + returned) = variance; anything other than 0 is highlighted.',
  th_item:'Item', th_issued:'Issued', th_used:'Used', th_returned:'Returned', th_variance:'Variance', th_where:'Where it went',
  total:'Total', status_col:'status',
  log_used_h:'Log used / returned (Customer Service)', issue_more_h:'Issue more material (Warehouse Manager)',
  check_h:'Check this report (Warehouse Manager)', approve_match:'Approve — matches my data', flag_mismatch:'Flag mismatch',
  submitted_waiting:'Submitted — awaiting Warehouse check (next day).',
  issue_new_day:'Issue morning material for a new day (Warehouse Manager)',
  issue_new_help:'Pick a date and list everything that might be used. This creates that day\'s issue list.',
  add_line:'+ Add line', issue_morning:'Issue morning material',
  date_label:'Date', item_name_ph:'Item name', qty_ph:'Qty', unit_ph:'Unit',
  where_ph:'Where did it go? e.g. Install Ibu Ratna, Binong',
  save_btn:'Save', submit_report:'Submit daily report',
  team_title:'Team', team_sub:'One account per person, grouped by department. Field technicians have no account — they are assignees only, and NOC updates their work.',
  th_name:'Name', th_role:'Role', th_can_approve:'Can approve?',
  activity_title:'Activity log',
  evidence_photos:'Evidence photos', no_evidence:'No evidence photos yet.',
  evidence_attached:'Evidence attached', evidence_review:'photo(s) — review below before approving.',
  no_evidence_warn:'No evidence photos.', no_evidence_warn2:'This task was sent for approval with no proof. Ask for photos before approving.',
  approve_done:'Approve → Done', reject_back:'Reject back',
  move_to_label:'Move to', mat_adhoc:'Material (ad-hoc, per task)', no_mat_task:'No material logged on this task.',
  add_material:'Add material', files_h:'Files', no_files:'No files.', attach_file:'Attach file', delete_task:'Delete task',
  caption_label:'Caption:', caption_blank:'—', caption_hint:'(tap a chip above, or leave blank)',
  serial_ph:'Serial (optional)', where_task_ph:'Where did it go? (optional)',
  new_task_title:'New task', title_label:'Title', kind_label:'Kind', dept_label:'Department', priority_label:'Priority',
  assign_label:'Assign to (field techs are assignees only)', due_label:'Due date', customer_label:'Customer',
  location_label:'Location', service_label:'Service ID', desc_label:'Description', create_task:'Create task',
  unassigned:'— unassigned —', staff_group:'Staff', field_group:'Field tech (no login)',
  rename_col:'Rename column:', del_col_confirm:'Delete this column? Its tasks move to the first column.',
  new_col_name:'New column name:', del_file_confirm:'Delete this file?', del_task_confirm:'Delete this task?',
  reject_reason:'Rejection reason:', flag_prompt:'What does not match?',
  pick_file:'Pick a file first.', title_required:'Title is required.', mat_required:'Material name and qty > 0 are required.',
  add_line_required:'Add at least one line with a name and qty.',
  logged:'Logged.', submitted_toast:'Daily report submitted — awaiting Warehouse check.', issued_toast:'Issued.',
  morning_issued:'Morning material issued.', task_created:'Task created.', task_deleted:'Task deleted.',
  evidence_added:'Evidence photo(s) added.', file_attached:'File attached.', material_added:'Material added.',
  approved_toast:'Approved → Done.', rejected_toast:'Rejected back to In Progress.',
  import_done:'Import done', created_w:'created', replaced_w:'replaced', skipped_w:'skipped',
  due_prefix:'Due', priority_word:'Priority', customer_word:'Customer', dropped_by:'Dropped by', assigned_to:'Assigned to',
  checked_by:'checked by', failed_load:'Failed to load: ',
},
id: {
  nav_overview:'Ringkasan', nav_board:'Kanban', nav_todo:'Daftar Tugas', nav_calendar:'Kalender', nav_materials:'Material', nav_team:'Tim', nav_activity:'Aktivitas',
  acting_as:'Bertindak sebagai', demo_badge:'Prototipe · data demo',
  theme_dark:'🌙 Gelap', theme_light:'☀️ Terang',
  subtitle:'PT Sakti Wijaya Network · NOC / OSP / Layanan Pelanggan / Gudang',
  overview_title:'Kemarin → Hari Ini', overview_sub:'Apa yang selesai kemarin, apa yang harus selesai hari ini, material apa yang keluar, siapa yang bertugas.',
  done_yesterday:'Selesai kemarin', due_today:'Jatuh tempo hari ini', overdue:'Terlambat', mat_used_yday:'Material terpakai kemarin (unit)',
  on_shift_today:'Bertugas hari ini', needs_attention:'Perlu perhatian (Menunggu Persetujuan)',
  done_yesterday_h:'Selesai kemarin', due_today_h:'Jatuh tempo hari ini', overdue_h:'Terlambat', onboard_h:'Siapa yang bertugas hari ini',
  mat_out_yday:'Material keluar kemarin', nothing_done_yday:'Tidak ada yang selesai kemarin.', nothing_due_today:'Tidak ada yang jatuh tempo hari ini.',
  no_shifts_today:'Tidak ada shift tercatat hari ini — impor file shift.', no_mat_yday:'Tidak ada catatan material untuk kemarin.',
  status_label:'Status', by_label:'oleh',
  new_task:'+ Tambah tugas', add_column:'+ Tambah kolom', filter_ph:'Filter berdasarkan kota, pelanggan, teknisi…',
  empty_col:'Kosong', move_to:'Pindah ke…',
  todo_title:'Daftar Tugas', todo_sub:'Tugas yang sama dengan Kanban, dikelompokkan berdasarkan penanggung jawab. Teknisi lapangan hanya muncul sebagai penanggung jawab — mereka tidak punya login.',
  cal_title:'Kalender', prev:'‹ Sebelumnya', next:'Berikutnya ›', today_btn:'Hari ini',
  shift_import:'Impor shift', shift_import_help:'Unggah CSV (atau tempel di bawah) dengan kolom Date | Name | Shift | Start | End | Department | Notes. Nama dicocokkan dengan anggota tim; mengimpor ulang orang + tanggal yang sama akan mengganti shift lama, bukan menduplikasinya.',
  download_template:'Unduh template CSV', preview_import:'Pratinjau impor', import_rows:'Impor',
  matched:'cocok', no_such_person:'tidak ada orang tersebut', match_ok:'✓ cocok', match_no:'✗ tidak ada orang tersebut',
  nothing_to_import:'Tidak ada yang diimpor — tempel CSV dulu.',
  onboard_pick:'Siapa yang bertugas — pilih tanggal', click_day:'Klik salah satu tanggal di atas untuk melihat shift-nya di sini.',
  on_shift:'Bertugas', tasks_due:'Tugas jatuh tempo', nobody:'tidak ada yang tercatat', none:'tidak ada',
  mat_title:'Material — siklus harian',
  mat_help:'Pagi: Gudang mengeluarkan semua material yang mungkin dipakai hari itu. Siang hari: CS mencatat yang terpakai / dikembalikan lalu mengirim laporan. Hari berikutnya: Gudang memeriksa dengan data pengeluaran dan menyetujui atau menandainya. Dikeluarkan − (terpakai + dikembalikan) = selisih; selain 0 akan disorot.',
  th_item:'Barang', th_issued:'Dikeluarkan', th_used:'Terpakai', th_returned:'Dikembalikan', th_variance:'Selisih', th_where:'Dipakai untuk',
  total:'Total', status_col:'status',
  log_used_h:'Catat terpakai / dikembalikan (Customer Service)', issue_more_h:'Keluarkan material lagi (Warehouse Manager)',
  check_h:'Periksa laporan ini (Warehouse Manager)', approve_match:'Setujui — sesuai data saya', flag_mismatch:'Tandai tidak cocok',
  submitted_waiting:'Sudah dikirim — menunggu pemeriksaan Gudang (hari berikutnya).',
  issue_new_day:'Keluarkan material pagi untuk hari baru (Warehouse Manager)',
  issue_new_help:'Pilih tanggal dan daftarkan semua yang mungkin dipakai. Ini membuat daftar pengeluaran hari itu.',
  add_line:'+ Tambah baris', issue_morning:'Keluarkan material pagi',
  date_label:'Tanggal', item_name_ph:'Nama barang', qty_ph:'Jml', unit_ph:'Satuan',
  where_ph:'Dipakai untuk apa? mis. Install Ibu Ratna, Binong',
  save_btn:'Simpan', submit_report:'Kirim laporan harian',
  team_title:'Tim', team_sub:'Satu akun per orang, dikelompokkan berdasarkan departemen. Teknisi lapangan tidak punya akun — mereka hanya penanggung jawab, dan NOC yang memperbarui pekerjaannya.',
  th_name:'Nama', th_role:'Peran', th_can_approve:'Bisa menyetujui?',
  activity_title:'Log Aktivitas',
  evidence_photos:'Foto bukti', no_evidence:'Belum ada foto bukti.',
  evidence_attached:'Bukti terlampir', evidence_review:'foto — periksa di bawah sebelum menyetujui.',
  no_evidence_warn:'Tidak ada foto bukti.', no_evidence_warn2:'Tugas ini dikirim untuk persetujuan tanpa bukti. Minta foto sebelum menyetujui.',
  approve_done:'Setujui → Selesai', reject_back:'Kembalikan',
  move_to_label:'Pindah ke', mat_adhoc:'Material (dadakan, per tugas)', no_mat_task:'Belum ada material yang dicatat pada tugas ini.',
  add_material:'Tambah material', files_h:'File', no_files:'Tidak ada file.', attach_file:'Lampirkan file', delete_task:'Hapus tugas',
  caption_label:'Keterangan:', caption_blank:'—', caption_hint:'(ketuk salah satu di atas, atau kosongkan)',
  serial_ph:'Serial (opsional)', where_task_ph:'Dipakai untuk apa? (opsional)',
  new_task_title:'Tugas baru', title_label:'Judul', kind_label:'Jenis', dept_label:'Departemen', priority_label:'Prioritas',
  assign_label:'Tugaskan ke (teknisi lapangan hanya penanggung jawab)', due_label:'Tanggal jatuh tempo', customer_label:'Pelanggan',
  location_label:'Lokasi', service_label:'ID Layanan', desc_label:'Deskripsi', create_task:'Buat tugas',
  unassigned:'— belum ditugaskan —', staff_group:'Staf', field_group:'Teknisi lapangan (tanpa login)',
  rename_col:'Ganti nama kolom:', del_col_confirm:'Hapus kolom ini? Tugasnya pindah ke kolom pertama.',
  new_col_name:'Nama kolom baru:', del_file_confirm:'Hapus file ini?', del_task_confirm:'Hapus tugas ini?',
  reject_reason:'Alasan penolakan:', flag_prompt:'Apa yang tidak cocok?',
  pick_file:'Pilih file dulu.', title_required:'Judul wajib diisi.', mat_required:'Nama material dan jumlah > 0 wajib diisi.',
  add_line_required:'Tambahkan minimal satu baris dengan nama dan jumlah.',
  logged:'Tercatat.', submitted_toast:'Laporan harian terkirim — menunggu pemeriksaan Gudang.', issued_toast:'Dikeluarkan.',
  morning_issued:'Material pagi dikeluarkan.', task_created:'Tugas dibuat.', task_deleted:'Tugas dihapus.',
  evidence_added:'Foto bukti ditambahkan.', file_attached:'File dilampirkan.', material_added:'Material ditambahkan.',
  approved_toast:'Disetujui → Selesai.', rejected_toast:'Dikembalikan ke Sedang Dikerjakan.',
  import_done:'Impor selesai', created_w:'dibuat', replaced_w:'diganti', skipped_w:'dilewati',
  due_prefix:'Jatuh tempo', priority_word:'Prioritas', customer_word:'Pelanggan', dropped_by:'Dibuat oleh', assigned_to:'Ditugaskan ke',
  checked_by:'diperiksa oleh', failed_load:'Gagal memuat: ',
}};
const tr = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
const COL_NAMES = { 'Backlog':['Backlog','Backlog'], 'To Do':['To Do','Yang Harus Dikerjakan'], 'In Progress':['In Progress','Sedang Dikerjakan'], 'Waiting':['Waiting','Menunggu'], 'Pending Approval':['Pending Approval','Menunggu Persetujuan'], 'Done':['Done','Selesai'] };
const tCol = (name) => (COL_NAMES[name] ? COL_NAMES[name][lang === 'id' ? 1 : 0] : name);
const tPri = (p) => ({ normal:['normal','Normal'], high:['high','Tinggi'], urgent:['urgent','Mendesak'] }[p] || [p, p])[lang === 'id' ? 1 : 0];
const tKind = (k) => ({ ticket:['Ticket','Tiket'], project:['Project','Proyek'], maintenance:['Maintenance','Pemeliharaan'], handover:['Handover','Serah Terima'], reminder:['Reminder','Pengingat'] }[k] || [k, k])[lang === 'id' ? 1 : 0];
const tDept = (d) => ({ 'Head NOC':['Head NOC','Kepala NOC'], 'Customer Service':['Customer Service','Layanan Pelanggan'], 'Warehouse':['Warehouse','Gudang'], 'Field':['Field','Lapangan'] }[d] || [d, d])[lang === 'id' ? 1 : 0];
const tRole = (r) => ({ head_noc:['head noc','Kepala NOC'], osp:['osp','OSP'], noc:['noc','NOC'], cs:['cs','Layanan Pelanggan'], warehouse_manager:['warehouse manager','Manajer Gudang'], field_tech:['field tech','teknisi lapangan'] }[r] || [r, r])[lang === 'id' ? 1 : 0];
const tRoleDesc = (r) => ({
  head_noc: ['Head NOC — approves anything', 'Kepala NOC — menyetujui apa pun'],
  osp: ['OSP — drops projects, approves only own dropped tasks', 'OSP — membuat proyek, hanya menyetujui tugas yang dibuatnya sendiri'],
  noc: ['NOC — monitors, assigns, creates handover / reminder tasks', 'NOC — memantau, menugaskan, membuat tugas serah terima / pengingat'],
  cs: ['Customer Service — logs daily material', 'Layanan Pelanggan — mencatat material harian'],
  warehouse_manager: ['Warehouse Manager — issues + checks material', 'Manajer Gudang — mengeluarkan + memeriksa material'],
  field_tech: ['Field technician — assignee only, no login', 'Teknisi lapangan — hanya penanggung jawab, tanpa login'],
}[r] || [r, r])[lang === 'id' ? 1 : 0];
const tApprove = (r) => ({ head_noc:['Anything','Apa pun'], osp:['Own dropped tasks only','Hanya tugas yang dibuat sendiri'] }[r] || ['No','Tidak'])[lang === 'id' ? 1 : 0];
function setLang(l) {
  if (l !== 'en' && l !== 'id') return;
  lang = l;
  try { localStorage.setItem('tmd-lang', l); } catch {}
  document.documentElement.lang = l === 'id' ? 'id' : 'en';
  document.querySelectorAll('#nav button').forEach((b) => { b.textContent = tr('nav_' + b.dataset.view); });
  const sub = document.querySelector('.topbar .sub'); if (sub) sub.textContent = tr('subtitle');
  const al = document.querySelector('label[for="actorSelect"]'); if (al) al.textContent = tr('acting_as');
  const db = document.querySelector('.demo-badge'); if (db) db.textContent = tr('demo_badge');
  const be = document.getElementById('langEn'); if (be) be.classList.toggle('active', l === 'en');
  const bi = document.getElementById('langId'); if (bi) bi.classList.toggle('active', l === 'id');
  applyStaticText();
  renderActor(); applyStaticText(); applyRoleVisibility(); renderAll();
}

// ---- Theme: dark / light. Default light; explicit toggle only (no OS
// follow, so the choice is predictable). Persisted in localStorage.
let theme = 'light';
try { const _t = localStorage.getItem('tmd-theme'); if (_t === 'dark' || _t === 'light') theme = _t; } catch { /* storage blocked: stay light */ }
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  const b = document.getElementById('themeToggle');
  if (b) b.textContent = theme === 'dark' ? tr('theme_light') : tr('theme_dark');
}
function setTheme(t2) {
  if (t2 !== 'dark' && t2 !== 'light') return;
  theme = t2;
  try { localStorage.setItem('tmd-theme', t2); } catch {}
  applyTheme();
}

let currentView = 'overview';
let calCursor = new Date();
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => new Date().toISOString().slice(0, 10);
const ydayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
const person = (id) => S.people.find((p) => p.id === id);
const personName = (id) => person(id)?.name || '—';
const colById = (id) => S.columns.find((c) => c.id === id);
// New tasks may only be created in Backlog (parked/future work) or To Do
// (ready to work on now). Every other column is a state a task moves into
// via drag-and-drop / "Move to", not an entry point. Rule is by column
// name, not position, so a custom column never gets an Add Task button
// unless it is named Backlog or To Do.
const isEntryColumn = (c) => c && ['backlog', 'to do'].includes(String(c.name || '').trim().toLowerCase());
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
const isWM = () => actor().role === 'warehouse_manager';
// Warehouse Manager sees Materials only: hide every other nav item and
// force Materials as the landing view. The server enforces this too —
// this only reflects it in the UI.
function applyStaticText() {
  document.querySelectorAll('#nav button').forEach((b) => { b.textContent = tr('nav_' + b.dataset.view); });
  const ab = document.getElementById('addColBtn'); if (ab) ab.textContent = tr('add_column');
  const bf = document.getElementById('boardFilter'); if (bf) bf.placeholder = tr('filter_ph');
  const sub = document.querySelector('.topbar .sub'); if (sub) sub.textContent = tr('subtitle');
  const al = document.querySelector('label[for="actorSelect"]'); if (al) al.textContent = tr('acting_as');
  const db = document.querySelector('.demo-badge'); if (db) db.textContent = tr('demo_badge');
  const tb = document.getElementById('themeToggle'); if (tb) tb.textContent = theme === 'dark' ? tr('theme_light') : tr('theme_dark');
}
function applyRoleVisibility() {
  const wm = isWM();
  document.querySelectorAll('#nav button').forEach((b) => {
    b.style.display = wm && b.dataset.view !== 'materials' ? 'none' : '';
  });
  if (wm) currentView = 'materials';
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === currentView));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + currentView));
}
async function refresh() {
  S = await (await fetch('/api/state?actorId=' + actorId)).json();
  renderActor(); applyStaticText(); applyRoleVisibility(); renderAll();
}
function renderActor() {
  const sel = $('#actorSelect');
  sel.innerHTML = S.people.filter((p) => p.active && p.role !== 'field_tech')
    .map((p) => `<option value="${p.id}" ${p.id === actorId ? 'selected' : ''}>${esc(p.name)} — ${esc(tDept(p.department))}</option>`).join('');
  const a = actor();
  $('#actorRole').textContent = `${tDept(a.department)} · ${tRole(a.role)}`;
}
function switchView(v) {
  if (isWM()) v = 'materials';
  currentView = v;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + v));
  renderAll();
}
function renderAll() {
  if (!S) return;
  if (isWM()) { renderMaterials(); return; }
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
    <h2>${tr('overview_title')}</h2>
    <p class="muted">${y} → ${t} · ${tr('overview_sub')}</p>
    <div class="cards">
      <div class="card ok"><div class="big">${doneY.length}</div><div class="label">${tr('done_yesterday')}</div></div>
      <div class="card"><div class="big">${dueT.length}</div><div class="label">${tr('due_today')}</div></div>
      <div class="card ${overdue.length ? 'warn' : ''}"><div class="big">${overdue.length}</div><div class="label">${tr('overdue')}</div></div>
      <div class="card"><div class="big">${usedY}</div><div class="label">${tr('mat_used_yday')}</div></div>
      <div class="card"><div class="big">${onShift.length}</div><div class="label">${tr('on_shift_today')}</div></div>
      <div class="card ${attention.length ? 'warn' : ''}"><div class="big">${attention.length}</div><div class="label">${tr('needs_attention')}</div></div>
    </div>
    <div class="panel"><h3>${tr('done_yesterday_h')}</h3>${doneY.length ? `<ul>${doneY.map((x) => `<li>${esc(x.title)} — ${esc(personName(x.assigneeId))}</li>`).join('')}</ul>` : '<p class="muted">${tr(\'nothing_done_yday\')}</p>'}</div>
    <div class="panel"><h3>${tr('due_today_h')}</h3>${dueT.length ? `<ul>${dueT.map((x) => `<li><a href="#" data-open="${x.id}">${esc(x.title)}</a> — ${esc(personName(x.assigneeId))} · ${esc(x.location || '')}</li>`).join('')}</ul>` : '<p class="muted">${tr(\'nothing_due_today\')}</p>'}
    ${overdue.length ? `<h3>${tr('overdue_h')}</h3><ul>${overdue.map((x) => `<li>${esc(x.title)} — ${tr('due_prefix')} ${esc(x.dueDate)}</li>`).join('')}</ul>` : ''}</div>
    <div class="panel"><h3>${tr('onboard_h')} (${t})</h3>${onShift.length ? `<ul>${onShift.map((s) => `<li>${esc(personName(s.personId))} — ${esc(s.shiftName)} ${esc(s.startTime)}–${esc(s.endTime)} (${esc(tDept(s.department))})</li>`).join('')}</ul>` : '<p class="muted">${tr(\'no_shifts_today\')}</p>'}</div>
    <div class="panel"><h3>${tr('mat_out_yday')}</h3>${matY ? `<table><tr><th>${tr('th_item')}</th><th>${tr('th_issued')}</th><th>${tr('th_used')}</th><th>${tr('th_returned')}</th><th>${tr('th_variance')}</th><th>${tr('th_where')}</th></tr>${matY.lines.map((l) => { const v = l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0); return `<tr><td>${esc(l.name)}</td><td>${l.issuedQty} ${esc(l.unit)}</td><td>${l.usedQty ?? '—'}</td><td>${l.returnedQty ?? '—'}</td><td class="${v ? 'var-bad' : 'var-ok'}">${v}</td><td>${esc(l.note || '')}</td></tr>`; }).join('')}</table><p class="muted">${tr('status_label')}: ${esc(matY.status)}${matY.status === 'approved' ? ' ' + tr('by_label') + ' ' + esc(personName(matY.checkedById)) : ''}</p>` : '<p class="muted">${tr(\'no_mat_yday\')}</p>'}</div>`;
  bindOpenLinks();
}

// ---- Kanban ----
function taskCard(t) {
  const ev = t.files.filter((f) => f.category === 'evidence').length;
  const col = colById(t.columnId);
  return `<div class="task" draggable="true" data-id="${t.id}" data-open="${t.id}">
    <div class="t">${esc(t.title)}</div>
    <div class="m">${esc(t.customer || t.location || '')}</div>
    <div class="m"><span class="pill ${t.priority === 'high' || t.priority === 'urgent' ? t.priority : ''}">${esc(tPri(t.priority))}</span>
    <span class="pill">${esc(tKind(t.taskKind))}</span>${t.dueDate ? `<span>${tr('due_prefix')} ${esc(t.dueDate)}</span>` : ''}</div>
    <div class="m">${esc(personName(t.assigneeId))} · ${esc(t.department || '')}</div>
    ${ev ? `<div class="badge-cam">📷 ${ev} evidence</div>` : ''}
    <div class="m"><select class="move-to" data-id="${t.id}"><option value="">${tr('move_to')}</option>${S.columns.map((c) => `<option value="${c.id}" ${c.id === col.id ? 'disabled' : ''}>${esc(tCol(c.name))}</option>`).join('')}</select></div>
  </div>`;
}
function renderBoard() {
  const q = ($('#boardFilter').value || '').toLowerCase();
  const tasks = S.tasks.filter((t) => !q || [t.title, t.customer, t.location, personName(t.assigneeId)].join(' ').toLowerCase().includes(q));
  $('#board').innerHTML = S.columns.map((c) => {
    const list = tasks.filter((t) => t.columnId === c.id);
    return `<div class="column" data-col="${c.id}"><h3>${esc(tCol(c.name))} (${list.length})
      <span><button class="btn small" data-rename-col="${c.id}">✎</button>
      <button class="btn small" data-del-col="${c.id}">✕</button></span></h3>
      ${list.map(taskCard).join('') || '<p class="muted">${tr(\'empty_col\')}</p>'}
      ${isEntryColumn(c) ? `<button class="btn primary" data-add-task="${c.id}">${tr('new_task')}</button>` : ''}</div>`;
  }).join('');
  document.querySelectorAll('[data-add-task]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation(); newTaskForm(Number(b.dataset.addTask));
  }));
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
    const name = prompt(tr('rename_col'), colById(Number(b.dataset.renameCol)).name);
    if (name) { try { S = await api(`/api/columns/${b.dataset.renameCol}`, 'PATCH', { name }); renderAll(); } catch (err) { toast(err.message, false); } }
  }));
  document.querySelectorAll('[data-del-col]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm(tr('del_col_confirm'))) return;
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
  try { S = await api(`/api/tasks/${id}/move`, 'POST', { columnId }); toast(`“${t.title}” → ${tCol(col.name)}`); renderAll(); }
  catch (err) { toast(err.message, false); }
}

// ---- To-Do ----
function renderTodo() {
  const groups = {};
  for (const t of S.tasks) { const k = personName(t.assigneeId); (groups[k] = groups[k] || []).push(t); }
  $('#view-todo').innerHTML = `<h2>${tr('todo_title')}</h2><p class="muted">${tr('todo_sub')}</p>` +
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
  const monthName = first.toLocaleString(lang === 'id' ? 'id-ID' : 'en', { month: 'long', year: 'numeric' });
  let cells = (lang === 'id' ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<div></div>';
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const due = S.tasks.filter((t) => t.dueDate === ds);
    const sh = S.shifts.filter((s) => s.date === ds);
    cells += `<div class="day ${ds === todayStr() ? 'today' : ''}" data-day="${ds}"><b>${d}</b>
      ${due.map((t) => `<div>📌 <a href="#" data-open="${t.id}">${esc(t.title.slice(0, 28))}</a></div>`).join('')}
      ${sh.map((s) => `<div>🕐 ${esc(personName(s.personId))} (${esc(s.shiftName)})</div>`).join('')}</div>`;
  }
  $('#view-calendar').innerHTML = `<h2>${tr('cal_title')} — ${monthName}</h2>
    <p><button class="btn" id="calPrev">${tr('prev')}</button> <button class="btn" id="calNext">${tr('next')}</button>
    <button class="btn" id="calToday">${tr('today_btn')}</button></p>
    <div class="cal">${cells}</div>
    <div class="panel"><h3>${tr('shift_import')}</h3>
      <p class="muted">${tr('shift_import_help')}</p>
      <p><a class="btn" href="/api/shifts/template.csv">${tr('download_template')}</a></p>
      <p><input type="file" id="csvFile" accept=".csv,text/csv"></p>
      <textarea id="csvPaste" rows="4" style="width:100%" placeholder="2026-11-08,Bima Prasetyo,Pagi,07:00,15:00,NOC,"></textarea>
      <p><button class="btn primary" id="csvPreviewBtn">Preview import</button></p>
      <div id="csvPreview"></div>
    </div>
    <div class="panel"><h3>${tr('onboard_pick')}</h3><p class="muted">${tr('click_day')}</p><div id="dayDetail"></div></div>`;
  $('#calPrev').onclick = () => { calCursor = new Date(y, m - 1, 1); renderCalendar(); };
  $('#calNext').onclick = () => { calCursor = new Date(y, m + 1, 1); renderCalendar(); };
  $('#calToday').onclick = () => { calCursor = new Date(); renderCalendar(); };
  document.querySelectorAll('.cal .day').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const ds = el.dataset.day;
    const sh = S.shifts.filter((s) => s.date === ds);
    const due = S.tasks.filter((t) => t.dueDate === ds);
    $('#dayDetail').innerHTML = `<h4>${ds}</h4>
      <p><b>${tr('on_shift')}:</b> ${sh.length ? sh.map((s) => `${esc(personName(s.personId))} — ${esc(s.shiftName)} ${esc(s.startTime)}–${esc(s.endTime)}`).join('<br>') : tr('nobody')}</p>
      <p><b>${tr('tasks_due')}:</b> ${due.length ? due.map((t) => esc(t.title)).join('<br>') : tr('none')}</p>`;
  }));
  $('#csvFile').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { $('#csvPaste').value = r.result; }; r.readAsText(f);
  });
  $('#csvPreviewBtn').onclick = () => {
    const rows = parseCsv($('#csvPaste').value);
    if (!rows.length) { toast(tr('nothing_to_import'), false); return; }
    const matched = rows.filter((r) => S.people.some((p) => p.name.toLowerCase() === (r.name || '').toLowerCase()));
    $('#csvPreview').innerHTML = `<table><tr><th>${tr('date_label')}</th><th>${tr('th_name')}</th><th>Shift</th><th>${lang === 'id' ? 'Cocok?' : 'Match'}</th></tr>${rows.map((r) => {
      const ok = S.people.some((p) => p.name.toLowerCase() === (r.name || '').toLowerCase());
      return `<tr><td>${esc(r.date || '')}</td><td>${esc(r.name || '')}</td><td>${esc(r.shift || '')}</td><td>${ok ? '✓ matched' : '✗ no such person'}</td></tr>`;
    }).join('')}</table>
    <p>${matched.length} ${tr('matched')} / ${rows.length - matched.length} ${tr('no_such_person')}.</p>
    <p><button class="btn primary" id="csvImportBtn">${tr('import_rows')} ${rows.length}</button></p>`;
    $('#csvImportBtn').onclick = async () => {
      try { const r = await api('/api/shifts/import', 'POST', { rows }); S = r.state; toast(`${tr('import_done')}: ${r.created} ${tr('created_w')}, ${r.replaced} ${tr('replaced_w')}, ${r.skipped} ${tr('skipped_w')}.`); renderAll(); }
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
  $('#view-materials').innerHTML = `<h2>${tr('mat_title')}</h2>
  <p class="muted">${tr('mat_help')}</p>
  ${days.map((d) => {
    const tot = d.lines.reduce((s, l) => ({ i: s.i + l.issuedQty, u: s.u + (l.usedQty || 0), r: s.r + (l.returnedQty || 0) }), { i: 0, u: 0, r: 0 });
    const variance = tot.i - tot.u - tot.r;
    return `<div class="panel"><h3>${esc(d.date)} — ${tr('status_col')}: ${esc(d.status)}${d.status === 'approved' ? ` (${tr('checked_by')} ${esc(personName(d.checkedById))})` : ''}${d.status === 'flagged' ? ` — ${esc(d.checkNote)}` : ''}</h3>
    <table><tr><th>${tr('th_item')}</th><th>${tr('th_issued')}</th><th>${tr('th_used')}</th><th>${tr('th_returned')}</th><th>${tr('th_variance')}</th><th>${tr('th_where')}</th></tr>
    ${d.lines.map((l) => { const v = l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0); return `<tr><td>${esc(l.name)}</td><td>${l.issuedQty} ${esc(l.unit)}</td><td>${l.usedQty ?? '—'}</td><td>${l.returnedQty ?? '—'}</td><td class="${v ? 'var-bad' : 'var-ok'}">${v}</td><td>${esc(l.note || '')}</td></tr>`; }).join('')}
    <tr><td><b>${tr('total')}</b></td><td><b>${tot.i}</b></td><td><b>${tot.u}</b></td><td><b>${tot.r}</b></td><td class="${variance ? 'var-bad' : 'var-ok'}"><b>${variance}</b></td><td></td></tr></table>
    ${d.status === 'open' && a.role === 'cs' ? `<h4>${tr('log_used_h')}</h4>${d.lines.map((l) => `<div><label>${esc(l.name)} — ${tr('th_issued')} ${l.issuedQty} ${esc(l.unit)}</label>
      <input type="number" min="0" step="any" id="used-${l.id}" value="${l.usedQty ?? ''}" placeholder="${tr('th_used')}" style="width:90px">
      <input type="number" min="0" step="any" id="ret-${l.id}" value="${l.returnedQty ?? ''}" placeholder="${tr('th_returned')}" style="width:90px">
      <input type="text" id="note-${l.id}" value="${esc(l.note || '')}" placeholder="${tr('where_ph')}" style="width:260px">
      <button class="btn small" data-log-line="${l.id}" data-day="${d.id}">${tr('save_btn')}</button></div>`).join('')}
      <p><button class="btn primary" data-submit-day="${d.id}">${tr('submit_report')}</button></p>` : ''}
    ${d.status === 'open' && a.role === 'warehouse_manager' ? `<h4>${tr('issue_more_h')}</h4>
      <div><input id="issue-name-${d.id}" list="matNames" placeholder="${tr('item_name_ph')}" style="width:200px"> <input id="issue-qty-${d.id}" type="number" min="0" step="any" placeholder="${tr('qty_ph')}" style="width:80px"> <input id="issue-unit-${d.id}" placeholder="${tr('unit_ph')}" value="pcs" style="width:70px">
      <button class="btn" data-issue-day="${d.id}" data-date="${d.date}">${tr('issued_toast')}</button></div>
      <datalist id="matNames">${S.materialNames.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>` : ''}
    ${d.status === 'submitted' && a.role === 'warehouse_manager' ? `<h4>${tr('check_h')}</h4>
      <p><button class="btn primary" data-check-day="${d.id}" data-decision="approved">${tr('approve_match')}</button>
      <button class="btn danger" data-check-day="${d.id}" data-decision="flagged">${tr('flag_mismatch')}</button></p>` : ''}
    ${d.status === 'submitted' && a.role !== 'warehouse_manager' ? '<p class="muted">${tr(\'submitted_waiting\')}</p>' : ''}
    </div>`;
  }).join('')}
  <div class="panel"><h3>${tr('issue_new_day')}</h3>
    <p class="muted">${tr('issue_new_help')}</p>
    <label>${tr('date_label')} <input type="date" id="newDayDate" value="${todayStr()}"></label>
    <div id="issueLines"><div><input class="il-name" list="matNames" placeholder="${tr('item_name_ph')}"> <input class="il-qty" type="number" min="0" step="any" placeholder="${tr('qty_ph')}"> <input class="il-unit" placeholder="${tr('unit_ph')}" value="pcs"></div></div>
    <p><button class="btn" id="addIssueLine">+ Add line</button> <button class="btn primary" id="submitIssue">Issue morning material</button></p>
  </div>`;
  document.querySelectorAll('[data-log-line]').forEach((b) => b.addEventListener('click', async () => {
    try { S = await api(`/api/material-days/${b.dataset.day}/log`, 'POST', { lineId: Number(b.dataset.logLine), usedQty: Number(document.getElementById('used-' + b.dataset.logLine).value), returnedQty: Number(document.getElementById('ret-' + b.dataset.logLine).value), note: document.getElementById('note-' + b.dataset.logLine).value }); toast(tr('logged')); renderAll(); }
    catch (err) { toast(err.message, false); }
  }));
  document.querySelectorAll('[data-submit-day]').forEach((b) => b.addEventListener('click', async () => {
    try { S = await api(`/api/material-days/${b.dataset.submitDay}/submit`, 'POST', {}); toast(tr('submitted_toast')); renderAll(); }
    catch (err) { toast(err.message, false); }
  }));
  document.querySelectorAll('[data-check-day]').forEach((b) => b.addEventListener('click', async () => {
    const note = b.dataset.decision === 'flagged' ? prompt(tr('flag_prompt')) || '' : '';
    try { S = await api(`/api/material-days/${b.dataset.checkDay}/check`, 'POST', { decision: b.dataset.decision, note }); toast(`${tr('status_label')}: ${b.dataset.decision}.`); renderAll(); }
    catch (err) { toast(err.message, false); }
  }));
  document.querySelectorAll('[data-issue-day]').forEach((b) => b.addEventListener('click', async () => {
    const name = document.getElementById(`issue-name-${b.dataset.issueDay}`).value;
    const qty = Number(document.getElementById(`issue-qty-${b.dataset.issueDay}`).value);
    const unit = document.getElementById(`issue-unit-${b.dataset.issueDay}`).value || 'pcs';
    try { S = await api(`/api/material-days/${b.dataset.date}/issue`, 'POST', { lines: [{ name, qty, unit }] }); toast(tr('issued_toast')); renderAll(); }
    catch (err) { toast(err.message, false); }
  }));
  $('#addIssueLine').onclick = () => {
    const div = document.createElement('div');
    div.innerHTML = `<input class="il-name" list="matNames" placeholder="${tr('item_name_ph')}"> <input class="il-qty" type="number" min="0" step="any" placeholder="${tr('qty_ph')}"> <input class="il-unit" placeholder="${tr('unit_ph')}" value="pcs">`;
    $('#issueLines').appendChild(div);
  };
  $('#submitIssue').onclick = async () => {
    const lines = [...document.querySelectorAll('#issueLines > div')].map((div) => ({
      name: div.querySelector('.il-name').value.trim(),
      qty: Number(div.querySelector('.il-qty').value),
      unit: div.querySelector('.il-unit').value || 'pcs',
    })).filter((l) => l.name && l.qty > 0);
    if (!lines.length) { toast(tr('add_line_required'), false); return; }
    try { S = await api(`/api/material-days/${$('#newDayDate').value}/issue`, 'POST', { lines }); toast(tr('morning_issued')); renderAll(); }
    catch (err) { toast(err.message, false); }
  };
}

// ---- Team ----
function renderTeam() {
  const roles = { head_noc: tRoleDesc('head_noc'), osp: tRoleDesc('osp'), noc: tRoleDesc('noc'), cs: tRoleDesc('cs'), warehouse_manager: tRoleDesc('warehouse_manager'), field_tech: tRoleDesc('field_tech') };
  const byDept = {};
  for (const p of S.people) { (byDept[p.department] = byDept[p.department] || []).push(p); }
  $('#view-team').innerHTML = `<h2>${tr('team_title')}</h2><p class="muted">${tr('team_sub')}</p>` +
    Object.entries(byDept).map(([dept, list]) => `<div class="panel"><h3>${esc(tDept(dept))}</h3><table><tr><th>${tr('th_name')}</th><th>${tr('th_role')}</th><th>${tr('th_can_approve')}</th></tr>${list.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(roles[p.role] || p.role)}</td><td>${tApprove(p.role)}</td></tr>`).join('')}</table></div>`).join('');
}

// ---- Activity ----
function renderActivity() {
  $('#view-activity').innerHTML = `<h2>${tr('activity_title')}</h2><div class="panel"><ul>${S.activity.map((a) => `<li><b>${esc(personName(a.actorId))}</b> — ${esc(a.text)} <span class="muted">(${new Date(a.createdAt).toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB')})</span></li>`).join('')}</ul></div>`;
}

// ---- Task detail modal ----
let openTaskId = null;
let pendingCaption = '';
function openTask(id) {
  if (isWM()) return; // WM has no task views at all.
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
    <p class="muted">${esc(tKind(t.taskKind))} · ${esc(tDept(t.department || ''))} · ${esc(tCol(col.name))} · ${tr('priority_word')}: ${esc(tPri(t.priority))} · ${tr('due_prefix')}: ${esc(t.dueDate || '—')}</p>
    <p>${esc(t.description || '')}</p>
    <p class="muted">${tr('customer_word')}: ${esc(t.customer || '—')} · ${tr('location_label')}: ${esc(t.location || '—')} · ${tr('service_label')}: ${esc(t.serviceId || '—')} · ${tr('dropped_by')}: ${esc(personName(t.createdById))} · ${tr('assigned_to')}: ${esc(personName(t.assigneeId))}</p>
    ${isReview ? (ev.length ? `<div class="okbox">${tr('evidence_attached')}: ${ev.length} ${lang === 'id' ? 'foto' : 'photo(s)'} — ${tr('evidence_review')}</div>`
      : `<div class="warnbox"><b>⚠ ${tr('no_evidence_warn')}</b> ${tr('no_evidence_warn2')}</div>`) : ''}
    ${isReview ? `<p>${canAppr ? `<button class="btn primary" id="approveBtn">${tr('approve_done')}</button>` : `<button class="btn primary" disabled>${tr('approve_done')}</button>`}
    <button class="btn danger" id="rejectBtn" ${canAppr ? '' : 'disabled'}>${tr('reject_back')}</button>
    ${!canAppr ? `<span class="muted">${actor().role === 'osp' ? 'OSP can only approve tasks they dropped themselves.' : 'Only Head NOC (anything) or OSP (own dropped tasks) can approve.'}</span>` : ''}</p>` : ''}
    <p><label>${tr('move_to_label')} <select id="modalMove">${S.columns.map((c) => `<option value="${c.id}" ${c.id === col.id ? 'selected' : ''}>${esc(tCol(c.name))}</option>`).join('')}</select></label></p>
    <h3>${tr('evidence_photos')}</h3>
    <div class="gallery">${ev.map((f) => `<figure style="margin:0"><img src="/api/files/${f.id}" data-lightbox="${f.id}" data-cap="${esc(f.caption || f.name)}" alt="${esc(f.caption || 'evidence')}">
      <figcaption class="muted">${esc(f.caption || f.name)} · ${esc(personName(f.createdById))} · ${new Date(f.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB')}</figcaption></figure>`).join('') || '<p class="muted">${tr(\'no_evidence\')}</p>'}</div>
    <div class="chip-row" id="capChips">${(lang === 'id' ? ['ONT terpasang', 'Hasil speedtest', 'Sebelum/Sesudah', 'ODP terpasang', 'Kabel ditarik'] : ['ONT installed', 'Speedtest result', 'Before/After', 'ODP installed', 'Cable pulled']).map((c) => `<button type="button" data-cap="${c}">${c}</button>`).join('')}</div>
    <p><input type="file" id="evInput" accept="image/*" multiple> <span class="muted">${tr('caption_label')} <b id="capLabel">${tr('caption_blank')}</b> ${tr('caption_hint')}</span></p>
    <h3>${tr('mat_adhoc')}</h3>
    <ul>${t.materials.map((m) => `<li>${esc(m.name)} — ${m.qty} ${esc(m.unit)}${m.serial ? ` · SN ${esc(m.serial)}` : ''} (${esc(m.direction)})${m.note ? ` · ${esc(m.note)}` : ''}</li>`).join('') || '<li class="muted">${tr(\'no_mat_task\')}</li>'}</ul>
    <p><input id="matName" list="matNames2" placeholder="${tr('item_name_ph')}" style="width:180px"> <input id="matQty" type="number" min="0" step="any" placeholder="${tr('qty_ph')}" style="width:80px"> <input id="matUnit" placeholder="${tr('unit_ph')}" value="pcs" style="width:70px"> <input id="matSerial" placeholder="${tr('serial_ph')}" style="width:150px"> <input id="matNote" placeholder="${tr('where_task_ph')}" style="width:220px"> <button class="btn" id="addMatBtn">${tr('add_material')}</button></p>
    <datalist id="matNames2">${S.materialNames.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
    <h3>${tr('files_h')}</h3>
    <ul>${files.map((f) => `<li><a href="/api/files/${f.id}" target="_blank">${esc(f.name)}</a> <button class="btn small" data-del-file="${f.id}">✕</button></li>`).join('') || '<li class="muted">${tr(\'no_files\')}</li>'}</ul>
    <p><input type="file" id="fileInput"> <button class="btn" id="uploadFileBtn">${tr('attach_file')}</button></p>
    <p><button class="btn danger" id="deleteTaskBtn">${tr('delete_task')}</button></p>`;
  $('#taskModal').classList.remove('hidden');
  $('#modalMove').addEventListener('change', async (e) => {
    await moveTask(t.id, Number(e.target.value)); openTask(t.id);
  });
  const appr = $('#approveBtn'); if (appr) appr.onclick = async () => {
    try { S = await api(`/api/tasks/${t.id}/move`, 'POST', { columnId: doneCol().id }); toast(tr('approved_toast')); $('#taskModal').classList.add('hidden'); renderAll(); }
    catch (err) { toast(err.message, false); }
  };
  const rej = $('#rejectBtn'); if (rej) rej.onclick = async () => {
    const reason = prompt(tr('reject_reason')) || '';
    try { S = await api(`/api/tasks/${t.id}/reject`, 'POST', { reason }); toast(tr('rejected_toast')); $('#taskModal').classList.add('hidden'); renderAll(); }
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
    pendingCaption = ''; toast(tr('evidence_added')); openTask(t.id); renderAll();
  });
  $('#fileInput') && $('#uploadFileBtn').addEventListener('click', async () => {
    const f = $('#fileInput').files[0]; if (!f) { toast(tr('pick_file'), false); return; }
    const data = await readAsDataUrl(f);
    try { S = await api(`/api/tasks/${t.id}/files`, 'POST', { name: f.name, mimeType: f.type, data, category: 'file', caption: '' }); toast(tr('file_attached')); openTask(t.id); renderAll(); }
    catch (err) { toast(err.message, false); }
  });
  document.querySelectorAll('[data-del-file]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(tr('del_file_confirm'))) return;
    try { S = await api(`/api/files/${b.dataset.delFile}`, 'DELETE', {}); openTask(t.id); renderAll(); } catch (err) { toast(err.message, false); }
  }));
  $('#addMatBtn').addEventListener('click', async () => {
    const name = $('#matName').value.trim(), qty = Number($('#matQty').value);
    if (!name || !(qty > 0)) { toast(tr('mat_required'), false); return; }
    try { S = await api(`/api/tasks/${t.id}/materials`, 'POST', { name, qty, unit: $('#matUnit').value || 'pcs', serial: $('#matSerial').value, note: $('#matNote').value }); toast(tr('material_added')); openTask(t.id); renderAll(); }
    catch (err) { toast(err.message, false); }
  });
  $('#deleteTaskBtn').addEventListener('click', async () => {
    if (!confirm(tr('del_task_confirm'))) return;
    try { S = await api(`/api/tasks/${t.id}`, 'DELETE', {}); $('#taskModal').classList.add('hidden'); toast(tr('task_deleted')); renderAll(); }
    catch (err) { toast(err.message, false); }
  });
  document.querySelectorAll('[data-lightbox]').forEach((img) => img.addEventListener('click', () => {
    $('#lightboxImg').src = '/api/files/' + img.dataset.lightbox;
    $('#lightboxCap').textContent = img.dataset.cap || '';
    $('#lightbox').classList.remove('hidden');
  }));
}

// ---- New task ----
// columnId is the entry column the button was clicked in (Backlog or To Do);
// a new task is always created there, never in a later column.
function newTaskForm(columnId) {
  const staff = S.people.filter((p) => p.role !== 'field_tech');
  const field = S.people.filter((p) => p.role === 'field_tech');
  $('#taskDetail').innerHTML = `<h2>${tr('new_task_title')}</h2>
    <div class="form-grid">
      <div><label>${tr('title_label')} <input id="ntTitle" style="width:100%"></label></div>
      <div><label>${tr('kind_label')} <select id="ntKind" style="width:100%"><option value="ticket">${tKind('ticket')}</option><option value="project">${tKind('project')}</option><option value="maintenance">${tKind('maintenance')}</option><option value="handover">${tKind('handover')} (${lang === 'id' ? 'shift berikutnya' : 'oncoming shift'})</option><option value="reminder">${tKind('reminder')} (${lang === 'id' ? 'pemeliharaan/proyek mendatang' : 'future maintenance/project'})</option></select></label></div>
      <div><label>${tr('dept_label')} <select id="ntDept" style="width:100%">${[...new Set(S.people.map((p) => p.department))].map((d) => `<option value="${esc(d)}">${esc(tDept(d))}</option>`).join('')}</select></label></div>
      <div><label>${tr('priority_label')} <select id="ntPri" style="width:100%"><option value="normal">${tPri('normal')}</option><option value="high">${tPri('high')}</option><option value="urgent">${tPri('urgent')}</option></select></label></div>
      <div><label>${tr('assign_label')} <select id="ntAssignee" style="width:100%"><option value="">${tr('unassigned')}</option><optgroup label="${tr('staff_group')}">${staff.map((p) => `<option value="${p.id}">${esc(p.name)} (${esc(p.department)})</option>`).join('')}</optgroup><optgroup label="${tr('field_group')}">${field.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup></select></label></div>
      <div><label>${tr('due_label')} <input id="ntDue" type="date" style="width:100%"></label></div>
      <div><label>${tr('customer_label')} <input id="ntCust" style="width:100%"></label></div>
      <div><label>${tr('location_label')} <input id="ntLoc" style="width:100%"></label></div>
      <div><label>${tr('service_label')} <input id="ntSvc" style="width:100%"></label></div>
    </div>
    <label>${tr('desc_label')} <textarea id="ntDesc" rows="3" style="width:100%"></textarea></label>
    <p><button class="btn primary" id="ntCreate">${tr('create_task')}</button></p>`;
  $('#taskModal').classList.remove('hidden');
  $('#ntCreate').onclick = async () => {
    const title = $('#ntTitle').value.trim();
    if (!title) { toast(tr('title_required'), false); return; }
    try {
      S = await api('/api/tasks', 'POST', { title, taskKind: $('#ntKind').value, department: $('#ntDept').value, priority: $('#ntPri').value, assigneeId: $('#ntAssignee').value ? Number($('#ntAssignee').value) : null, dueDate: $('#ntDue').value || null, customer: $('#ntCust').value, location: $('#ntLoc').value, serviceId: $('#ntSvc').value, description: $('#ntDesc').value, columnId: columnId || null });
      $('#taskModal').classList.add('hidden'); toast(tr('task_created')); switchView('board');
    } catch (err) { toast(err.message, false); }
  };
}

// ---- Init ----
document.querySelectorAll('#nav button').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
const _le = document.getElementById('langEn'); if (_le) _le.addEventListener('click', () => setLang('en'));
const _li = document.getElementById('langId'); if (_li) _li.addEventListener('click', () => setLang('id'));
const _tt = document.getElementById('themeToggle'); if (_tt) _tt.addEventListener('click', () => setTheme(theme === 'dark' ? 'light' : 'dark'));
applyTheme();
document.documentElement.lang = lang === 'id' ? 'id' : 'en';
if (_le) _le.classList.toggle('active', lang === 'en');
if (_li) _li.classList.toggle('active', lang === 'id');
$('#actorSelect').addEventListener('change', (e) => { actorId = Number(e.target.value); localStorage.setItem('actorId', String(actorId)); refresh(); });
$('#closeModal').addEventListener('click', () => $('#taskModal').classList.add('hidden'));
$('#closeLightbox').addEventListener('click', () => $('#lightbox').classList.add('hidden'));
$('#taskModal').addEventListener('click', (e) => { if (e.target.id === 'taskModal') $('#taskModal').classList.add('hidden'); });
$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') $('#lightbox').classList.add('hidden'); });
$('#addColBtn').addEventListener('click', async () => {
  const name = prompt(tr('new_col_name')); if (!name) return;
  try { S = await api('/api/columns', 'POST', { name }); renderAll(); } catch (err) { toast(err.message, false); }
});
$('#boardFilter').addEventListener('input', () => { if (currentView === 'board') renderBoard(); });
refresh().catch((err) => { document.getElementById('main').innerHTML = '<p>' + esc(tr('failed_load')) + esc(err.message) + '</p>'; });
