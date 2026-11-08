// Calendar (+ shift import) and Materials daily cycle — ported from public/app.js.
import { useMemo, useState } from 'react';
import { api } from './api';
import {
  tr, tCol, tDept, tStatus, todayStr,
  type Lang, type MaterialDay, type State,
} from './lib';

export interface ViewCtx {
  S: State; lang: Lang; actorId: number;
  setState: (s: State) => void;
  toast: (msg: string, ok?: boolean) => void;
  openTask: (id: number) => void;
}

export function parseCsv(text: string) {
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

export function CalendarView({ ctx }: { ctx: ViewCtx }) {
  const { S, lang } = ctx;
  const [cursor, setCursor] = useState(() => new Date());
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const personName = (id: number) => S.people.find((p) => p.id === id)?.name || '—';
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const first = new Date(y, m, 1), daysIn = new Date(y, m + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7;
  const monthName = first.toLocaleString(lang === 'id' ? 'id-ID' : 'en', { month: 'long', year: 'numeric' });
  const dows = lang === 'id' ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const cells: { ds: string; d: number }[] = [];
  for (let d = 1; d <= daysIn; d++) cells.push({ ds: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, d });
  const dayShifts = day ? S.shifts.filter((s) => s.date === day) : [];
  const dayDue = day ? S.tasks.filter((t) => t.dueDate === day) : [];
  return (
    <div>
      <h2>{tr(lang, 'cal_title')} — {monthName}</h2>
      <p>
        <button className="btn" onClick={() => setCursor(new Date(y, m - 1, 1))}>{tr(lang, 'prev')}</button>{' '}
        <button className="btn" onClick={() => setCursor(new Date(y, m + 1, 1))}>{tr(lang, 'next')}</button>{' '}
        <button className="btn" onClick={() => setCursor(new Date())}>{tr(lang, 'today_btn')}</button>
      </p>
      <div className="cal">
        {dows.map((d) => <div key={d} className="dow">{d}</div>)}
        {Array.from({ length: startDow }).map((_, i) => <div key={'e' + i} />)}
        {cells.map(({ ds, d }) => {
          const due = S.tasks.filter((t) => t.dueDate === ds);
          const sh = S.shifts.filter((s) => s.date === ds);
          return (
            <div key={ds} className={`day ${ds === todayStr() ? 'today' : ''}`} tabIndex={0} role="button" aria-label={ds}
              onClick={() => setDay(ds)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDay(ds); } }}>
              <b>{d}</b>
              {due.map((t) => <div key={t.id}>📌 <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); ctx.openTask(t.id); }}>{t.title.slice(0, 28)}</a></div>)}
              {sh.map((s) => <div key={s.id}>🕐 {personName(s.personId)} ({s.shiftName})</div>)}
            </div>
          );
        })}
      </div>
      <div className="panel">
        <h3>{tr(lang, 'shift_import')}</h3>
        <p className="muted">{tr(lang, 'shift_import_help')}</p>
        <p><a className="btn" href="/api/shifts/template.csv">{tr(lang, 'download_template')}</a></p>
        <p><input type="file" accept=".csv,text/csv" aria-label={tr(lang, 'shift_import')} onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const r = new FileReader(); r.onload = () => setPaste(String(r.result)); r.readAsText(f);
        }} /></p>
        <textarea rows={4} style={{ width: '100%' }} aria-label={tr(lang, 'shift_import')} placeholder="2026-11-08,Bima Prasetyo,Pagi,07:00,15:00,NOC," value={paste} onChange={(e) => setPaste(e.target.value)} />
        <p><button className="btn primary" onClick={() => {
          const rows = parseCsv(paste);
          if (!rows.length) { ctx.toast(tr(lang, 'nothing_to_import'), false); return; }
          setPreview(rows);
        }}>{tr(lang, 'preview_import')}</button></p>
        {preview && (() => {
          const matched = preview.filter((r) => S.people.some((p) => p.name.toLowerCase() === (r.name || '').toLowerCase()));
          return (
            <div>
              <div className="table-wrap"><table><thead><tr><th>{tr(lang, 'date_label')}</th><th>{tr(lang, 'th_name')}</th><th>Shift</th><th>{lang === 'id' ? 'Cocok?' : 'Match'}</th></tr></thead>
                <tbody>{preview.map((r, i) => {
                  const ok = S.people.some((p) => p.name.toLowerCase() === (r.name || '').toLowerCase());
                  return <tr key={i}><td>{r.date}</td><td>{r.name}</td><td>{r.shift}</td><td>{ok ? tr(lang, 'match_ok') : tr(lang, 'match_no')}</td></tr>;
                })}</tbody></table></div>
              <p>{matched.length} {tr(lang, 'matched')} / {preview.length - matched.length} {tr(lang, 'no_such_person')}.</p>
              <p><button className="btn primary" onClick={async () => {
                try {
                  const r = await api('/api/shifts/import', 'POST', { rows: preview }, ctx.actorId);
                  ctx.setState(r.state); ctx.toast(`${tr(lang, 'import_done')}: ${r.created} ${tr(lang, 'created_w')}, ${r.replaced} ${tr(lang, 'replaced_w')}, ${r.skipped} ${tr(lang, 'skipped_w')}.`); setPreview(null);
                } catch (e: any) { ctx.toast(e.message, false); }
              }}>{tr(lang, 'import_rows')} {preview.length}</button></p>
            </div>
          );
        })()}
      </div>
      <div className="panel">
        <h3>{tr(lang, 'onboard_pick')}</h3><p className="muted">{tr(lang, 'click_day')}</p>
        {day && <div>
          <h4>{day}</h4>
          <p><b>{tr(lang, 'on_shift')}:</b> {dayShifts.length ? dayShifts.map((s) => `${personName(s.personId)} — ${s.shiftName} ${s.startTime}–${s.endTime}`).join(', ') : tr(lang, 'nobody')}</p>
          <p><b>{tr(lang, 'tasks_due')}:</b> {dayDue.length ? dayDue.map((t) => t.title).join(', ') : tr(lang, 'none')}</p>
        </div>}
      </div>
    </div>
  );
}

export function MaterialsView({ ctx }: { ctx: ViewCtx }) {
  const { S, lang } = ctx;
  const actor = S.people.find((p) => p.id === ctx.actorId) || S.people[0];
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '—';
  const days = useMemo(() => [...S.materialDays].sort((a, b) => b.date.localeCompare(a.date)), [S.materialDays]);
  const [newDayDate, setNewDayDate] = useState(todayStr());
  const [issueLines, setIssueLines] = useState([{ name: '', qty: '', unit: 'pcs' }]);

  // The daily report lives in the app today; Warehouse also needs it outside
  // the app (archive, forward to a manager). Client-side CSV, no API change.
  const downloadCsv = (d: MaterialDay) => {
    const rows = [
      [tr(lang, 'th_item'), tr(lang, 'th_issued'), tr(lang, 'th_used'), tr(lang, 'th_returned'), tr(lang, 'th_variance'), tr(lang, 'th_where')],
      ...d.lines.map((l) => [l.name, `${l.issuedQty} ${l.unit}`, l.usedQty ?? '', l.returnedQty ?? '', l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0), l.note || '']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `material-${d.date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  // Per-line used/returned/note inputs, keyed by line id — local state so
  // typing does not re-render the whole view from the server state.
  const [logVals, setLogVals] = useState<Record<number, { used: string; ret: string; note: string }>>({});
  const getLog = (l: { id: number; usedQty: number | null; returnedQty: number | null; note: string }) =>
    logVals[l.id] || { used: String(l.usedQty ?? ''), ret: String(l.returnedQty ?? ''), note: l.note || '' };
  const setLog = (id: number, patch: Partial<{ used: string; ret: string; note: string }>) =>
    setLogVals((v) => ({ ...v, [id]: { ...getLog(S.materialDays.flatMap((d) => d.lines).find((x) => x.id === id)!), ...patch } }));

  return (
    <div>
      <h2>{tr(lang, 'mat_title')}</h2>
      <p className="muted">{tr(lang, 'mat_help')}</p>
      {days.map((d) => {
        const tot = d.lines.reduce((s, l) => ({ i: s.i + l.issuedQty, u: s.u + (l.usedQty || 0), r: s.r + (l.returnedQty || 0) }), { i: 0, u: 0, r: 0 });
        const variance = tot.i - tot.u - tot.r;
        return (
          <div key={d.id} className="panel">
            <h3>{d.date} — {tr(lang, 'status_col')}: {tStatus(lang, d.status)}{d.status === 'approved' ? ` (${tr(lang, 'checked_by')} ${personName(d.checkedById)})` : ''}{d.status === 'flagged' ? ` — ${d.checkNote}` : ''}</h3>
            <div className="table-wrap"><table><thead><tr><th>{tr(lang, 'th_item')}</th><th>{tr(lang, 'th_issued')}</th><th>{tr(lang, 'th_used')}</th><th>{tr(lang, 'th_returned')}</th><th>{tr(lang, 'th_variance')}</th><th>{tr(lang, 'th_where')}</th></tr></thead>
              <tbody>
                {d.lines.map((l) => { const v = l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0); return (
                  <tr key={l.id}><td>{l.name}</td><td>{l.issuedQty} {l.unit}</td><td>{l.usedQty ?? '—'}</td><td>{l.returnedQty ?? '—'}</td><td className={v ? 'var-bad' : 'var-ok'}>{v}</td><td>{l.note || ''}</td></tr>
                ); })}
                <tr><td><b>{tr(lang, 'total')}</b></td><td><b>{tot.i}</b></td><td><b>{tot.u}</b></td><td><b>{tot.r}</b></td><td className={variance ? 'var-bad' : 'var-ok'}><b>{variance}</b></td><td></td></tr>
              </tbody></table></div>
            <p><button className="btn" onClick={() => downloadCsv(d)}>{tr(lang, 'download_csv')}</button></p>
            {d.status === 'open' && actor.role === 'cs' && (
              <div>
                <h4>{tr(lang, 'log_used_h')}</h4>
                {d.lines.map((l) => {
                  const lv = getLog(l);
                  return (
                    <div key={l.id} className="mat-log-row">
                      <label>{l.name} — {tr(lang, 'th_issued')} {l.issuedQty} {l.unit}</label>
                      <input type="number" min="0" step="any" style={{ width: 90 }} value={lv.used} aria-label={tr(lang, 'th_used')} placeholder={tr(lang, 'th_used')} onChange={(e) => setLog(l.id, { used: e.target.value })} />
                      <input type="number" min="0" step="any" style={{ width: 90 }} value={lv.ret} aria-label={tr(lang, 'th_returned')} placeholder={tr(lang, 'th_returned')} onChange={(e) => setLog(l.id, { ret: e.target.value })} />
                      <input type="text" style={{ width: 260 }} value={lv.note} aria-label={tr(lang, 'where_ph')} placeholder={tr(lang, 'where_ph')} onChange={(e) => setLog(l.id, { note: e.target.value })} />
                      <button className="btn small" onClick={async () => {
                        try { const s = await api(`/api/material-days/${d.id}/log`, 'POST', { lineId: l.id, usedQty: Number(lv.used), returnedQty: Number(lv.ret), note: lv.note }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'logged')); } catch (e: any) { ctx.toast(e.message, false); }
                      }}>{tr(lang, 'save_btn')}</button>
                    </div>
                  );
                })}
                <p><button className="btn primary" onClick={async () => {
                  try { const s = await api(`/api/material-days/${d.id}/submit`, 'POST', {}, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'submitted_toast')); } catch (e: any) { ctx.toast(e.message, false); }
                }}>{tr(lang, 'submit_report')}</button></p>
              </div>
            )}
            {d.status === 'open' && actor.role === 'warehouse_manager' && <IssueMore dayId={d.id} date={d.date} ctx={ctx} />}
            {d.status === 'submitted' && actor.role === 'warehouse_manager' && (
              <div>
                <h4>{tr(lang, 'check_h')}</h4>
                <p>
                  <button className="btn primary" onClick={async () => {
                    try { const s = await api(`/api/material-days/${d.id}/check`, 'POST', { decision: 'approved', note: '' }, ctx.actorId); ctx.setState(s); ctx.toast(`${tr(lang, 'status_label')}: ${tStatus(lang, 'approved')}.`); } catch (e: any) { ctx.toast(e.message, false); }
                  }}>{tr(lang, 'approve_match')}</button>{' '}
                  <button className="btn danger" onClick={async () => {
                    const note = window.prompt(tr(lang, 'flag_prompt')) || '';
                    try { const s = await api(`/api/material-days/${d.id}/check`, 'POST', { decision: 'flagged', note }, ctx.actorId); ctx.setState(s); ctx.toast(`${tr(lang, 'status_label')}: ${tStatus(lang, 'flagged')}.`); } catch (e: any) { ctx.toast(e.message, false); }
                  }}>{tr(lang, 'flag_mismatch')}</button>
                </p>
              </div>
            )}
            {d.status === 'submitted' && actor.role !== 'warehouse_manager' && <p className="muted">{tr(lang, 'submitted_waiting')}</p>}
          </div>
        );
      })}
      <div className="panel">
        <h3>{tr(lang, 'issue_new_day')}</h3>
        <p className="muted">{tr(lang, 'issue_new_help')}</p>
        <label>{tr(lang, 'date_label')} <input type="date" value={newDayDate} onChange={(e) => setNewDayDate(e.target.value)} /></label>
        <div id="issueLines">
          {issueLines.map((l, i) => (
            <div key={i}>
              <input className="il-name" list="matNames" aria-label={tr(lang, 'item_name_ph')} placeholder={tr(lang, 'item_name_ph')} value={l.name} onChange={(e) => setIssueLines((v) => v.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input className="il-qty" type="number" min="0" step="any" aria-label={tr(lang, 'qty_ph')} placeholder={tr(lang, 'qty_ph')} value={l.qty} onChange={(e) => setIssueLines((v) => v.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} />
              <input className="il-unit" aria-label={tr(lang, 'unit_ph')} placeholder={tr(lang, 'unit_ph')} value={l.unit} onChange={(e) => setIssueLines((v) => v.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
            </div>
          ))}
        </div>
        <p>
          <button className="btn" onClick={() => setIssueLines((v) => [...v, { name: '', qty: '', unit: 'pcs' }])}>{tr(lang, 'add_line')}</button>{' '}
          <button className="btn primary" onClick={async () => {
            const lines = issueLines.map((l) => ({ name: l.name.trim(), qty: Number(l.qty), unit: l.unit || 'pcs' })).filter((l) => l.name && l.qty > 0);
            if (!lines.length) { ctx.toast(tr(lang, 'add_line_required'), false); return; }
            try { const s = await api(`/api/material-days/${newDayDate}/issue`, 'POST', { lines }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'morning_issued')); } catch (e: any) { ctx.toast(e.message, false); }
          }}>{tr(lang, 'issue_morning')}</button>
        </p>
        <datalist id="matNames">{S.materialNames.map((n) => <option key={n} value={n} />)}</datalist>
      </div>
    </div>
  );
}

function IssueMore({ dayId, date, ctx }: { dayId: number; date: string; ctx: ViewCtx }) {
  const { S, lang } = ctx;
  const [name, setName] = useState(''); const [qty, setQty] = useState(''); const [unit, setUnit] = useState('pcs');
  return (
    <div>
      <h4>{tr(lang, 'issue_more_h')}</h4>
      <div className="issue-row">
        <input list="matNames" aria-label={tr(lang, 'item_name_ph')} placeholder={tr(lang, 'item_name_ph')} style={{ width: 200 }} value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" min="0" step="any" aria-label={tr(lang, 'qty_ph')} placeholder={tr(lang, 'qty_ph')} style={{ width: 80 }} value={qty} onChange={(e) => setQty(e.target.value)} />
        <input aria-label={tr(lang, 'unit_ph')} placeholder={tr(lang, 'unit_ph')} style={{ width: 70 }} value={unit} onChange={(e) => setUnit(e.target.value)} />
        <button className="btn" onClick={async () => {
          try { const s = await api(`/api/material-days/${date}/issue`, 'POST', { lines: [{ name, qty: Number(qty), unit: unit || 'pcs' }] }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'issued_toast')); setName(''); setQty(''); } catch (e: any) { ctx.toast(e.message, false); }
        }}>{tr(lang, 'issue_btn')}</button>
      </div>
      <datalist id="matNames">{S.materialNames.map((n) => <option key={n} value={n} />)}</datalist>
    </div>
  );
}
