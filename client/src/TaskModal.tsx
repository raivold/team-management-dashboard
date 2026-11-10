// Task detail modal + New task form — Ant Design restyle.
// antd owns Modal (in App), Alert, Image preview, Upload, Form, Select,
// Input, InputNumber, DatePicker and Buttons. The evidence lightbox is
// antd Image.PreviewGroup with a controlled preview so the thumbnails
// keep the old keyboard behaviour (focusable, Enter/Space opens).
import { useState } from 'react';
import {
  Alert, AutoComplete, Button, DatePicker, Empty, Form, Image, Input,
  InputNumber, Select, Upload,
} from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { api, readFileAsDataUrl } from './api';
import {
  tr, tCol, tPri, tKind, tDept, CAPTIONS_EN, CAPTIONS_ID,
  type ConfirmFn, type Lang, type State, type Task,
} from './lib';
import PromptModal from './PromptModal';

export interface ModalCtx {
  S: State; lang: Lang; actorId: number;
  setState: (s: State) => void;
  toast: (msg: string, ok?: boolean) => void;
  moveTask: (id: number, columnId: number) => Promise<void>;
  modal: ConfirmFn;
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
  const [preview, setPreview] = useState<{ visible: boolean; current: number }>({ visible: false, current: 0 });
  const [rejectOpen, setRejectOpen] = useState(false);
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';

  const uploadFiles = async (list: File[], category: 'evidence' | 'file') => {
    if (!list.length) return;
    for (const f of list) {
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
      <p className="muted">{tKind(lang, task.taskKind)} · {tDept(lang, task.department || '')} · {tCol(lang, col.name)} · {tr(lang, 'priority_word')}: {tPri(lang, task.priority)} · {tr(lang, 'due_prefix')}: {task.dueDate || '–'}</p>
      <p>{task.description || ''}</p>
      <p className="muted">{tr(lang, 'customer_word')}: {task.customer || '–'} · {tr(lang, 'location_label')}: {task.location || '–'} · {tr(lang, 'service_label')}: {task.serviceId || '–'} · {tr(lang, 'dropped_by')}: {personName(task.createdById)} · {tr(lang, 'assigned_to')}: {personName(task.assigneeId)}</p>
      {isReview && (ev.length
        ? <Alert type="success" showIcon message={`${tr(lang, 'evidence_attached')}: ${ev.length} ${lang === 'id' ? 'foto' : 'photo(s)'} · ${tr(lang, 'evidence_review')}`} />
        : <Alert type="warning" showIcon message={`${tr(lang, 'no_evidence_warn')} ${tr(lang, 'no_evidence_warn2')}`} />)}
      {isReview && (
        <p>
          <Button type="primary" disabled={!canAppr} onClick={async () => {
            try { const s = await api(`/api/tasks/${task.id}/move`, 'POST', { columnId: doneCol.id }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'approved_toast')); ctx.close(); } catch (e: any) { ctx.toast(e.message, false); }
          }}>{tr(lang, 'approve_done')}</Button>{' '}
          <Button danger disabled={!canAppr} onClick={() => setRejectOpen(true)}>{tr(lang, 'reject_back')}</Button>
          {!canAppr && <span className="muted"> {actor.role === 'osp'
            ? (lang === 'id' ? 'OSP hanya bisa menyetujui tugas yang dibuatnya sendiri.' : 'OSP can only approve tasks they dropped themselves.')
            : (lang === 'id' ? 'Hanya Head NOC (apa pun) atau OSP (tugas yang dibuatnya sendiri) yang bisa menyetujui.' : 'Only Head NOC (anything) or OSP (own dropped tasks) can approve.')}</span>}
        </p>
      )}
      <PromptModal open={rejectOpen} title={tr(lang, 'reject_back')} label={tr(lang, 'reject_reason')}
        onOk={async (reason) => {
          setRejectOpen(false);
          try { const s = await api(`/api/tasks/${task.id}/reject`, 'POST', { reason }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'rejected_toast')); ctx.close(); } catch (e: any) { ctx.toast(e.message, false); }
        }}
        onCancel={() => setRejectOpen(false)} />
      <p><span className="muted">{tr(lang, 'move_to_label')} </span><Select value={col.id} aria-label={tr(lang, 'move_to_label')} style={{ width: 240 }}
        options={S.columns.map((c) => ({ value: c.id, label: tCol(lang, c.name) }))}
        onChange={async (v) => { await ctx.moveTask(task.id, v); }} /></p>

      <h3>{tr(lang, 'evidence_photos')}</h3>
      <div className="gallery">
        {ev.length ? (
          <Image.PreviewGroup preview={{ visible: preview.visible, current: preview.current, onVisibleChange: (v) => setPreview((p) => ({ ...p, visible: v })) }}>
            {ev.map((f, i) => (
              <figure key={f.id} style={{ margin: 0 }}>
                <div className="gallery-thumb" tabIndex={0} role="button" aria-label={f.caption || f.name}
                  onClick={() => setPreview({ visible: true, current: i })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreview({ visible: true, current: i }); } }}>
                  <Image src={`/api/files/${f.id}`} alt={f.caption || 'evidence'} width={128} height={96}
                    onClick={() => setPreview({ visible: true, current: i })} />
                </div>
                <figcaption className="muted">{f.caption || f.name} · {personName(f.createdById)} · {new Date(f.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB')}</figcaption>
              </figure>
            ))}
          </Image.PreviewGroup>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr(lang, 'no_evidence')} />}
      </div>
      <div className="chip-row">
        {(lang === 'id' ? CAPTIONS_ID : CAPTIONS_EN).map((c) => (
          <Button key={c} type={caption === c ? 'primary' : 'default'} size="small" style={{ borderRadius: 999 }} onClick={() => setCaption(c)}>{c}</Button>
        ))}
      </div>
      <p>
        <Upload accept="image/*" multiple showUploadList={false}
          customRequest={async ({ file, onSuccess }) => { await uploadFiles([file as File], 'evidence'); onSuccess?.({}); }}>
          <Button icon={<UploadOutlined />}>{tr(lang, 'attach_file')}</Button>
        </Upload>{' '}
        <span className="muted">{tr(lang, 'caption_label')} <b>{caption || tr(lang, 'caption_blank')}</b> {tr(lang, 'caption_hint')}</span>
      </p>

      <h3>{tr(lang, 'mat_adhoc')}</h3>
      <ul>{task.materials.length ? task.materials.map((m) => (
        <li key={m.id}>{m.name} · {m.qty} {m.unit}{m.serial ? ` · SN ${m.serial}` : ''} ({m.direction}){m.note ? ` · ${m.note}` : ''}</li>
      )) : <li className="muted">{tr(lang, 'no_mat_task')}</li>}</ul>
      <AddMaterial task={task} ctx={ctx} />

      <h3>{tr(lang, 'files_h')}</h3>
      <ul>{files.length ? files.map((f) => (
        <li key={f.id}><a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer">{f.name}</a>{' '}
          <Button type="text" size="small" icon={<DeleteOutlined />} aria-label={tr(lang, 'delete_file')} onClick={() => {
            ctx.modal.confirm({
              title: tr(lang, 'del_file_confirm'), okText: tr(lang, 'delete_file'), okType: 'danger',
              onOk: async () => {
                try { const s = await api(`/api/files/${f.id}`, 'DELETE', {}, ctx.actorId); ctx.setState(s); } catch (e: any) { ctx.toast(e.message, false); }
              },
            });
          }} /></li>
      )) : <li className="muted">{tr(lang, 'no_files')}</li>}</ul>
      <p>
        <Upload showUploadList={false}
          customRequest={async ({ file, onSuccess }) => { await uploadFiles([file as File], 'file'); onSuccess?.({}); }}>
          <Button icon={<UploadOutlined />}>{tr(lang, 'attach_file')}</Button>
        </Upload>
      </p>
      <p><Button href={`https://wa.me/?text=${encodeURIComponent(
        [task.title,
          task.customer ? `${tr(lang, 'customer_word')}: ${task.customer}` : '',
          task.location ? `${tr(lang, 'location_label')}: ${task.location}` : '',
          task.dueDate ? `${tr(lang, 'due_prefix')}: ${task.dueDate}` : '',
          `${tr(lang, 'assigned_to')}: ${personName(task.assigneeId)}`,
        ].filter(Boolean).join('\n'))}`} target="_blank" rel="noreferrer">{tr(lang, 'share_whatsapp')}</Button></p>
      <p><Button danger onClick={() => {
        ctx.modal.confirm({
          title: tr(lang, 'del_task_confirm'), okText: tr(lang, 'delete_task'), okType: 'danger',
          onOk: async () => {
            try { await api(`/api/tasks/${task.id}`, 'DELETE', {}, ctx.actorId); ctx.toast(tr(lang, 'task_deleted')); ctx.close(); ctx.afterDelete(); } catch (e: any) { ctx.toast(e.message, false); }
          },
        });
      }}>{tr(lang, 'delete_task')}</Button></p>
    </div>
  );
}

function AddMaterial({ task, ctx }: { task: Task; ctx: ModalCtx }) {
  const { S, lang } = ctx;
  const [name, setName] = useState(''); const [qty, setQty] = useState<number | null>(null); const [unit, setUnit] = useState('pcs');
  const [serial, setSerial] = useState(''); const [note, setNote] = useState('');
  return (
    <div className="adhoc-row">
      <AutoComplete value={name} onChange={setName} options={S.materialNames.map((n) => ({ value: n }))}
        placeholder={tr(lang, 'item_name_ph')} aria-label={tr(lang, 'item_name_ph')} style={{ width: 180 }} />
      <InputNumber value={qty} onChange={(v) => setQty(typeof v === 'number' ? v : null)} min={0} placeholder={tr(lang, 'qty_ph')} aria-label={tr(lang, 'qty_ph')} style={{ width: 90 }} />
      <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={tr(lang, 'unit_ph')} aria-label={tr(lang, 'unit_ph')} style={{ width: 70 }} />
      <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder={tr(lang, 'serial_ph')} aria-label={tr(lang, 'serial_ph')} style={{ width: 150 }} />
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr(lang, 'where_task_ph')} aria-label={tr(lang, 'where_task_ph')} style={{ width: 220 }} />
      <Button onClick={async () => {
        if (!name.trim() || !(qty !== null && qty > 0)) { ctx.toast(tr(lang, 'mat_required'), false); return; }
        try { const s = await api(`/api/tasks/${task.id}/materials`, 'POST', { name: name.trim(), qty, unit: unit || 'pcs', serial, note }, ctx.actorId); ctx.setState(s); ctx.toast(tr(lang, 'material_added')); setName(''); setQty(null); setSerial(''); setNote(''); } catch (e: any) { ctx.toast(e.message, false); }
      }}>{tr(lang, 'add_material')}</Button>
    </div>
  );
}

export function NewTaskForm({ columnId, ctx }: { columnId: number | null; ctx: ModalCtx }) {
  const { S, lang } = ctx;
  const staff = S.people.filter((p) => p.role !== 'field_tech');
  const field = S.people.filter((p) => p.role === 'field_tech');
  const depts = [...new Set(S.people.map((p) => p.department))];
  const [form] = Form.useForm();
  const onFinish = async (values: any) => {
    try {
      const s = await api('/api/tasks', 'POST', {
        title: values.title.trim(), taskKind: values.kind, department: values.dept, priority: values.pri,
        assigneeId: values.assignee ? Number(values.assignee) : null,
        dueDate: values.due ? values.due.format('YYYY-MM-DD') : null,
        customer: values.customer, location: values.location, serviceId: values.serviceId,
        description: values.desc, columnId: columnId || null,
      }, ctx.actorId);
      ctx.setState(s); ctx.close(); ctx.toast(tr(lang, 'task_created'));
    } catch (e: any) { ctx.toast(e.message, false); }
  };
  return (
    <Form form={form} layout="vertical" onFinish={onFinish}
      initialValues={{ kind: 'ticket', dept: depts[0] || '', pri: 'normal', assignee: '' }}>
      <div className="form-grid">
        <Form.Item name="title" label={tr(lang, 'title_label')} rules={[{ required: true, message: tr(lang, 'title_required') }]} style={{ gridColumn: '1 / -1' }}>
          <Input />
        </Form.Item>
        <Form.Item name="kind" label={tr(lang, 'kind_label')}>
          <Select options={[
            { value: 'ticket', label: tKind(lang, 'ticket') },
            { value: 'project', label: tKind(lang, 'project') },
            { value: 'maintenance', label: tKind(lang, 'maintenance') },
            { value: 'handover', label: `${tKind(lang, 'handover')} (${lang === 'id' ? 'shift berikutnya' : 'oncoming shift'})` },
            { value: 'reminder', label: `${tKind(lang, 'reminder')} (${lang === 'id' ? 'pemeliharaan/proyek mendatang' : 'future maintenance/project'})` },
          ]} />
        </Form.Item>
        <Form.Item name="dept" label={tr(lang, 'dept_label')}>
          <Select options={depts.map((d) => ({ value: d, label: tDept(lang, d) }))} />
        </Form.Item>
        <Form.Item name="pri" label={tr(lang, 'priority_label')}>
          <Select options={[
            { value: 'normal', label: tPri(lang, 'normal') },
            { value: 'high', label: tPri(lang, 'high') },
            { value: 'urgent', label: tPri(lang, 'urgent') },
          ]} />
        </Form.Item>
        <Form.Item name="assignee" label={tr(lang, 'assign_label')}>
          <Select options={[
            { value: '', label: tr(lang, 'unassigned') },
            { label: tr(lang, 'staff_group'), options: staff.map((p) => ({ value: String(p.id), label: `${p.name} (${p.department})` })) },
            { label: tr(lang, 'field_group'), options: field.map((p) => ({ value: String(p.id), label: p.name })) },
          ]} />
        </Form.Item>
        <Form.Item name="due" label={tr(lang, 'due_label')}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="customer" label={tr(lang, 'customer_label')}>
          <Input />
        </Form.Item>
        <Form.Item name="location" label={tr(lang, 'location_label')}>
          <Input />
        </Form.Item>
        <Form.Item name="serviceId" label={tr(lang, 'service_label')}>
          <Input />
        </Form.Item>
      </div>
      <Form.Item name="desc" label={tr(lang, 'desc_label')}>
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">{tr(lang, 'create_task')}</Button>
      </Form.Item>
    </Form>
  );
}
