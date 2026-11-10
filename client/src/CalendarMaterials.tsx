// Log (monthly report) + shift import, and Materials daily cycle —
// Ant Design restyle. Tables, Buttons, Inputs, DatePicker, Upload and
// AutoComplete are antd; the month grid stays custom code inside the
// antd layout (antd has no calendar grid that fits). window.prompt for
// the flag note is replaced by PromptModal.
import { useMemo, useState } from 'react';
import {
  AutoComplete, Button, Card, DatePicker, Input, InputNumber, Statistic,
  Table, Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from './api';
import { ActivitySection } from './TeamActivity';
import PromptModal from './PromptModal';
import {
  tr, tCol, tDept, tStatus, todayStr,
  type ConfirmFn, type DailyLine, type Lang, type MaterialDay, type State, type Task,
} from './lib';

export interface ViewCtx {
  S: State; lang: Lang; actorId: number;
  setState: (s: State) => void;
  toast: (msg: string, ok?: boolean) => void;
  openTask: (id: number) => void;
  modal: ConfirmFn;
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

export function LogView({ ctx }: { ctx: ViewCtx }) {
  const { S, lang } = ctx;
  const [cursor, setCursor] = useState(() => new Date());
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const first = new Date(y, m, 1), daysIn = new Date(y, m + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7;
  const monthName = first.toLocaleString(lang === 'id' ? 'id-ID' : 'en', { month: 'long', year: 'numeric' });
  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
  const dows = lang === 'id' ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const cells: { ds: string; d: number }[] = [];
  for (let d = 1; d <= daysIn; d++) cells.push({ ds: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, d });
  // Completion date comes from the task itself: the server sets completedAt
  // to the approve-to-Done time and clears it when a task leaves Done, so
  // no activity-log parsing and no migration is needed.
  const doneOn = (ds: string) => S.tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === ds);
  const loggedLinesOn = (ds: string) => {
    const d = S.materialDays.find((x) => x.date === ds);
    return d ? d.lines.filter((l) => l.usedQty !== null || l.returnedQty !== null) : [];
  };
  const shiftsOn = (ds: string) => S.shifts.filter((s) => s.date === ds);
  // Month aggregates, derived client-side from /api/state. Nothing new on
  // the server: no endpoint was added for this view.
  const doneMonth = S.tasks
    .filter((t) => t.completedAt && t.completedAt.slice(0, 10).startsWith(monthKey))
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  const matMonth = S.materialDays.filter((d) => d.date.startsWith(monthKey));
  const matTot = matMonth.reduce((s, d) => {
    const t = d.lines.reduce((x, l) => ({ i: x.i + l.issuedQty, u: x.u + (l.usedQty || 0), r: x.r + (l.returnedQty || 0) }), { i: 0, u: 0, r: 0 });
    return { i: s.i + t.i, u: s.u + t.u, r: s.r + t.r };
  }, { i: 0, u: 0, r: 0 });
  const matVar = matTot.i - matTot.u - matTot.r;
  const shiftsMonth = S.shifts.filter((s) => s.date.startsWith(monthKey));
  const shiftsPerPerson = Object.entries(
    shiftsMonth.reduce<Record<number, number>>((acc, s) => { acc[s.personId] = (acc[s.personId] || 0) + 1; return acc; }, {}),
  ).map(([pid, n]) => ({ pid: Number(pid), n })).sort((a, b) => b.n - a.n || personName(a.pid).localeCompare(personName(b.pid)));
  const dayDone = day ? doneOn(day) : [];
  const dayLogged = day ? loggedLinesOn(day) : [];
  const dayShifts = day ? shiftsOn(day) : [];

  const doneCols: ColumnsType<Task> = [
    { title: tr(lang, 'date_label'), key: 'date', render: (_, t) => t.completedAt?.slice(0, 10) },
    { title: tr(lang, 'title_label'), key: 'title', render: (_, t) => <Button type="link" className="link-btn" onClick={() => ctx.openTask(t.id)}>{t.title}</Button> },
    { title: tr(lang, 'log_th_assignee'), key: 'assignee', render: (_, t) => personName(t.assigneeId) },
  ];
  const shiftsCols: ColumnsType<{ pid: number; n: number }> = [
    { title: tr(lang, 'th_name'), key: 'name', render: (_, r) => personName(r.pid) },
    { title: tr(lang, 'log_th_shifts'), dataIndex: 'n', key: 'n' },
  ];
  const dayMatCols: ColumnsType<DailyLine> = [
    { title: tr(lang, 'th_item'), dataIndex: 'name', key: 'name' },
    { title: tr(lang, 'th_used'), key: 'used', render: (_, l) => l.usedQty ?? '–' },
    { title: tr(lang, 'th_returned'), key: 'returned', render: (_, l) => l.returnedQty ?? '–' },
    { title: tr(lang, 'th_where'), dataIndex: 'note', key: 'where', render: (v) => v || '' },
  ];
  const previewCols: ColumnsType<ReturnType<typeof parseCsv>[number]> = [
    { title: tr(lang, 'date_label'), dataIndex: 'date', key: 'date' },
    { title: tr(lang, 'th_name'), dataIndex: 'name', key: 'name' },
    { title: 'Shift', dataIndex: 'shift', key: 'shift' },
    { title: lang === 'id' ? 'Cocok?' : 'Match', key: 'match', render: (_, r) => S.people.some((p) => p.name.toLowerCase() === (r.name || '').toLowerCase()) ? tr(lang, 'match_ok') : tr(lang, 'match_no') },
  ];

  // The month report, client-side CSV like the per-day material CSV.
  const downloadMonthCsv = () => {
    const q = (c: string | number) => `"${String(c).replaceAll('"', '""')}"`;
    const rows: (string | number)[][] = [
      [tr(lang, 'log_title'), monthName],
      [],
      [tr(lang, 'log_day_completed')],
      [tr(lang, 'date_label'), tr(lang, 'title_label'), tr(lang, 'log_th_assignee')],
      ...doneMonth.map((t) => [t.completedAt!.slice(0, 10), t.title, personName(t.assigneeId)]),
      [],
      [tr(lang, 'log_day_material')],
      [tr(lang, 'date_label'), tr(lang, 'th_item'), tr(lang, 'th_issued'), tr(lang, 'th_used'), tr(lang, 'th_returned'), tr(lang, 'th_variance'), tr(lang, 'th_where')],
      ...matMonth.flatMap((d) => d.lines.map((l) => [d.date, l.name, `${l.issuedQty} ${l.unit}`, l.usedQty ?? '', l.returnedQty ?? '', l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0), l.note || ''])),
      [],
      [tr(lang, 'log_day_shifts')],
      [tr(lang, 'date_label'), tr(lang, 'th_name'), 'Shift', tr(lang, 'log_th_start'), tr(lang, 'log_th_end')],
      ...shiftsMonth.map((s) => [s.date, personName(s.personId), s.shiftName, s.startTime, s.endTime]),
    ];
    const csv = rows.map((r) => r.map(q).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `log-${monthKey}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <h2>{tr(lang, 'log_title')} · {monthName}</h2>
      <p className="muted">{tr(lang, 'log_sub')}</p>
      <p>
        <Button onClick={() => setCursor(new Date(y, m - 1, 1))}>{tr(lang, 'prev')}</Button>{' '}
        <Button onClick={() => setCursor(new Date(y, m + 1, 1))}>{tr(lang, 'next')}</Button>{' '}
        <Button onClick={() => setCursor(new Date())}>{tr(lang, 'today_btn')}</Button>
      </p>
      <div className="cal">
        {dows.map((d) => <div key={d} className="dow">{d}</div>)}
        {Array.from({ length: startDow }).map((_, i) => <div key={'e' + i} />)}
        {cells.map(({ ds, d }) => {
          const done = doneOn(ds).length;
          const mat = loggedLinesOn(ds).length;
          const sh = shiftsOn(ds).length;
          const parts: string[] = [];
          if (done) parts.push(`✓ ${done} ${tr(lang, 'log_cell_done')}`);
          if (mat) parts.push(`${mat} ${tr(lang, 'log_cell_mat')}`);
          if (sh) parts.push(`${sh} ${tr(lang, 'log_cell_shift')}`);
          return (
            <div key={ds} className={`day ${ds === todayStr() ? 'today' : ''}`} tabIndex={0} role="button"
              aria-label={parts.length ? `${ds}: ${parts.join(', ')}` : ds}
              onClick={() => setDay(ds)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDay(ds); } }}>
              <b>{d}</b>
              {parts.map((p) => <div key={p}>{p}</div>)}
            </div>
          );
        })}
      </div>
      <Card className="panel-card" title={`${tr(lang, 'log_month_h')} · ${monthName}`}>
        <div className="cards">
          <Card><Statistic title={tr(lang, 'log_tasks_done')} value={doneMonth.length} /></Card>
          <Card><Statistic title={tr(lang, 'th_issued')} value={matTot.i} /></Card>
          <Card><Statistic title={tr(lang, 'th_used')} value={matTot.u} /></Card>
          <Card><Statistic title={tr(lang, 'th_returned')} value={matTot.r} /></Card>
          <Card className={matVar ? 'stat-warn' : 'stat-ok'}><Statistic title={tr(lang, 'th_variance')} value={matVar} /></Card>
          <Card><Statistic title={tr(lang, 'log_th_shifts')} value={shiftsMonth.length} /></Card>
        </div>
        <h4>{tr(lang, 'log_day_completed')}</h4>
        {doneMonth.length ? <Table<Task> rowKey="id" dataSource={doneMonth} columns={doneCols} pagination={false} scroll={{ x: 480 }} />
          : <p className="muted">{tr(lang, 'log_no_completed_month')}</p>}
        <h4>{tr(lang, 'log_shifts_pp')}</h4>
        {shiftsPerPerson.length ? <Table rowKey="pid" dataSource={shiftsPerPerson} columns={shiftsCols} pagination={false} />
          : <p className="muted">{tr(lang, 'log_no_shifts_month')}</p>}
        <p><Button icon={<DownloadOutlined />} onClick={downloadMonthCsv}>{tr(lang, 'log_export_month')}</Button></p>
      </Card>
      <Card className="panel-card" title={`${tr(lang, 'log_day_h')}${day ? ` · ${day}` : ''}`}>
        {!day && <p className="muted">{tr(lang, 'log_pick_day')}</p>}
        {day && <div>
          <h4>{tr(lang, 'log_day_completed')}</h4>
          {dayDone.length ? <ul>{dayDone.map((t) => <li key={t.id}><Button type="link" className="link-btn" onClick={() => ctx.openTask(t.id)}>{t.title}</Button> · {personName(t.assigneeId)}</li>)}</ul>
            : <p className="muted">{tr(lang, 'log_no_completed')}</p>}
          <h4>{tr(lang, 'log_day_material')}</h4>
          {dayLogged.length ? <Table<DailyLine> rowKey="id" dataSource={dayLogged} columns={dayMatCols} pagination={false} scroll={{ x: 480 }} />
            : <p className="muted">{tr(lang, 'log_no_material')}</p>}
          <h4>{tr(lang, 'log_day_shifts')}</h4>
          {dayShifts.length ? <ul>{dayShifts.map((s) => <li key={s.id}>{personName(s.personId)} · {s.shiftName} {s.startTime}–{s.endTime}</li>)}</ul>
            : <p className="muted">{tr(lang, 'nobody')}</p>}
        </div>}
      </Card>
      <Card className="panel-card" title={tr(lang, 'shift_import')}>
        <p className="muted">{tr(lang, 'shift_import_help')}</p>
        <p><Button href="/api/shifts/template.csv" icon={<DownloadOutlined />}>{tr(lang, 'download_template')}</Button></p>
        <p>
          <Upload accept=".csv,text/csv" showUploadList={false}
            beforeUpload={(file) => {
              const r = new FileReader(); r.onload = () => setPaste(String(r.result)); r.readAsText(file);
              return false;
            }}>
            <Button icon={<UploadOutlined />}>{tr(lang, 'shift_import')}</Button>
          </Upload>
        </p>
        <Input.TextArea rows={4} style={{ width: '100%' }} aria-label={tr(lang, 'shift_import')} placeholder="2026-11-08,Bima Prasetyo,Pagi,07:00,15:00,NOC," value={paste} onChange={(e) => setPaste(e.target.value)} />
        <p><Button type="primary" onClick={() => {
          const rows = parseCsv(paste);
          if (!rows.length) { ctx.toast(tr(lang, 'nothing_to_import'), false); return; }
          setPreview(rows);
        }}>{tr(lang, 'preview_import')}</Button></p>
        {preview && (() => {
          const matched = preview.filter((r) => S.people.some((p) => p.name.toLowerCase() === (r.name || '').toLowerCase()));
          return (
            <div>
              <Table rowKey={(_, i) => String(i)} dataSource={preview} columns={previewCols} pagination={false} scroll={{ x: 480 }} />
              <p>{matched.length} {tr(lang, 'matched')} / {preview.length - matched.length} {tr(lang, 'no_such_person')}.</p>
              <p><Button type="primary" onClick={async () => {
                try {
                  const r = await api('/api/shifts/import', 'POST', { rows: preview }, ctx.actorId);
                  ctx.setState(r.state); ctx.toast(`${tr(lang, 'import_done')}: ${r.created} ${tr(lang, 'created_w')}, ${r.replaced} ${tr(lang, 'replaced_w')}, ${r.skipped} ${tr(lang, 'skipped_w')}.`); setPreview(null);
                } catch (e: any) { ctx.toast(e.message, false); }
              }}>{tr(lang, 'import_rows')} {preview.length}</Button></p>
            </div>
          );
        })()}
      </Card>
      <ActivitySection S={S} lang={lang} openTask={ctx.openTask} />
    </div>
  );
}

export function MaterialsView({ ctx }: { ctx: ViewCtx }) {
  const { S, lang } = ctx;
  const actor = S.people.find((p) => p.id === ctx.actorId) || S.people[0];
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const days = useMemo(() => [...S.materialDays].sort((a, b) => b.date.localeCompare(a.date)), [S.materialDays]);
  const [newDayDate, setNewDayDate] = useState(todayStr());
  const [issueLines, setIssueLines] = useState([{ name: '', qty: '', unit: 'pcs' }]);
  const [flagDay, setFlagDay] = useState<MaterialDay | null>(null);

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

  const dayCols: ColumnsType<DailyLine> = [
    { title: tr(lang, 'th_item'), dataIndex: 'name', key: 'name' },
    { title: tr(lang, 'th_issued'), key: 'issued', render: (_, l) => `${l.issuedQty} ${l.unit}` },
    { title: tr(lang, 'th_used'), key: 'used', render: (_, l) => l.usedQty ?? '–' },
    { title: tr(lang, 'th_returned'), key: 'returned', render: (_, l) => l.returnedQty ?? '–' },
    { title: tr(lang, 'th_variance'), key: 'var', render: (_, l) => { const v = l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0); return <span className={v ? 'var-bad' : 'var-ok'}>{v}</span>; } },
    { title: tr(lang, 'th_where'), dataIndex: 'note', key: 'where', render: (v) => v || '' },
  ];

  return (
    <div>
      <h2>{tr(lang, 'mat_title')}</h2>
      <p className="muted">{tr(lang, 'mat_help')}</p>
      {days.map((d) => {
        const tot = d.lines.reduce((s, l) => ({ i: s.i + l.issuedQty, u: s.u + (l.usedQty || 0), r: s.r + (l.returnedQty || 0) }), { i: 0, u: 0, r: 0 });
        const variance = tot.i - tot.u - tot.r;
        return (
          <Card key={d.id} className="panel-card"
            title={`${d.date} · ${tr(lang, 'status_col')}: ${tStatus(lang, d.status)}${d.status === 'approved' ? ` (${tr(lang, 'checked_by')} ${personName(d.checkedById)})` : ''}${d.status === 'flagged' ? ` · ${d.checkNote}` : ''}`}>
            <Table<DailyLine> rowKey="id" dataSource={d.lines} columns={dayCols} pagination={false} scroll={{ x: 640 }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><b>{tr(lang, 'total')}</b></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}><b>{tot.i}</b></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}><b>{tot.u}</b></Table.Summary.Cell>
                  <Table.Summary.Cell index={3}><b>{tot.r}</b></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} className={variance ? 'var-bad' : 'var-ok'}><b>{variance}</b></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              )} />
            <p><Button icon={<DownloadOutlined />} onClick={() => downloadCsv(d)}>{tr(lang, 'download_csv')}</Button></p>
            {d.status === 'open' && actor.role === 'cs' && (
              <div>
                <h4>{tr(lang, 'log_used_h')}</h4>
                {d.lines.map((l) => {
                  const lv = getLog(l);
                  return (
                    <div key={l.id} className="mat-log-row">
                      <label>{l.name} · {tr(lang, 'th_issued')} {l.issuedQty} {l.unit}</label>
                      <InputNumber min={0} style={{ width: 90 }} value={lv.used === '' ? null : Number(lv.used)} aria-label={tr(lang, 'th_used')} placeholder={tr(lang, 'th_used')} onChange={(v) => setLog(l.id, { used: v == null ? '' : String(v) })} />
                      <InputNumber min={0} style={{ width: 90 }} value={lv.ret === '' ? null : Number(lv.ret)} aria-label={tr(lang, 'th_returned')} placeholder={tr(lang, 'th_returned')} onChange={(v) => setLog(l.id, { ret: v == null ? '' : String(v) })} />
                      <Input style={{ flex: '1 1 200px', minWidth: 0 }} value={lv.note} aria-label={tr(lang, 'where_ph')} placeholder={tr(lang, 'where_ph')} onChange={(e) => setLog(l.id, { note: e.target.value })} />
                      <Button size="small" onClick={async () => {
                        try { const s = await api(`/api/material-days/${d.id}/log`, 'POST', { lineId: l.id, usedQty: Number(lv.used), returnedQty: Number(lv.ret), note: lv.note }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'logged')); } catch (e: any) { ctx.toast(e.message, false); }
                      }}>{tr(lang, 'save_btn')}</Button>
                    </div>
                  );
                })}
                <p><Button type="primary" onClick={async () => {
                  try { const s = await api(`/api/material-days/${d.id}/submit`, 'POST', {}, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'submitted_toast')); } catch (e: any) { ctx.toast(e.message, false); }
                }}>{tr(lang, 'submit_report')}</Button></p>
              </div>
            )}
            {d.status === 'open' && actor.role === 'warehouse_manager' && <IssueMore dayId={d.id} date={d.date} ctx={ctx} />}
            {d.status === 'submitted' && actor.role === 'warehouse_manager' && (
              <div>
                <h4>{tr(lang, 'check_h')}</h4>
                <p>
                  <Button type="primary" onClick={async () => {
                    try { const s = await api(`/api/material-days/${d.id}/check`, 'POST', { decision: 'approved', note: '' }, ctx.actorId); ctx.setState(s); ctx.toast(`${tr(lang, 'status_label')}: ${tStatus(lang, 'approved')}.`); } catch (e: any) { ctx.toast(e.message, false); }
                  }}>{tr(lang, 'approve_match')}</Button>{' '}
                  <Button danger onClick={() => setFlagDay(d)}>{tr(lang, 'flag_mismatch')}</Button>
                </p>
              </div>
            )}
            {d.status === 'submitted' && actor.role !== 'warehouse_manager' && <p className="muted">{tr(lang, 'submitted_waiting')}</p>}
          </Card>
        );
      })}
      <PromptModal open={!!flagDay} title={tr(lang, 'flag_mismatch')} label={tr(lang, 'flag_prompt')}
        onOk={async (note) => {
          const d = flagDay!; setFlagDay(null);
          try { const s = await api(`/api/material-days/${d.id}/check`, 'POST', { decision: 'flagged', note }, ctx.actorId); ctx.setState(s); ctx.toast(`${tr(lang, 'status_label')}: ${tStatus(lang, 'flagged')}.`); } catch (e: any) { ctx.toast(e.message, false); }
        }}
        onCancel={() => setFlagDay(null)} />
      <Card className="panel-card" title={tr(lang, 'issue_new_day')}>
        <p className="muted">{tr(lang, 'issue_new_help')}</p>
        <p><label>{tr(lang, 'date_label')} <DatePicker value={newDayDate ? dayjs(newDayDate) : null} onChange={(v) => setNewDayDate(v ? v.format('YYYY-MM-DD') : '')} /></label></p>
        <div id="issueLines">
          {issueLines.map((l, i) => (
            <div key={i}>
              <AutoComplete value={l.name} onChange={(v) => setIssueLines((vs) => vs.map((x, j) => j === i ? { ...x, name: v } : x))}
                options={S.materialNames.map((n) => ({ value: n }))}
                placeholder={tr(lang, 'item_name_ph')} aria-label={tr(lang, 'item_name_ph')} style={{ width: 200 }} />
              <InputNumber min={0} value={l.qty === '' ? null : Number(l.qty)} placeholder={tr(lang, 'qty_ph')} aria-label={tr(lang, 'qty_ph')} style={{ width: 90 }}
                onChange={(v) => setIssueLines((vs) => vs.map((x, j) => j === i ? { ...x, qty: v == null ? '' : String(v) } : x))} />
              <Input value={l.unit} onChange={(e) => setIssueLines((vs) => vs.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                placeholder={tr(lang, 'unit_ph')} aria-label={tr(lang, 'unit_ph')} style={{ width: 70 }} />
            </div>
          ))}
        </div>
        <p>
          <Button onClick={() => setIssueLines((v) => [...v, { name: '', qty: '', unit: 'pcs' }])}>{tr(lang, 'add_line')}</Button>{' '}
          <Button type="primary" onClick={async () => {
            const lines = issueLines.map((l) => ({ name: l.name.trim(), qty: Number(l.qty), unit: l.unit || 'pcs' })).filter((l) => l.name && l.qty > 0);
            if (!lines.length) { ctx.toast(tr(lang, 'add_line_required'), false); return; }
            try { const s = await api(`/api/material-days/${newDayDate}/issue`, 'POST', { lines }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'morning_issued')); } catch (e: any) { ctx.toast(e.message, false); }
          }}>{tr(lang, 'issue_morning')}</Button>
        </p>
      </Card>
    </div>
  );
}

function IssueMore({ dayId, date, ctx }: { dayId: number; date: string; ctx: ViewCtx }) {
  const { S, lang } = ctx;
  const [name, setName] = useState(''); const [qty, setQty] = useState<number | null>(null); const [unit, setUnit] = useState('pcs');
  return (
    <div>
      <h4>{tr(lang, 'issue_more_h')}</h4>
      <div className="issue-row">
        <AutoComplete value={name} onChange={setName} options={S.materialNames.map((n) => ({ value: n }))}
          placeholder={tr(lang, 'item_name_ph')} aria-label={tr(lang, 'item_name_ph')} style={{ width: 200 }} />
        <InputNumber min={0} value={qty} onChange={(v) => setQty(typeof v === 'number' ? v : null)} placeholder={tr(lang, 'qty_ph')} aria-label={tr(lang, 'qty_ph')} style={{ width: 80 }} />
        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={tr(lang, 'unit_ph')} aria-label={tr(lang, 'unit_ph')} style={{ width: 70 }} />
        <Button onClick={async () => {
          try { const s = await api(`/api/material-days/${date}/issue`, 'POST', { lines: [{ name, qty: Number(qty), unit: unit || 'pcs' }] }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'issued_toast')); setName(''); setQty(null); } catch (e: any) { ctx.toast(e.message, false); }
        }}>{tr(lang, 'issue_btn')}</Button>
      </div>
    </div>
  );
}
