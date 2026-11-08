// Team Management Dashboard — React frontend (v2.0.0).
// Same API, same data, same features as the vanilla frontend it replaces:
// Overview, Kanban, To-Do, Calendar + shift import, Materials daily cycle,
// Team, Activity, evidence photos, EN/ID + dark/light toggles, "Acting as".
// All rules are enforced server-side; the UI only reflects them.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fetchState } from './api';
import {
  tr, tCol, tPri, tKind, tDept, tRole, tStatus, isEntryColumn, todayStr, ydayStr,
  type Lang, type State, type Task,
} from './lib';
import { CalendarView, MaterialsView, type ViewCtx } from './CalendarMaterials';
import { TeamView, ActivityView } from './TeamActivity';
import { TaskDetail, NewTaskForm, type ModalCtx } from './TaskModal';

type View = 'overview' | 'board' | 'todo' | 'calendar' | 'materials' | 'team' | 'activity';
const VIEWS: View[] = ['overview', 'board', 'todo', 'calendar', 'materials', 'team', 'activity'];

function loadLang(): Lang {
  try { const l = localStorage.getItem('tmd-lang'); if (l === 'en' || l === 'id') return l; } catch { /* ignore */ }
  return 'en';
}
function loadTheme(): 'light' | 'dark' {
  try { const t = localStorage.getItem('tmd-theme'); if (t === 'dark' || t === 'light') return t; } catch { /* ignore */ }
  return 'light';
}

export default function App() {
  const [S, setS] = useState<State | null>(null);
  const [loadError, setLoadError] = useState('');
  const [actorId, setActorId] = useState(() => { try { return Number(localStorage.getItem('actorId') || 1); } catch { return 1; } });
  const [lang, setLangState] = useState<Lang>(loadLang);
  const [theme, setThemeState] = useState<'light' | 'dark'>(loadTheme);
  const [view, setViewState] = useState<View>('overview');
  const [boardFilter, setBoardFilter] = useState('');
  const [modal, setModal] = useState<{ kind: 'task'; id: number } | { kind: 'new'; columnId: number | null } | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const modalRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<Element | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const prevViewRef = useRef<View | null>(null);

  const toast = useCallback((text: string, ok = true) => {
    setToastMsg({ text, ok });
    window.clearTimeout(toastTimer.current);
    // Success toasts auto-dismiss; error toasts stay until dismissed, so
    // the message cannot vanish before anyone has read it.
    if (ok) toastTimer.current = window.setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const refresh = useCallback(async (actor: number) => {
    const s = await fetchState(actor);
    setS(s);
    return s;
  }, []);

  useEffect(() => {
    refresh(actorId).catch((e: any) => setLoadError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { document.documentElement.lang = lang === 'id' ? 'id' : 'en'; }, [lang]);

  // A view change is a client-side route change: say so in the title and
  // move focus to the new view, so keyboard and screen-reader users land
  // in the content instead of staying on the nav button they pressed.
  // Focus moves only when the view actually changes — never on first load
  // or on a language switch.
  useEffect(() => {
    if (!S) return;
    const shown: View = S.people.find((p) => p.id === actorId)?.role === 'warehouse_manager' ? 'materials' : view;
    document.title = `Team Management Dashboard · ${tr(lang, 'nav_' + shown)}`;
    if (prevViewRef.current !== null && prevViewRef.current !== shown) mainRef.current?.focus();
    prevViewRef.current = shown;
  }, [S, view, lang, actorId]);

  // Dialog behaviour for the task / new-task modal: focus inside on open,
  // Escape closes, focus returns to whatever opened it.
  useEffect(() => {
    if (!modal) return;
    prevFocusRef.current = document.activeElement;
    modalRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      (prevFocusRef.current as HTMLElement | null)?.focus?.();
    };
  }, [modal]);

  if (!S) {
    return <main>
      {loadError
        ? <><p>{tr(lang, 'failed_load')}{loadError}</p>
          <p><button className="btn primary" onClick={() => { setLoadError(''); refresh(actorId).catch((e: any) => setLoadError(e.message)); }}>{tr(lang, 'retry')}</button></p></>
        : <p>Loading dashboard…</p>}
    </main>;
  }

  const actor = S.people.find((p) => p.id === actorId) || S.people[0];
  const isWM = actor.role === 'warehouse_manager';
  const currentView: View = isWM ? 'materials' : view;
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const colById = (id: number) => S.columns.find((c) => c.id === id);
  const canApproveTask = (t: Task) => actor.role === 'head_noc' || (actor.role === 'osp' && t.createdById === actor.id);

  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('tmd-lang', l); } catch { /* ignore */ } };
  const setTheme = (t: 'light' | 'dark') => { setThemeState(t); try { localStorage.setItem('tmd-theme', t); } catch { /* ignore */ } };
  const switchView = (v: View) => setViewState(isWM ? 'materials' : v);

  const moveTask = async (id: number, columnId: number) => {
    const t = S.tasks.find((x) => x.id === id); if (!t) return;
    const col = colById(columnId); if (!col) return;
    if (col.kind === 'done' && !canApproveTask(t)) {
      toast(lang === 'id'
        ? 'Hanya Head NOC (apa pun) atau OSP (tugas yang dibuatnya sendiri) yang bisa menyetujui tugas ke Selesai.'
        : 'Only Head NOC (anything) or OSP (own dropped tasks) can approve a task to Done.', false);
      return;
    }
    try {
      const s = await api(`/api/tasks/${id}/move`, 'POST', { columnId }, actorId);
      setS(s); toast(`“${t.title}” → ${tCol(lang, col.name)}`);
    } catch (e: any) { toast(e.message, false); }
  };

  const openTask = (id: number) => { if (!isWM) setModal({ kind: 'task', id }); };

  const viewCtx: ViewCtx = {
    S, lang, actorId, setState: setS, toast, openTask,
  };
  const modalTask = modal?.kind === 'task' ? S.tasks.find((t) => t.id === modal.id) : undefined;
  const modalCtx: ModalCtx = {
    S, lang, actorId, setState: setS, toast, moveTask,
    close: () => setModal(null),
    afterDelete: () => { refresh(actorId).catch(() => undefined); },
  };

  return (
    <div>
      <a className="skip-link" href="#main">{tr(lang, 'skip_to_content')}</a>
      <header className="topbar">
        <div>
          <h1>Team Management Dashboard</h1>
          <p className="sub">{tr(lang, 'subtitle')}</p>
        </div>
        <div className="actor">
          <div className="lang-toggle" role="group" aria-label="Language / Bahasa">
            <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button type="button" className={lang === 'id' ? 'active' : ''} onClick={() => setLang('id')}>ID</button>
          </div>
          <button type="button" className="theme-toggle" aria-label="Toggle dark / light mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? tr(lang, 'theme_light') : tr(lang, 'theme_dark')}
          </button>
          <label htmlFor="actorSelect">{tr(lang, 'acting_as')}</label>
          <select id="actorSelect" value={actorId} onChange={(e) => {
            const id = Number(e.target.value); setActorId(id);
            try { localStorage.setItem('actorId', String(id)); } catch { /* ignore */ }
            refresh(id).catch((err: any) => toast(err.message, false));
          }}>
            {S.people.filter((p) => p.active && p.role !== 'field_tech').map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {tDept(lang, p.department)}</option>
            ))}
          </select>
          <span className="role-pill">{tDept(lang, actor.department)} · {tRole(lang, actor.role)}</span>
          <span className="demo-badge">{tr(lang, 'demo_badge')}</span>
        </div>
      </header>
      <nav className="nav" id="nav">
        {VIEWS.map((v) => (
          (!isWM || v === 'materials') && (
            <button key={v} data-view={v} className={currentView === v ? 'active' : ''} onClick={() => switchView(v)}>
              {tr(lang, 'nav_' + v)}
            </button>
          )
        ))}
      </nav>
      <main id="main" ref={mainRef} tabIndex={-1}>
        {currentView === 'overview' && <Overview S={S} lang={lang} openTask={openTask} />}
        {currentView === 'board' && (
          <section>
            <div className="board-toolbar">
              <button className="btn" onClick={async () => {
                const name = window.prompt(tr(lang, 'new_col_name')); if (!name) return;
                try { const s = await api('/api/columns', 'POST', { name }, actorId); setS(s); } catch (e: any) { toast(e.message, false); }
              }}>{tr(lang, 'add_column')}</button>
              <label className="sr-only" htmlFor="board-filter">{tr(lang, 'filter_ph')}</label><input id="board-filter" className="filter" aria-label={tr(lang, 'filter_ph')} placeholder={tr(lang, 'filter_ph')} value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)} />
            </div>
            <Board S={S} lang={lang} filter={boardFilter} openTask={openTask} moveTask={moveTask} newTask={(colId) => setModal({ kind: 'new', columnId: colId })} toast={toast} setState={setS} actorId={actorId} />
          </section>
        )}
        {currentView === 'todo' && <Todo S={S} lang={lang} openTask={openTask} />}
        {currentView === 'calendar' && <CalendarView ctx={viewCtx} />}
        {currentView === 'materials' && <MaterialsView ctx={viewCtx} />}
        {currentView === 'team' && <TeamView S={S} lang={lang} />}
        {currentView === 'activity' && <ActivityView S={S} lang={lang} />}
      </main>

      {modal && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={modal.kind === 'task' ? (modalTask?.title || tr(lang, 'new_task_title')) : tr(lang, 'new_task_title')} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-card" ref={modalRef} tabIndex={-1}>
            <button className="modal-close" aria-label={tr(lang, 'close_dialog')} onClick={() => setModal(null)}>✕</button>
            {modal.kind === 'task' && modalTask
              ? <TaskDetail key={modalTask.id + '-' + modalTask.files.length + '-' + modalTask.materials.length} task={modalTask} ctx={modalCtx} />
              : modal.kind === 'task' ? <p className="muted">Task not found.</p>
              : <NewTaskForm columnId={modal.columnId} ctx={modalCtx} />}
          </div>
        </div>
      )}
      <div role="status" aria-live="polite">
        {toastMsg && <div className={`toast${toastMsg.ok ? '' : ' error'}`}>{toastMsg.text}
          {!toastMsg.ok && <button type="button" aria-label={tr(lang, 'dismiss')} onClick={() => setToastMsg(null)}>✕</button>}
        </div>}
      </div>
    </div>
  );
}

// ---- Overview ----
function Overview({ S, lang, openTask }: { S: State; lang: Lang; openTask: (id: number) => void }) {
  const t = todayStr(), y = ydayStr();
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const colById = (id: number) => S.columns.find((c) => c.id === id);
  const doneY = S.tasks.filter((x) => x.completedAt && x.completedAt.slice(0, 10) === y);
  const dueT = S.tasks.filter((x) => x.dueDate === t && colById(x.columnId)?.kind !== 'done');
  const overdue = S.tasks.filter((x) => x.dueDate && x.dueDate < t && colById(x.columnId)?.kind !== 'done');
  const matY = S.materialDays.find((d) => d.date === y);
  const usedY = matY ? matY.lines.reduce((s, l) => s + (l.usedQty || 0), 0) : 0;
  const onShift = S.shifts.filter((s) => s.date === t);
  const attention = S.tasks.filter((x) => colById(x.columnId)?.kind === 'review');
  return (
    <div>
      <h2>{tr(lang, 'overview_title')}</h2>
      <p className="muted">{y} → {t} · {tr(lang, 'overview_sub')}</p>
      <div className="cards">
        <div className="card ok"><div className="big">{doneY.length}</div><div className="label">{tr(lang, 'done_yesterday')}</div></div>
        <div className="card"><div className="big">{dueT.length}</div><div className="label">{tr(lang, 'due_today')}</div></div>
        <div className={`card ${overdue.length ? 'warn' : ''}`}><div className="big">{overdue.length}</div><div className="label">{tr(lang, 'overdue')}</div></div>
        <div className="card"><div className="big">{usedY}</div><div className="label">{tr(lang, 'mat_used_yday')}</div></div>
        <div className="card"><div className="big">{onShift.length}</div><div className="label">{tr(lang, 'on_shift_today')}</div></div>
        <div className={`card ${attention.length ? 'warn' : ''}`}><div className="big">{attention.length}</div><div className="label">{tr(lang, 'needs_attention')}</div></div>
      </div>
      <div className="panel"><h3>{tr(lang, 'done_yesterday_h')}</h3>
        {doneY.length ? <ul>{doneY.map((x) => <li key={x.id}>{x.title} · {personName(x.assigneeId)}</li>)}</ul> : <p className="muted">{tr(lang, 'nothing_done_yday')}</p>}
      </div>
      <div className="panel"><h3>{tr(lang, 'due_today_h')}</h3>
        {dueT.length ? <ul>{dueT.map((x) => <li key={x.id}><button type="button" className="linklike" onClick={() => openTask(x.id)}>{x.title}</button> · {personName(x.assigneeId)} · {x.location || ''}</li>)}</ul> : <p className="muted">{tr(lang, 'nothing_due_today')}</p>}
        {overdue.length > 0 && <><h3>{tr(lang, 'overdue_h')}</h3><ul>{overdue.map((x) => <li key={x.id}>{x.title} · {tr(lang, 'due_prefix')} {x.dueDate}</li>)}</ul></>}
      </div>
      <div className="panel"><h3>{tr(lang, 'onboard_h')} ({t})</h3>
        {onShift.length ? <ul>{onShift.map((s) => <li key={s.id}>{personName(s.personId)} · {s.shiftName} {s.startTime}–{s.endTime} ({tDept(lang, s.department)})</li>)}</ul> : <p className="muted">{tr(lang, 'no_shifts_today')}</p>}
      </div>
      <div className="panel"><h3>{tr(lang, 'mat_out_yday')}</h3>
        {matY ? <>
          <div className="table-wrap"><table><thead><tr><th>{tr(lang, 'th_item')}</th><th>{tr(lang, 'th_issued')}</th><th>{tr(lang, 'th_used')}</th><th>{tr(lang, 'th_returned')}</th><th>{tr(lang, 'th_variance')}</th><th>{tr(lang, 'th_where')}</th></tr></thead>
            <tbody>{matY.lines.map((l) => { const v = l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0); return (
              <tr key={l.id}><td>{l.name}</td><td>{l.issuedQty} {l.unit}</td><td>{l.usedQty ?? '–'}</td><td>{l.returnedQty ?? '–'}</td><td className={v ? 'var-bad' : 'var-ok'}>{v}</td><td>{l.note || ''}</td></tr>
            ); })}</tbody></table></div>
          <p className="muted">{tr(lang, 'status_label')}: {tStatus(lang, matY.status)}{matY.status === 'approved' ? ' ' + tr(lang, 'by_label') + ' ' + personName(matY.checkedById) : ''}</p>
        </> : <p className="muted">{tr(lang, 'no_mat_yday')}</p>}
      </div>
    </div>
  );
}

// ---- Kanban ----
function TaskCard({ task, S, lang, openTask, moveTask }: { task: Task; S: State; lang: Lang; openTask: (id: number) => void; moveTask: (id: number, columnId: number) => Promise<void> }) {
  const ev = task.files.filter((f) => f.category === 'evidence').length;
  const col = S.columns.find((c) => c.id === task.columnId)!;
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  return (
    <div className="task" draggable data-id={task.id} tabIndex={0} role="button" aria-label={task.title}
      onClick={(e) => { if ((e.target as HTMLElement).closest('select,input,button,textarea')) return; openTask(task.id); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTask(task.id); } }}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}>
      <div className="t">{task.title}</div>
      <div className="m">{task.customer || task.location || ''}</div>
      <div className="m">
        <span className={`pill ${task.priority === 'high' || task.priority === 'urgent' ? task.priority : ''}`}>{tPri(lang, task.priority)}</span>
        <span className="pill">{tKind(lang, task.taskKind)}</span>
        {task.dueDate ? <span>{tr(lang, 'due_prefix')} {task.dueDate}</span> : null}
      </div>
      <div className="m">{personName(task.assigneeId)} · {task.department || ''}</div>
      {ev > 0 && <div className="badge-cam">📷 {ev} {lang === 'id' ? 'foto bukti' : 'evidence'}</div>}
      <div className="m">
        <select className="move-to" aria-label={tr(lang, 'move_to_label')} value="" onChange={(e) => { if (e.target.value) moveTask(task.id, Number(e.target.value)); }} onClick={(e) => e.stopPropagation()}>
          <option value="">{tr(lang, 'move_to')}</option>
          {S.columns.map((c) => <option key={c.id} value={c.id} disabled={c.id === col.id}>{tCol(lang, c.name)}</option>)}
        </select>
      </div>
    </div>
  );
}

function Board({ S, lang, filter, openTask, moveTask, newTask, toast, setState, actorId }: {
  S: State; lang: Lang; filter: string; openTask: (id: number) => void;
  moveTask: (id: number, columnId: number) => Promise<void>;
  newTask: (columnId: number) => void; toast: (msg: string, ok?: boolean) => void;
  setState: (s: State) => void; actorId: number;
}) {
  const q = filter.toLowerCase();
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const tasks = S.tasks.filter((t) => !q || [t.title, t.customer, t.location, t.serviceId, personName(t.assigneeId)].join(' ').toLowerCase().includes(q));
  return (
    <div className="board">
      {S.columns.map((c) => {
        const list = tasks.filter((t) => t.columnId === c.id);
        return (
          <div key={c.id} className="column" data-col={c.id}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
            onDrop={async (e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); await moveTask(Number(e.dataTransfer.getData('text/plain')), c.id); }}>
            <h3>{tCol(lang, c.name)} ({list.length})
              <span>
                <button className="btn small" aria-label={tr(lang, 'rename_column')} onClick={async (e) => {
                  e.stopPropagation();
                  const name = window.prompt(tr(lang, 'rename_col'), c.name); if (!name) return;
                  try { const s = await api(`/api/columns/${c.id}`, 'PATCH', { name }, actorId); setState(s); } catch (err: any) { toast(err.message, false); }
                }}>✎</button>{' '}
                <button className="btn small" aria-label={tr(lang, 'delete_column')} onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm(tr(lang, 'del_col_confirm'))) return;
                  try { const s = await api(`/api/columns/${c.id}`, 'DELETE', {}, actorId); setState(s); } catch (err: any) { toast(err.message, false); }
                }}>✕</button>
              </span>
            </h3>
            {list.length ? list.map((t) => <TaskCard key={t.id} task={t} S={S} lang={lang} openTask={openTask} moveTask={moveTask} />) : <p className="muted">{tr(lang, 'empty_col')}</p>}
            {isEntryColumn(c) && <button className="btn primary" onClick={() => newTask(c.id)}>{tr(lang, 'new_task')}</button>}
          </div>
        );
      })}
    </div>
  );
}

// ---- To-Do ----
function Todo({ S, lang, openTask }: { S: State; lang: Lang; openTask: (id: number) => void }) {
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const colById = (id: number) => S.columns.find((c) => c.id === id);
  const groups: Record<string, Task[]> = {};
  for (const t of S.tasks) { const k = personName(t.assigneeId); (groups[k] = groups[k] || []).push(t); }
  return (
    <div>
      <h2>{tr(lang, 'todo_title')}</h2><p className="muted">{tr(lang, 'todo_sub')}</p>
      {Object.entries(groups).map(([who, list]) => (
        <div key={who} className="panel"><h3>{who}</h3>
          <ul>{list.map((t) => <li key={t.id}>
            <button type="button" className="linklike" onClick={() => openTask(t.id)}>{t.title}</button> · {colById(t.columnId) ? tCol(lang, colById(t.columnId)!.name) : ''}
            {t.dueDate ? ` · ${tr(lang, 'due_prefix')} ${t.dueDate}` : ''} <span className={`pill ${t.priority === 'high' || t.priority === 'urgent' ? t.priority : ''}`}>{tPri(lang, t.priority)}</span>
          </li>)}</ul>
        </div>
      ))}
    </div>
  );
}
