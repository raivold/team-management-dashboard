// Shared types + i18n, ported verbatim from public/app.js (v1.7.0).
// Proper names, ticket/customer/material names are never translated.
export type Lang = 'en' | 'id';
export type Theme = 'light' | 'dark';
export interface Person { id:number; name:string; department:string; role:string; active:number }
export interface Column { id:number; name:string; kind:string; sortOrder:number }
export interface TaskMaterial { id:number; taskId:number; name:string; qty:number; unit:string; serial:string; direction:string; note:string; createdById:number; createdAt:string }
export interface TaskFile { id:number; taskId:number; name:string; mimeType:string; size:number; category:string; caption:string; createdById:number; createdAt:string }
export interface Task { id:number; title:string; description:string; customer:string; location:string; serviceId:string; priority:string; dueDate:string|null; department:string; taskKind:string; assigneeId:number|null; createdById:number|null; columnId:number; completedAt:string|null; createdAt:string; updatedAt:string; materials:TaskMaterial[]; files:TaskFile[] }
export interface Shift { id:number; personId:number; date:string; shiftName:string; startTime:string; endTime:string; department:string; notes:string }
export interface DailyLine { id:number; dayId:number; name:string; unit:string; issuedQty:number; usedQty:number|null; returnedQty:number|null; note:string }
export interface MaterialDay { id:number; date:string; status:string; issuedById:number|null; submittedById:number|null; checkedById:number|null; checkNote:string; lines:DailyLine[] }
export interface ActivityItem { id:number; actorId:number|null; taskId:number|null; text:string; createdAt:string }
export interface State { people:Person[]; columns:Column[]; tasks:Task[]; shifts:Shift[]; materialDays:MaterialDay[]; activity:ActivityItem[]; materialNames:string[] }

export const I18N = {
en: {
  nav_overview:'Overview', nav_board:'Kanban', nav_todo:'To-Do', nav_calendar:'Calendar', nav_materials:'Materials', nav_team:'Team', nav_activity:'Activity',
  acting_as:'Acting as', demo_badge:'Prototype · demo data',
  theme_dark:'🌙 Dark mode', theme_light:'☀️ Light mode',
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
  add_line:'+ Add line', issue_morning:'Issue morning material', issue_btn:'Issue',
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
  theme_dark:'🌙 Mode gelap', theme_light:'☀️ Mode terang',
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
  add_line:'+ Tambah baris', issue_morning:'Keluarkan material pagi', issue_btn:'Keluarkan',
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

export const tr = (lang:Lang, k:string):string => (I18N[lang] && (I18N[lang] as any)[k]) || (I18N.en as any)[k] || k;
const COL_NAMES: Record<string,[string,string]> = { 'Backlog':['Backlog','Backlog'], 'To Do':['To Do','Yang Harus Dikerjakan'], 'In Progress':['In Progress','Sedang Dikerjakan'], 'Waiting':['Waiting','Menunggu'], 'Pending Approval':['Pending Approval','Menunggu Persetujuan'], 'Done':['Done','Selesai'] };
export const tCol = (lang:Lang, name:string) => (COL_NAMES[name] ? COL_NAMES[name][lang === 'id' ? 1 : 0] : name);
export const tPri = (lang:Lang, p:string) => ({ normal:['Normal','Normal'], high:['High','Tinggi'], urgent:['Urgent','Mendesak'] } as any)[p]?.[lang === 'id' ? 1 : 0] || p;
export const tKind = (lang:Lang, k:string) => ({ ticket:['Ticket','Tiket'], project:['Project','Proyek'], maintenance:['Maintenance','Pemeliharaan'], handover:['Handover','Serah Terima'], reminder:['Reminder','Pengingat'] } as any)[k]?.[lang === 'id' ? 1 : 0] || k;
export const tDept = (lang:Lang, d:string) => ({ 'Head NOC':['Head NOC','Kepala NOC'], 'Customer Service':['Customer Service','Layanan Pelanggan'], 'Warehouse':['Warehouse','Gudang'], 'Field':['Field','Lapangan'] } as any)[d]?.[lang === 'id' ? 1 : 0] || d;
export const tRole = (lang:Lang, r:string) => ({ head_noc:['head noc','Kepala NOC'], osp:['osp','OSP'], noc:['noc','NOC'], cs:['cs','Layanan Pelanggan'], warehouse_manager:['warehouse manager','Manajer Gudang'], field_tech:['field tech','teknisi lapangan'] } as any)[r]?.[lang === 'id' ? 1 : 0] || r;
export const tRoleDesc = (lang:Lang, r:string) => ({
  head_noc: ['Head NOC — approves anything', 'Kepala NOC — menyetujui apa pun'],
  osp: ['OSP — drops projects, approves only own dropped tasks', 'OSP — membuat proyek, hanya menyetujui tugas yang dibuatnya sendiri'],
  noc: ['NOC — monitors, assigns, creates handover / reminder tasks', 'NOC — memantau, menugaskan, membuat tugas serah terima / pengingat'],
  cs: ['Customer Service — logs daily material', 'Layanan Pelanggan — mencatat material harian'],
  warehouse_manager: ['Warehouse Manager — issues + checks material', 'Manajer Gudang — mengeluarkan + memeriksa material'],
  field_tech: ['Field technician — assignee only, no login', 'Teknisi lapangan — hanya penanggung jawab, tanpa login'],
} as any)[r]?.[lang === 'id' ? 1 : 0] || r;
export const tApprove = (lang:Lang, r:string) => ({ head_noc:['Anything','Apa pun'], osp:['Own dropped tasks only','Hanya tugas yang dibuat sendiri'] } as any)[r]?.[lang === 'id' ? 1 : 0] || (lang==='id'?'Tidak':'No');
export const tStatus = (lang:Lang, s:string) => ({ open:['open','Terbuka'], submitted:['submitted','Terkirim'], approved:['approved','Disetujui'], flagged:['flagged','Ditandai'] } as any)[s]?.[lang === 'id' ? 1 : 0] || s;
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const ydayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
export const isEntryColumn = (c:Column|null|undefined) => !!c && ['backlog','to do'].includes(String(c.name||'').trim().toLowerCase());
export const CAPTIONS_EN = ['ONT installed','Speedtest result','Before/After','ODP installed','Cable pulled'];
export const CAPTIONS_ID = ['ONT terpasang','Hasil speedtest','Sebelum/Sesudah','ODP terpasang','Kabel ditarik'];
