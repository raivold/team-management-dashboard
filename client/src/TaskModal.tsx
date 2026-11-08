// Task detail modal + New task form — ported from public/app.js (v1.7.0).
import { useEffect, useRef, useState } from 'react';
import { api, readFileAsDataUrl } from './api';
import {
  tr, tCol, tPri, tKind, tDept, CAPTIONS_EN, CAPTIONS_ID,
  type Lang, type State, type Task,
} from './lib';

export interface ModalCtx {
  S: State; lang: Lang; actorId: number;
  setState: (s: State) => void;
  toast: (msg: string, ok?: boolean) => void;
  moveTask: (id: number, columnId: number) => Promise<void>;
  close: () => void;
  afterDelete: () => void;
}

export function TaskDetail({ task, ctx }: { task: Task; ctx: ModalCtx }) {
  const { S, lang } = ctx;
  const col = S.columns.find((c) => c.id === task.columnId)!;
  const ev = task.files.filter((f) => f.category === 'evidence');
  const files = task.files.filter((f) => f.category !== 'evidence');
  const isReview = col.kind === 'review';
  const actor = S.people.find((p) => p.id === ctx.actorId) || S.people[0];
  const canAppr = actor.role === 'head_noc' || (actor.role === 'osp' && task.createdById === actor.id);
  const doneCol = S.columns.find((c) => c.kind === 'done')!;
  const [caption, setCaption] = useState('');
  const [lightbox, setLightbox] = useState<{ id: number; cap: string } | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<Element | null>(null);

  // Same dialog behaviour as the task modal: focus inside on open, Escape
  // closes (without also closing the task modal behind it), focus returns.
  useEffect(() => {
    if (!lightbox) return;
    prevFocusRef.current = document.activeElement;
    lightboxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); setLightbox(null); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      (prevFocusRef.current as HTMLElement | null)?.focus?.();
    };
  }, [lightbox]);
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '—';

  const uploadFiles = async (list: FileList | null, category: 'evidence' | 'file') => {
    if (!list) return;
    for (const f of Array.from(list)) {
      const data = await readFileAsDataUrl(f);
      try {
        const s = await api(`/api/tasks/${task.id}/files`, 'POST', { name: f.name, mimeType: f.type, data, category, caption: category === 'evidence' ? caption : '' }, ctx.actorId);
        ctx.setState(s);
      } catch (e: any) { ctx.toast(e.message, false); return; }
    }
    setCaption('');
    ctx.toast(tr(lang, category === 'evidence' ? 'evidence_added' : 'file_attached'));
  };

  return (
    <div>
      <h2>{task.title}</h2>
      <p className="muted">{tKind(lang, task.taskKind)} · {tDept(lang, task.department || '')} · {tCol(lang, col.name)} · {tr(lang, 'priority_word')}: {tPri(lang, task.priority)} · {tr(lang, 'due_prefix')}: {task.dueDate || '—'}</p>
      <p>{task.description || ''}</p>
      <p className="muted">{tr(lang, 'customer_word')}: {task.customer || '—'} · {tr(lang, 'location_label')}: {task.location || '—'} · {tr(lang, 'service_label')}: {task.serviceId || '—'} · {tr(lang, 'dropped_by')}: {personName(task.createdById)} · {tr(lang, 'assigned_to')}: {personName(task.assigneeId)}</p>
      {isReview && (ev.length
        ? <div className="okbox">{tr(lang, 'evidence_attached')}: {ev.length} {lang === 'id' ? 'foto' : 'photo(s)'} — {tr(lang, 'evidence_review')}</div>
        : <div className="warnbox"><b>⚠ {tr(lang, 'no_evidence_warn')}</b> {tr(lang, 'no_evidence_warn2')}</div>)}
      {isReview && (
        <p>
          <button className="btn primary" disabled={!canAppr} onClick={async () => {
            try { const s = await api(`/api/tasks/${task.id}/move`, 'POST', { columnId: doneCol.id }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'approved_toast')); ctx.close(); } catch (e: any) { ctx.toast(e.message, false); }
          }}>{tr(lang, 'approve_done')}</button>{' '}
          <button className="btn danger" disabled={!canAppr} onClick={async () => {
            const reason = window.prompt(tr(lang, 'reject_reason')) || '';
            try { const s = await api(`/api/tasks/${task.id}/reject`, 'POST', { reason }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'rejected_toast')); ctx.close(); } catch (e: any) { ctx.toast(e.message, false); }
          }}>{tr(lang, 'reject_back')}</button>
          {!canAppr && <span className="muted"> {actor.role === 'osp'
            ? (lang === 'id' ? 'OSP hanya bisa menyetujui tugas yang dibuatnya sendiri.' : 'OSP can only approve tasks they dropped themselves.')
            : (lang === 'id' ? 'Hanya Head NOC (apa pun) atau OSP (tugas yang dibuatnya sendiri) yang bisa menyetujui.' : 'Only Head NOC (anything) or OSP (own dropped tasks) can approve.')}</span>}
        </p>
      )}
      <p><label>{tr(lang, 'move_to_label')} <select value={col.id} onChange={async (e) => { await ctx.moveTask(task.id, Number(e.target.value)); }}>
        {S.columns.map((c) => <option key={c.id} value={c.id}>{tCol(lang, c.name)}</option>)}
      </select></label></p>

      <h3>{tr(lang, 'evidence_photos')}</h3>
      <div className="gallery">
        {ev.length ? ev.map((f) => (
          <figure key={f.id} style={{ margin: 0 }}>
            <img src={`/api/files/${f.id}`} alt={f.caption || 'evidence'} tabIndex={0} role="button" aria-label={f.caption || f.name}
              onClick={() => setLightbox({ id: f.id, cap: f.caption || f.name })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightbox({ id: f.id, cap: f.caption || f.name }); } }} />
            <figcaption className="muted">{f.caption || f.name} · {personName(f.createdById)} · {new Date(f.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB')}</figcaption>
          </figure>
        )) : <p className="muted">{tr(lang, 'no_evidence')}</p>}
      </div>
      {lightbox && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={lightbox.cap} onClick={() => setLightbox(null)}>
          <div className="lightbox-card" ref={lightboxRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label={tr(lang, 'close_dialog')} onClick={() => setLightbox(null)}>✕</button>
            <img src={`/api/files/${lightbox.id}`} alt="Evidence photo" />
            <p>{lightbox.cap}</p>
          </div>
        </div>
      )}
      <div className="chip-row">
        {(lang === 'id' ? CAPTIONS_ID : CAPTIONS_EN).map((c) => (
          <button key={c} type="button" onClick={() => setCaption(c)}>{c}</button>
        ))}
      </div>
      <p><input type="file" accept="image/*" multiple aria-label={tr(lang, 'evidence_photos')} onChange={(e) => uploadFiles(e.target.files, 'evidence')} /> <span className="muted">{tr(lang, 'caption_label')} <b>{caption || tr(lang, 'caption_blank')}</b> {tr(lang, 'caption_hint')}</span></p>

      <h3>{tr(lang, 'mat_adhoc')}</h3>
      <ul>{task.materials.length ? task.materials.map((m) => (
        <li key={m.id}>{m.name} — {m.qty} {m.unit}{m.serial ? ` · SN ${m.serial}` : ''} ({m.direction}){m.note ? ` · ${m.note}` : ''}</li>
      )) : <li className="muted">{tr(lang, 'no_mat_task')}</li>}</ul>
      <AddMaterial task={task} ctx={ctx} />

      <h3>{tr(lang, 'files_h')}</h3>
      <ul>{files.length ? files.map((f) => (
        <li key={f.id}><a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer">{f.name}</a> <button className="btn small" aria-label={tr(lang, 'delete_file')} onClick={async () => {
          if (!window.confirm(tr(lang, 'del_file_confirm'))) return;
          try { const s = await api(`/api/files/${f.id}`, 'DELETE', {}, ctx.actorId); ctx.setState(s); } catch (e: any) { ctx.toast(e.message, false); }
        }}>✕</button></li>
      )) : <li className="muted">{tr(lang, 'no_files')}</li>}</ul>
      <p><input type="file" id="fileInput" aria-label={tr(lang, 'attach_file')} /> <button className="btn" onClick={async () => {
        const input = document.getElementById('fileInput') as HTMLInputElement | null;
        const f = input?.files?.[0]; if (!f) { ctx.toast(tr(lang, 'pick_file'), false); return; }
        const data = await readFileAsDataUrl(f);
        try { const s = await api(`/api/tasks/${task.id}/files`, 'POST', { name: f.name, mimeType: f.type, data, category: 'file', caption: '' }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'file_attached')); } catch (e: any) { ctx.toast(e.message, false); }
      }}>{tr(lang, 'attach_file')}</button></p>
      <p><a className="btn" href={`https://wa.me/?text=${encodeURIComponent(
        [task.title,
          task.customer ? `${tr(lang, 'customer_word')}: ${task.customer}` : '',
          task.location ? `${tr(lang, 'location_label')}: ${task.location}` : '',
          task.dueDate ? `${tr(lang, 'due_prefix')}: ${task.dueDate}` : '',
          `${tr(lang, 'assigned_to')}: ${personName(task.assigneeId)}`,
        ].filter(Boolean).join('\n'))}`} target="_blank" rel="noreferrer">{tr(lang, 'share_whatsapp')}</a></p>
      <p><button className="btn danger" onClick={async () => {
        if (!window.confirm(tr(lang, 'del_task_confirm'))) return;
        try { await api(`/api/tasks/${task.id}`, 'DELETE', {}, ctx.actorId); ctx.toast(tr(lang, 'task_deleted')); ctx.close(); ctx.afterDelete(); } catch (e: any) { ctx.toast(e.message, false); }
      }}>{tr(lang, 'delete_task')}</button></p>
    </div>
  );
}

function AddMaterial({ task, ctx }: { task: Task; ctx: ModalCtx }) {
  const { S, lang } = ctx;
  const [name, setName] = useState(''); const [qty, setQty] = useState(''); const [unit, setUnit] = useState('pcs');
  const [serial, setSerial] = useState(''); const [note, setNote] = useState('');
  return (
    <p className="adhoc-row">
      <input list="matNames2" aria-label={tr(lang, 'item_name_ph')} placeholder={tr(lang, 'item_name_ph')} style={{ width: 180 }} value={name} onChange={(e) => setName(e.target.value)} />
      <input type="number" min="0" step="any" aria-label={tr(lang, 'qty_ph')} placeholder={tr(lang, 'qty_ph')} style={{ width: 80 }} value={qty} onChange={(e) => setQty(e.target.value)} />
      <input aria-label={tr(lang, 'unit_ph')} placeholder={tr(lang, 'unit_ph')} style={{ width: 70 }} value={unit} onChange={(e) => setUnit(e.target.value)} />
      <input aria-label={tr(lang, 'serial_ph')} placeholder={tr(lang, 'serial_ph')} style={{ width: 150 }} value={serial} onChange={(e) => setSerial(e.target.value)} />
      <input aria-label={tr(lang, 'where_task_ph')} placeholder={tr(lang, 'where_task_ph')} style={{ width: 220 }} value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn" onClick={async () => {
        const q = Number(qty);
        if (!name.trim() || !(q > 0)) { ctx.toast(tr(lang, 'mat_required'), false); return; }
        try { const s = await api(`/api/tasks/${task.id}/materials`, 'POST', { name: name.trim(), qty: q, unit: unit || 'pcs', serial, note }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'material_added')); setName(''); setQty(''); setSerial(''); setNote(''); } catch (e: any) { ctx.toast(e.message, false); }
      }}>{tr(lang, 'add_material')}</button>
      <datalist id="matNames2">{S.materialNames.map((n) => <option key={n} value={n} />)}</datalist>
    </p>
  );
}

export function NewTaskForm({ columnId, ctx }: { columnId: number | null; ctx: ModalCtx }) {
  const { S, lang } = ctx;
  const staff = S.people.filter((p) => p.role !== 'field_tech');
  const field = S.people.filter((p) => p.role === 'field_tech');
  const depts = [...new Set(S.people.map((p) => p.department))];
  const [title, setTitle] = useState(''); const [kind, setKind] = useState('ticket');
  const [dept, setDept] = useState(depts[0] || ''); const [pri, setPri] = useState('normal');
  const [assignee, setAssignee] = useState(''); const [due, setDue] = useState('');
  const [customer, setCustomer] = useState(''); const [location, setLocation] = useState('');
  const [serviceId, setServiceId] = useState(''); const [desc, setDesc] = useState('');
  return (
    <div>
      <h2>{tr(lang, 'new_task_title')}</h2>
      <div className="form-grid">
        <div><label>{tr(lang, 'title_label')} <input style={{ width: '100%' }} value={title} onChange={(e) => setTitle(e.target.value)} /></label></div>
        <div><label>{tr(lang, 'kind_label')} <select style={{ width: '100%' }} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="ticket">{tKind(lang, 'ticket')}</option><option value="project">{tKind(lang, 'project')}</option>
          <option value="maintenance">{tKind(lang, 'maintenance')}</option>
          <option value="handover">{tKind(lang, 'handover')} ({lang === 'id' ? 'shift berikutnya' : 'oncoming shift'})</option>
          <option value="reminder">{tKind(lang, 'reminder')} ({lang === 'id' ? 'pemeliharaan/proyek mendatang' : 'future maintenance/project'})</option>
        </select></label></div>
        <div><label>{tr(lang, 'dept_label')} <select style={{ width: '100%' }} value={dept} onChange={(e) => setDept(e.target.value)}>
          {depts.map((d) => <option key={d} value={d}>{tDept(lang, d)}</option>)}
        </select></label></div>
        <div><label>{tr(lang, 'priority_label')} <select style={{ width: '100%' }} value={pri} onChange={(e) => setPri(e.target.value)}>
          <option value="normal">{tPri(lang, 'normal')}</option><option value="high">{tPri(lang, 'high')}</option><option value="urgent">{tPri(lang, 'urgent')}</option>
        </select></label></div>
        <div><label>{tr(lang, 'assign_label')} <select style={{ width: '100%' }} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">{tr(lang, 'unassigned')}</option>
          <optgroup label={tr(lang, 'staff_group')}>{staff.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.department})</option>)}</optgroup>
          <optgroup label={tr(lang, 'field_group')}>{field.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
        </select></label></div>
        <div><label>{tr(lang, 'due_label')} <input type="date" style={{ width: '100%' }} value={due} onChange={(e) => setDue(e.target.value)} /></label></div>
        <div><label>{tr(lang, 'customer_label')} <input style={{ width: '100%' }} value={customer} onChange={(e) => setCustomer(e.target.value)} /></label></div>
        <div><label>{tr(lang, 'location_label')} <input style={{ width: '100%' }} value={location} onChange={(e) => setLocation(e.target.value)} /></label></div>
        <div><label>{tr(lang, 'service_label')} <input style={{ width: '100%' }} value={serviceId} onChange={(e) => setServiceId(e.target.value)} /></label></div>
      </div>
      <label>{tr(lang, 'desc_label')} <textarea rows={3} style={{ width: '100%' }} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
      <p><button className="btn primary" onClick={async () => {
        if (!title.trim()) { ctx.toast(tr(lang, 'title_required'), false); return; }
        try {
          const s = await api('/api/tasks', 'POST', { title: title.trim(), taskKind: kind, department: dept, priority: pri, assigneeId: assignee ? Number(assignee) : null, dueDate: due || null, customer, location, serviceId, description: desc, columnId: columnId || null }, ctx.actorId);
          ctx.setState(s); ctx.close(); ctx.toast(tr(lang, 'task_created'));
        } catch (e: any) { ctx.toast(e.message, false); }
      }}>{tr(lang, 'create_task')}</button></p>
    </div>
  );
}
