// Login page, first-login password change, and the Admin view.
// antd owns the components (Form, Input, Button, Table, Alert, Card),
// matching the rest of the restyle. No new visual language here: the
// login card reuses the app's own topbar navy, the same tokens, and the
// same EN/ID + theme toggles as the dashboard header, so the screen
// reads as the same product before you are inside it.
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Checkbox, Empty, Form, Input, Segmented, Select, Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { KeyOutlined, LogoutOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import {
  adminCreate, adminList, adminResetPassword, adminSetDisabled,
  changePassword, login, type Me,
} from './api';
import {
  tr, tDept, tRoleDesc, type AccountRow, type ConfirmFn, type Lang, type State,
} from './lib';
import PromptModal from './PromptModal';

// ---- Shared header for the logged-out screens ----
// The same two toggles as the dashboard header (EN/ID, dark/light),
// so language and theme are choosable before logging in.
function AuthToggles({ lang, theme, setLang, setTheme }: {
  lang: Lang; theme: 'light' | 'dark';
  setLang: (l: Lang) => void; setTheme: (t: 'light' | 'dark') => void;
}) {
  return (
    <div className="auth-toggles">
      <Segmented options={[{ label: 'EN', value: 'en' }, { label: 'ID', value: 'id' }]} value={lang} onChange={(v) => setLang(v as Lang)} aria-label="Language / Bahasa" />
      <Button ghost icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />} aria-label="Toggle dark / light mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? tr(lang, 'theme_light') : tr(lang, 'theme_dark')}
      </Button>
    </div>
  );
}

// ---- Login page ----
export function LoginPage({ lang, theme, setLang, setTheme, onLoggedIn }: {
  lang: Lang; theme: 'light' | 'dark';
  setLang: (l: Lang) => void; setTheme: (t: 'light' | 'dark') => void;
  onLoggedIn: (me: Me) => void;
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onFinish = async (values: any) => {
    setError(''); setBusy(true);
    try {
      const me = await login(String(values.username).trim(), String(values.password));
      onLoggedIn(me);
    } catch (e: any) {
      setError(e.message || tr(lang, 'login_failed'));
    } finally { setBusy(false); }
  };
  return (
    <div className="login-wrap">
      <AuthToggles lang={lang} theme={theme} setLang={setLang} setTheme={setTheme} />
      <Card className="login-card">
        <h1>Team Management Dashboard</h1>
        <p className="muted">{tr(lang, 'subtitle')}</p>
        <h2>{tr(lang, 'login_title')}</h2>
        <p className="muted">{tr(lang, 'login_sub')}</p>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label={tr(lang, 'login_username')} rules={[{ required: true, message: tr(lang, 'login_username') }]}>
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item name="password" label={tr(lang, 'login_password')} rules={[{ required: true, message: tr(lang, 'login_password') }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={busy}>{tr(lang, 'login_btn')}</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

// ---- First-login / reset password change ----
// Shown instead of the dashboard until the password is changed, so a
// first password can never be kept by accident.
export function ChangePasswordForm({ lang, theme, setLang, setTheme, onDone }: {
  lang: Lang; theme: 'light' | 'dark';
  setLang: (l: Lang) => void; setTheme: (t: 'light' | 'dark') => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onFinish = async (values: any) => {
    setError('');
    if (values.newPassword !== values.confirm) { setError(tr(lang, 'change_pw_mismatch')); return; }
    setBusy(true);
    try {
      await changePassword(String(values.current), String(values.newPassword));
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally { setBusy(false); }
  };
  return (
    <div className="login-wrap">
      <AuthToggles lang={lang} theme={theme} setLang={setLang} setTheme={setTheme} />
      <Card className="login-card">
        <h1>Team Management Dashboard</h1>
        <h2>{tr(lang, 'change_pw_title')}</h2>
        <p className="muted">{tr(lang, 'change_pw_sub')}</p>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="current" label={tr(lang, 'change_pw_current')} rules={[{ required: true, message: tr(lang, 'change_pw_current') }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="newPassword" label={tr(lang, 'change_pw_new')} rules={[{ required: true, message: tr(lang, 'change_pw_new') }, { min: 8, message: tr(lang, 'change_pw_short') }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="confirm" label={tr(lang, 'change_pw_confirm')} rules={[{ required: true, message: tr(lang, 'change_pw_confirm') }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={busy}>{tr(lang, 'change_pw_btn')}</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

// ---- Admin view: accounts ----
// One account per person. The person carries the role and department;
// the account only proves who is at the keyboard. Field technicians
// are never offered here: they are assignees only, no login.
export function AdminView({ S, lang, toast, modal }: {
  S: State; lang: Lang;
  toast: (msg: string, ok?: boolean) => void;
  modal: ConfirmFn;
}) {
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [resetAcc, setResetAcc] = useState<AccountRow | null>(null);
  const [form] = Form.useForm();

  const reload = async () => {
    try { setAccounts(await adminList()); } catch (e: any) { setLoadError(e.message); }
  };
  useEffect(() => { reload(); }, []);

  const withAccount = new Set((accounts || []).map((a) => a.personId));
  const candidates = S.people.filter((p) => p.active && p.role !== 'field_tech' && !withAccount.has(p.id));

  const cols: ColumnsType<AccountRow> = [
    { title: tr(lang, 'th_name'), key: 'name', render: (_, a) => a.personName },
    { title: tr(lang, 'admin_username'), dataIndex: 'username', key: 'username' },
    { title: tr(lang, 'th_role'), key: 'role', render: (_, a) => tRoleDesc(lang, a.personRole) },
    { title: tr(lang, 'dept_label'), key: 'dept', render: (_, a) => tDept(lang, a.personDepartment) },
    { title: tr(lang, 'admin_is_admin'), key: 'admin', render: (_, a) => (a.isAdmin ? tr(lang, 'admin_yes') : tr(lang, 'admin_no')) },
    { title: tr(lang, 'status_col'), key: 'status', render: (_, a) => (a.disabled ? tr(lang, 'admin_disabled') : a.mustChangePassword ? tr(lang, 'admin_must_change') : '–') },
    {
      title: '', key: 'actions', render: (_, a) => (
        <span>
          <Button type="link" size="small" onClick={() => setResetAcc(a)}>{tr(lang, 'admin_reset_pw')}</Button>{' '}
          <Button type="link" size="small" danger={a.disabled ? false : true} onClick={() => {
            modal.confirm({
              title: a.disabled ? tr(lang, 'admin_enable') : tr(lang, 'admin_disable'),
              content: `${a.personName} (${a.username})`,
              okText: a.disabled ? tr(lang, 'admin_enable') : tr(lang, 'admin_disable'),
              okType: a.disabled ? 'primary' : 'danger',
              onOk: async () => {
                try { await adminSetDisabled(a.id, !a.disabled); reload(); } catch (e: any) { toast(e.message, false); }
              },
            });
          }}>{a.disabled ? tr(lang, 'admin_enable') : tr(lang, 'admin_disable')}</Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <h2>{tr(lang, 'admin_title')}</h2>
      <p className="muted">{tr(lang, 'admin_sub')}</p>
      {loadError
        ? <Alert type="error" showIcon message={loadError} />
        : accounts === null
          ? <p className="muted">Loading…</p>
          : accounts.length
            ? <Table<AccountRow> rowKey="id" dataSource={accounts} columns={cols} pagination={false} scroll={{ x: 720 }} />
            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr(lang, 'admin_no_accounts')} />}
      <Card className="panel-card" title={tr(lang, 'admin_new')}>
        <Form form={form} layout="vertical" onFinish={async (values: any) => {
          try {
            await adminCreate(Number(values.personId), String(values.username).trim(), String(values.password), !!values.isAdmin);
            toast(tr(lang, 'admin_created'));
            form.resetFields();
            reload();
          } catch (e: any) { toast(e.message, false); }
        }}>
          <div className="form-grid">
            <Form.Item name="personId" label={tr(lang, 'admin_person')} rules={[{ required: true, message: tr(lang, 'admin_pick_person') }]}>
              <Select placeholder={tr(lang, 'admin_pick_person')}
                options={candidates.map((p) => ({ value: String(p.id), label: `${p.name} (${tDept(lang, p.department)})` }))} />
            </Form.Item>
            <Form.Item name="username" label={tr(lang, 'admin_username')} rules={[{ required: true, message: tr(lang, 'admin_username') }]}>
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item name="password" label={tr(lang, 'admin_first_pw')} rules={[{ required: true, message: tr(lang, 'admin_first_pw') }, { min: 8, message: tr(lang, 'change_pw_short') }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="isAdmin" valuePropName="checked">
              <Checkbox>{tr(lang, 'admin_is_admin')}</Checkbox>
            </Form.Item>
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<KeyOutlined />}>{tr(lang, 'admin_create_btn')}</Button>
          </Form.Item>
        </Form>
      </Card>
      <PromptModal open={!!resetAcc} title={tr(lang, 'admin_reset_pw')} label={tr(lang, 'admin_new_pw')} password
        onOk={async (pw) => {
          const a = resetAcc!; setResetAcc(null);
          try { await adminResetPassword(a.id, pw); toast(tr(lang, 'admin_reset_done')); reload(); } catch (e: any) { toast(e.message, false); }
        }}
        onCancel={() => setResetAcc(null)} />
    </div>
  );
}

export function LogoutButton({ lang, onClick }: { lang: Lang; onClick: () => void }) {
  return (
    <Button ghost icon={<LogoutOutlined />} aria-label={tr(lang, 'logout_btn')} onClick={onClick}>
      {tr(lang, 'logout_btn')}
    </Button>
  );
}
