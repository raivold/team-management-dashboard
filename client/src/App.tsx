// Team Management Dashboard — React frontend (v2.1.0), Ant Design restyle.
// Same API, same data, same features as before: Overview, Kanban, Log
// (monthly report) + shift import, Materials daily cycle, Team, evidence
// photos, EN/ID + dark/light toggles, "Acting as". All rules are enforced
// server-side; the UI only reflects them.
// antd owns the components it has (Layout/Sider/Menu, Table, Modal,
// Button, Select, Input, Segmented, Tag, Badge, Statistic, notification);
// the Kanban drag-and-drop and the Log month grid stay custom code inside
// the antd layout, because antd has no Kanban/calendar-grid that fits.
// Theme tokens keep the dashboard's navy/teal identity, not antd's
// default blue. Dark mode uses antd's dark algorithm.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  App as AntdApp, Badge, Button, Card, ConfigProvider, Input, Layout, Menu,
  Modal, Segmented, Select, Statistic, Table, Tag, theme as antdTheme,
} from 'antd';
import type { MenuProps, MenuRef, ThemeConfig } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import enUS from 'antd/locale/en_US';
import idID from 'antd/locale/id_ID';
import {
  AppstoreOutlined, CameraOutlined, DashboardOutlined, DeleteOutlined,
  EditOutlined, HistoryOutlined, InboxOutlined, MenuOutlined, MoonOutlined,
  PlusOutlined, SearchOutlined, SunOutlined, TeamOutlined,
} from '@ant-design/icons';
import { api, fetchState } from './api';
import {
  tr, tCol, tPri, tKind, tDept, tRole, tStatus, isEntryColumn, todayStr, ydayStr,
  type ConfirmFn, type DailyLine, type Lang, type State, type Task, type Column,
} from './lib';
import { LogView, MaterialsView, type ViewCtx } from './CalendarMaterials';
import { TeamView } from './TeamActivity';
import { TaskDetail, NewTaskForm, type ModalCtx } from './TaskModal';
import PromptModal from './PromptModal';

type View = 'overview' | 'board' | 'log' | 'materials' | 'team';
const VIEWS: View[] = ['overview', 'board', 'log', 'materials', 'team'];

// ---- antd theme: the dashboard's own palette as seed tokens ----
// colorPrimary #1466c2 (existing primary blue), colorSuccess #2e7d6b
// (existing teal), colorError #b42318 (existing red), colorWarning
// #b45309 (the warnbox amber). controlHeight 44 keeps every control on
// the 44px tap-target rule; controlHeightSM 44 keeps small buttons at
// 44px too (the v2.0.2 finding-5 fix). borderRadius 10 matches the
// existing 10px control radius. colorBgLayout is the page background
// (#f4f6f8 light, #0e1626 dark); colorBorder keeps the v2.0.2 border
// tokens (#71809a light, #7c8aa0 dark) instead of antd's pale defaults,
// so input/card/table borders still meet 3:1. Dark link colours are
// overridden to the light blue #7fb3ec: antd's dark algorithm derives a
// dark link blue from the seed, which is unreadable as text on dark
// surfaces (the old CSS used #7fb3ec for the same reason).
const SEED_TOKENS = {
  colorPrimary: '#1466c2',
  colorSuccess: '#2e7d6b',
  colorError: '#b42318',
  colorWarning: '#b45309',
  colorInfo: '#1466c2',
  colorLink: '#1466c2',
  borderRadius: 10,
  controlHeight: 44,
  controlHeightSM: 44,
  fontFamily: 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
};
const LIGHT_THEME: ThemeConfig = {
  token: { ...SEED_TOKENS, colorBgBase: '#ffffff', colorBgLayout: '#f4f6f8', colorBorder: '#71809a', colorBorderSecondary: '#71809a' },
  algorithm: antdTheme.defaultAlgorithm,
  components: {
    // Sidebar Menu: navy selected item, white text (the old pill-nav
    // active state), light hover. Item height 48 matches the old
    // sidebar-item min-height; icon size 18 matches the old glyphs.
    Menu: { itemHeight: 48, iconSize: 18, itemBg: '#ffffff', itemSelectedBg: '#12233a', itemSelectedColor: '#ffffff', itemHoverBg: '#eceff3', itemActiveBg: '#eceff3', itemColor: '#334155' },
    Table: { headerBg: '#f8fafc', headerColor: '#475569' },
  },
};
const DARK_THEME: ThemeConfig = {
  token: {
    ...SEED_TOKENS, colorBgBase: '#0e1626', colorBgLayout: '#0e1626',
    colorBorder: '#7c8aa0', colorBorderSecondary: '#7c8aa0',
    colorLink: '#7fb3ec', colorLinkHover: '#a8c8f5', colorLinkActive: '#5b9bd5', colorPrimaryText: '#7fb3ec',
  },
  algorithm: antdTheme.darkAlgorithm,
  components: {
    // Dark sidebar: #16233a surface (the old dark sidebar background),
    // blue #1466c2 selected item (the old dark active state).
    Menu: { itemHeight: 48, iconSize: 18, itemBg: '#16233a', itemSelectedBg: '#1466c2', itemSelectedColor: '#ffffff', itemHoverBg: '#24365a', itemActiveBg: '#24365a', itemColor: '#cbd5e1' },
    Table: { headerBg: '#1e2f4d', headerColor: '#94a3b8', rowHoverBg: '#1e2f4d' },
  },
};

// Sidebar badges: tasks waiting for approval (review column) and
// material days that need a Warehouse check (flagged, or submitted
// with a variance). Open days are still being logged, so they are not
// flagged. A badge shows only when its count is above zero.
export function navCounts(S: State): { pending: number; flagged: number } {
  const colById = (id: number) => S.columns.find((c) => c.id === id);
  const pending = S.tasks.filter((x) => colById(x.columnId)?.kind === 'review').length;
  const flagged = S.materialDays.filter((d) => d.status === 'flagged' || (d.status === 'submitted' && d.lines.some((l) => (l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0)) !== 0))).length;
  return { pending, flagged };
}

function loadLang(): Lang {
  try { const l = localStorage.getItem('tmd-lang'); if (l === 'en' || l === 'id') return l; } catch { /* ignore */ }
  return 'en';
}
function loadTheme(): 'light' | 'dark' {
  try { const t = localStorage.getItem('tmd-theme'); if (t === 'dark' || t === 'light') return t; } catch { /* ignore */ }
  return 'light';
}
function loadCollapsed(): boolean {
  try { return localStorage.getItem('tmd-sidebar-collapsed') === '1'; } catch { /* ignore */ }
  return false;
}

// Outer shell: ConfigProvider (theme + locale) and antd's App context
// (message/notification/modal APIs) wrap the dashboard. Language and
// theme live here because ConfigProvider needs them; everything else
// lives in Dashboard below.
export default function App() {
  const [lang, setLangState] = useState<Lang>(loadLang);
  const [theme, setThemeState] = useState<'light' | 'dark'>(loadTheme);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('tmd-lang', l); } catch { /* ignore */ } };
  const setTheme = (t: 'light' | 'dark') => { setThemeState(t); try { localStorage.setItem('tmd-theme', t); } catch { /* ignore */ } };
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { document.documentElement.lang = lang === 'id' ? 'id' : 'en'; }, [lang]);
  return (
    <ConfigProvider locale={lang === 'id' ? idID : enUS} theme={theme === 'dark' ? DARK_THEME : LIGHT_THEME}>
      <AntdApp>
        <Dashboard lang={lang} theme={theme} setLang={setLang} setTheme={setTheme} />
      </AntdApp>
    </ConfigProvider>
  );
}

function Dashboard({ lang, theme, setLang, setTheme }: {
  lang: Lang; theme: 'light' | 'dark';
  setLang: (l: Lang) => void; setTheme: (t: 'light' | 'dark') => void;
}) {
  const [S, setS] = useState<State | null>(null);
  const [loadError, setLoadError] = useState('');
  const [actorId, setActorId] = useState(() => { try { return Number(localStorage.getItem('actorId') || 1); } catch { return 1; } });
  const [view, setViewState] = useState<View>('overview');
  const [collapsed, setCollapsedState] = useState(loadCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width:700px)').matches);
  const [boardFilter, setBoardFilter] = useState('');
  const [modal, setModal] = useState<{ kind: 'task'; id: number } | { kind: 'new'; columnId: number | null } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const prevViewRef = useRef<View | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  // How the phone drawer was closed: 'nav' (a destination was picked,
  // focus belongs in the new view) or 'other' (Escape / backdrop /
  // close button, focus returns to the hamburger).
  const drawerCloseReason = useRef<'nav' | 'other'>('other');

  // Toasts via antd notification, bottom centre like the old toast.
  // Success auto-dismisses after 3.5s; errors stay until dismissed.
  // notification (not message) for both: antd's message holder hard-codes
  // closable:false, so a duration-0 error message would have no way to
  // dismiss it; notification always renders a close button.
  const { notification: notifApi, modal: modalApi } = AntdApp.useApp();
  const toast = useCallback((text: string, ok = true) => {
    if (ok) notifApi.success({ message: text, duration: 3.5, placement: 'bottom' });
    else notifApi.error({ message: text, duration: 0, placement: 'bottom' });
  }, [notifApi]);

  const refresh = useCallback(async (actor: number) => {
    const s = await fetchState(actor);
    setS(s);
    return s;
  }, []);

  useEffect(() => {
    refresh(actorId).catch((e: any) => setLoadError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the phone breakpoint: the same hamburger toggles the desktop
  // collapse and opens the phone drawer, so it needs to know which one.
  useEffect(() => {
    const mq = window.matchMedia('(max-width:700px)');
    const onChange = () => setIsPhone(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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

  // Phone drawer: Escape closes, focus moves into the drawer on open and
  // returns on close (to the hamburger, or into the new view when the
  // drawer closed because a destination was picked). The page behind the
  // drawer does not scroll while it is open. antd Modal handles the
  // task modal's Escape/focus behaviour natively, so there is no custom
  // dialog effect for it any more.
  useEffect(() => {
    if (!drawerOpen || !isPhone) return;
    sidebarRef.current?.querySelector<HTMLElement>('.ant-menu-item')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { drawerCloseReason.current = 'other'; setDrawerOpen(false); } };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (drawerCloseReason.current === 'nav') mainRef.current?.focus();
      else hamburgerRef.current?.focus();
      drawerCloseReason.current = 'other';
    };
  }, [drawerOpen, isPhone]);

  if (!S) {
    return <main>
      {loadError
        ? <><p>{tr(lang, 'failed_load')}{loadError}</p>
          <p><Button type="primary" onClick={() => { setLoadError(''); refresh(actorId).catch((e: any) => setLoadError(e.message)); }}>{tr(lang, 'retry')}</Button></p></>
        : <p>Loading dashboard…</p>}
    </main>;
  }

  const actor = S.people.find((p) => p.id === actorId) || S.people[0];
  const isWM = actor.role === 'warehouse_manager';
  const currentView: View = isWM ? 'materials' : view;
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const colById = (id: number) => S.columns.find((c) => c.id === id);
  const canApproveTask = (t: Task) => actor.role === 'head_noc' || (actor.role === 'osp' && t.createdById === actor.id);

  const { pending: pendingCount, flagged: flaggedCount } = navCounts(S);

  const setCollapsed = (c: boolean) => { setCollapsedState(c); try { localStorage.setItem('tmd-sidebar-collapsed', c ? '1' : '0'); } catch { /* ignore */ } };
  const switchView = (v: View) => setViewState(isWM ? 'materials' : v);
  // One button, two jobs: on desktop it collapses the sidebar to icons
  // only; on phone it opens the sidebar as a drawer (closed by default).
  const toggleSidebar = () => {
    if (isPhone) { drawerCloseReason.current = 'other'; setDrawerOpen((o) => !o); }
    else setCollapsed(!collapsed);
  };

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
    S, lang, actorId, setState: setS, toast, openTask, modal: modalApi,
  };
  const modalTask = modal?.kind === 'task' ? S.tasks.find((t) => t.id === modal.id) : undefined;
  const modalCtx: ModalCtx = {
    S, lang, actorId, setState: setS, toast, moveTask, modal: modalApi,
    close: () => setModal(null),
    afterDelete: () => { refresh(actorId).catch(() => undefined); },
  };

  return (
    <div>
      <a className="skip-link" href="#main">{tr(lang, 'skip_to_content')}</a>
      <header className="topbar">
        <div className="topbar-left">
          <Button type="text" ref={hamburgerRef} className="hamburger-antd" icon={<MenuOutlined />} aria-label={tr(lang, 'menu_btn')} aria-expanded={isPhone ? drawerOpen : !collapsed} aria-controls="sidebar" title={tr(lang, 'menu_btn')} onClick={toggleSidebar} />
          <div>
            <h1>Team Management Dashboard</h1>
            <p className="sub">{tr(lang, 'subtitle')}</p>
          </div>
        </div>
        <div className="actor">
          <Segmented options={[{ label: 'EN', value: 'en' }, { label: 'ID', value: 'id' }]} value={lang} onChange={(v) => setLang(v as Lang)} aria-label="Language / Bahasa" />
          <Button ghost icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />} aria-label="Toggle dark / light mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? tr(lang, 'theme_light') : tr(lang, 'theme_dark')}
          </Button>
          <label htmlFor="actorSelect">{tr(lang, 'acting_as')}</label>
          <Select id="actorSelect" value={actorId} style={{ width: 240 }}
            options={S.people.filter((p) => p.active && p.role !== 'field_tech').map((p) => ({ value: p.id, label: `${p.name} · ${tDept(lang, p.department)}` }))}
            onChange={(id) => {
              setActorId(id);
              try { localStorage.setItem('actorId', String(id)); } catch { /* ignore */ }
              refresh(id).catch((err: any) => toast(err.message, false));
            }} />
          <Tag style={{ background: '#2e7d6b', color: '#fff', borderColor: '#2e7d6b' }}>{tDept(lang, actor.department)} · {tRole(lang, actor.role)}</Tag>
          <Tag style={{ background: '#8a6d00', color: '#fff', borderColor: '#8a6d00' }}>{tr(lang, 'demo_badge')}</Tag>
        </div>
      </header>
      <Layout>
        <Sidebar
          lang={lang} currentView={currentView} isWM={isWM}
          collapsed={collapsed} drawerOpen={drawerOpen} isPhone={isPhone} isDark={theme === 'dark'}
          pendingCount={pendingCount} flaggedCount={flaggedCount}
          sidebarRef={sidebarRef}
          onNavigate={(v) => { drawerCloseReason.current = 'nav'; switchView(v); setDrawerOpen(false); }}
          onCloseDrawer={() => { drawerCloseReason.current = 'other'; setDrawerOpen(false); }}
        />
        {drawerOpen && isPhone && <div className="sidebar-backdrop" aria-hidden="true" onClick={() => { drawerCloseReason.current = 'other'; setDrawerOpen(false); }} />}
        <Layout.Content id="main" ref={mainRef} tabIndex={-1} className="main-content">
          {currentView === 'overview' && <Overview S={S} lang={lang} openTask={openTask} />}
          {currentView === 'board' && (
            <section>
              <div className="board-toolbar">
                <BoardAddColumn lang={lang} toast={toast} setState={setS} actorId={actorId} />
                <Input id="board-filter" className="board-filter" prefix={<SearchOutlined />} allowClear aria-label={tr(lang, 'filter_ph')} placeholder={tr(lang, 'filter_ph')} value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)} />
              </div>
              <Board S={S} lang={lang} filter={boardFilter} openTask={openTask} moveTask={moveTask} newTask={(colId) => setModal({ kind: 'new', columnId: colId })} toast={toast} setState={setS} actorId={actorId} modalApi={modalApi} />
            </section>
          )}
          {currentView === 'log' && <LogView ctx={viewCtx} />}
          {currentView === 'materials' && <MaterialsView ctx={viewCtx} />}
          {currentView === 'team' && <TeamView S={S} lang={lang} />}
        </Layout.Content>
      </Layout>

      {/* Task / new-task dialog: antd Modal owns Escape, mask click,
        focus trap and the close button. The title is the Modal header,
        so TaskDetail / NewTaskForm no longer render their own h2. */}
      {modal && (
        <Modal open={!!modal} title={modal.kind === 'task' ? (modalTask?.title || tr(lang, 'new_task_title')) : tr(lang, 'new_task_title')}
          onCancel={() => setModal(null)} footer={null} width={720} destroyOnClose>
          {modal.kind === 'task' && modalTask
            ? <TaskDetail key={modalTask.id + '-' + modalTask.files.length + '-' + modalTask.materials.length} task={modalTask} ctx={modalCtx} />
            : modal.kind === 'task' ? <p className="muted">Task not found.</p>
            : <NewTaskForm columnId={modal.columnId} ctx={modalCtx} />}
        </Modal>
      )}
    </div>
  );
}

// ---- Sidebar ----
// antd Sider + Menu on desktop; the same Menu inside the custom phone
// drawer (the drawer keeps the <nav> landmark, not role="dialog", per
// the R-39 decision — antd's Drawer would impose role="dialog").
// Icons are antd icons, not the old text glyphs. The brand block reuses
// the org name, as the prototype does; the tile is a plain initial, not
// invented logo art (R-23).
// No settings / help / logout / promo block: the app has none of those
// features, and dead controls are forbidden (R-24, R-26). No project
// or department section list either: the Team view already groups by
// department.
const NAV_ICONS: Record<View, React.ReactNode> = {
  overview: <DashboardOutlined />, board: <AppstoreOutlined />, log: <HistoryOutlined />, materials: <InboxOutlined />, team: <TeamOutlined />,
};
const NAV_COUNT: Record<View, 'pending' | 'flagged' | null> = {
  overview: null, board: 'pending', log: null, materials: 'flagged', team: null,
};

export function Sidebar({ lang, currentView, isWM, collapsed, drawerOpen, isPhone, isDark, pendingCount, flaggedCount, sidebarRef, onNavigate, onCloseDrawer }: {
  lang: Lang; currentView: View; isWM: boolean;
  collapsed: boolean; drawerOpen: boolean; isPhone: boolean; isDark: boolean;
  pendingCount: number; flaggedCount: number;
  sidebarRef: { current: HTMLElement | null };
  onNavigate: (v: View) => void; onCloseDrawer: () => void;
}) {
  const items: MenuProps['items'] = VIEWS.filter((v) => !isWM || v === 'materials').map((v) => {
    const count = NAV_COUNT[v] === 'pending' ? pendingCount : NAV_COUNT[v] === 'flagged' ? flaggedCount : 0;
    return {
      key: v,
      icon: NAV_ICONS[v],
      // The count badge lives inside the label, so the item's accessible
      // name carries it ("Board 2"). Collapsed, antd shows the icon only
      // and the label (badge included) becomes the hover tooltip — the
      // same as the old collapsed sidebar, which hid the counts.
      label: (<span className="menu-label"><span>{tr(lang, 'nav_' + v)}</span>{count > 0 && <Badge count={count} size="small" color="#b42318" />}</span>),
    };
  });
  const menuRef = useRef<MenuRef>(null);
  // rc-menu marks the selected item with a class only — no aria-selected
  // or aria-current — so the current view would be invisible to
  // assistive tech. Restore the old sidebar's aria-current="page" on
  // the selected item after every render that can change it.
  useEffect(() => {
    const el = menuRef.current?.menu?.list?.querySelector('.ant-menu-item-selected');
    el?.setAttribute('aria-current', 'page');
    return () => { el?.removeAttribute('aria-current'); };
  }, [currentView, collapsed, isPhone, drawerOpen]);
  const menu = (
    <Menu ref={menuRef} mode="inline" theme="light" items={items} selectedKeys={[currentView]}
      inlineCollapsed={!isPhone && collapsed}
      onClick={({ key }) => onNavigate(key as View)}
      style={{ background: 'transparent', borderInlineEnd: 'none' }} />
  );
  const brand = (
    <div className="sidebar-brand">
      <span className="brand-tile" aria-hidden="true">P</span>
      <span className="brand-name">PT Sakti Wijaya Network</span>
    </div>
  );
  if (isPhone) {
    return (
      <nav id="sidebar" ref={sidebarRef} className={`sidebar${drawerOpen ? ' drawer-open' : ''}`} aria-label={tr(lang, 'nav_main')}>
        {brand}
        <button type="button" className="sidebar-close" aria-label={tr(lang, 'close_dialog')} onClick={onCloseDrawer}>✕</button>
        {menu}
      </nav>
    );
  }
  return (
    <Layout.Sider id="sidebar" width={232} collapsedWidth={64} collapsible collapsed={collapsed} trigger={null} theme="light"
      style={{ background: isDark ? '#16233a' : '#ffffff' }} className="sidebar-antd" aria-label={tr(lang, 'nav_main')}>
      {brand}
      {menu}
    </Layout.Sider>
  );
}

// Add-column button + prompt, kept separate so Board stays focused on
// the columns themselves.
function BoardAddColumn({ lang, toast, setState, actorId }: {
  lang: Lang; toast: (msg: string, ok?: boolean) => void; setState: (s: State) => void; actorId: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon={<PlusOutlined />} onClick={() => setOpen(true)}>{tr(lang, 'add_column')}</Button>
      <PromptModal open={open} title={tr(lang, 'add_column')} label={tr(lang, 'new_col_name')}
        onOk={async (name) => {
          setOpen(false);
          try { const s = await api('/api/columns', 'POST', { name }, actorId); setState(s); } catch (e: any) { toast(e.message, false); }
        }}
        onCancel={() => setOpen(false)} />
    </>
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
  const matCols: ColumnsType<DailyLine> = [
    { title: tr(lang, 'th_item'), dataIndex: 'name', key: 'name' },
    { title: tr(lang, 'th_issued'), key: 'issued', render: (_, l) => `${l.issuedQty} ${l.unit}` },
    { title: tr(lang, 'th_used'), key: 'used', render: (_, l) => l.usedQty ?? '–' },
    { title: tr(lang, 'th_returned'), key: 'returned', render: (_, l) => l.returnedQty ?? '–' },
    { title: tr(lang, 'th_variance'), key: 'var', render: (_, l) => { const v = l.issuedQty - (l.usedQty || 0) - (l.returnedQty || 0); return <span className={v ? 'var-bad' : 'var-ok'}>{v}</span>; } },
    { title: tr(lang, 'th_where'), dataIndex: 'note', key: 'where', render: (v) => v || '' },
  ];
  return (
    <div>
      <h2>{tr(lang, 'overview_title')}</h2>
      <p className="muted">{y} → {t} · {tr(lang, 'overview_sub')}</p>
      <div className="cards">
        <Card className="stat-ok"><Statistic title={tr(lang, 'done_yesterday')} value={doneY.length} /></Card>
        <Card><Statistic title={tr(lang, 'due_today')} value={dueT.length} /></Card>
        <Card className={overdue.length ? 'stat-warn' : ''}><Statistic title={tr(lang, 'overdue')} value={overdue.length} /></Card>
        <Card><Statistic title={tr(lang, 'mat_used_yday')} value={usedY} /></Card>
        <Card><Statistic title={tr(lang, 'on_shift_today')} value={onShift.length} /></Card>
        <Card className={attention.length ? 'stat-warn' : ''}><Statistic title={tr(lang, 'needs_attention')} value={attention.length} /></Card>
      </div>
      <Card className="panel-card" title={tr(lang, 'done_yesterday_h')}>
        {doneY.length ? <ul>{doneY.map((x) => <li key={x.id}>{x.title} · {personName(x.assigneeId)}</li>)}</ul> : <p className="muted">{tr(lang, 'nothing_done_yday')}</p>}
      </Card>
      <Card className="panel-card" title={tr(lang, 'due_today_h')}>
        {dueT.length ? <ul>{dueT.map((x) => <li key={x.id}><Button type="link" className="link-btn" onClick={() => openTask(x.id)}>{x.title}</Button> · {personName(x.assigneeId)} · {x.location || ''}</li>)}</ul> : <p className="muted">{tr(lang, 'nothing_due_today')}</p>}
        {overdue.length > 0 && <><h3>{tr(lang, 'overdue_h')}</h3><ul>{overdue.map((x) => <li key={x.id}>{x.title} · {tr(lang, 'due_prefix')} {x.dueDate}</li>)}</ul></>}
      </Card>
      <Card className="panel-card" title={`${tr(lang, 'onboard_h')} (${t})`}>
        {onShift.length ? <ul>{onShift.map((s) => <li key={s.id}>{personName(s.personId)} · {s.shiftName} {s.startTime}–{s.endTime} ({tDept(lang, s.department)})</li>)}</ul> : <p className="muted">{tr(lang, 'no_shifts_today')}</p>}
      </Card>
      <Card className="panel-card" title={tr(lang, 'mat_out_yday')}>
        {matY ? <>
          <Table<DailyLine> rowKey="id" dataSource={matY.lines} columns={matCols} pagination={false} scroll={{ x: 640 }} />
          <p className="muted">{tr(lang, 'status_label')}: {tStatus(lang, matY.status)}{matY.status === 'approved' ? ' ' + tr(lang, 'by_label') + ' ' + personName(matY.checkedById) : ''}</p>
        </> : <p className="muted">{tr(lang, 'no_mat_yday')}</p>}
      </Card>
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
      onClick={(e) => { if ((e.target as HTMLElement).closest('select,input,button,textarea,.ant-select,.ant-picker,.ant-input-number')) return; openTask(task.id); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTask(task.id); } }}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}>
      <div className="t">{task.title}</div>
      <div className="m">{task.customer || task.location || ''}</div>
      <div className="m">
        {task.priority === 'urgent'
          ? <Tag color="#b42318" style={{ color: '#fff', borderColor: '#b42318' }}>{tPri(lang, task.priority)}</Tag>
          : task.priority === 'high'
            ? <Tag color="red">{tPri(lang, task.priority)}</Tag>
            : <Tag>{tPri(lang, task.priority)}</Tag>}
        <Tag>{tKind(lang, task.taskKind)}</Tag>
        {task.dueDate ? <span>{tr(lang, 'due_prefix')} {task.dueDate}</span> : null}
      </div>
      <div className="m">{personName(task.assigneeId)} · {task.department || ''}</div>
      {ev > 0 && <div className="badge-cam"><CameraOutlined /> {ev} {lang === 'id' ? 'foto bukti' : 'evidence'}</div>}
      <div className="m">
        <Select size="small" style={{ width: '100%' }} placeholder={tr(lang, 'move_to')} aria-label={tr(lang, 'move_to_label')} value={undefined}
          options={S.columns.map((c) => ({ value: c.id, label: tCol(lang, c.name), disabled: c.id === col.id }))}
          onChange={(v) => moveTask(task.id, v)} />
      </div>
    </div>
  );
}

function Board({ S, lang, filter, openTask, moveTask, newTask, toast, setState, actorId, modalApi }: {
  S: State; lang: Lang; filter: string; openTask: (id: number) => void;
  moveTask: (id: number, columnId: number) => Promise<void>;
  newTask: (columnId: number) => void; toast: (msg: string, ok?: boolean) => void;
  setState: (s: State) => void; actorId: number; modalApi: ConfirmFn;
}) {
  const q = filter.toLowerCase();
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const tasks = S.tasks.filter((t) => !q || [t.title, t.customer, t.location, t.serviceId, personName(t.assigneeId)].join(' ').toLowerCase().includes(q));
  const [renameCol, setRenameCol] = useState<Column | null>(null);
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
                <Button type="text" size="small" icon={<EditOutlined />} aria-label={tr(lang, 'rename_column')} onClick={(e) => { e.stopPropagation(); setRenameCol(c); }} />{' '}
                <Button type="text" size="small" icon={<DeleteOutlined />} aria-label={tr(lang, 'delete_column')} onClick={(e) => {
                  e.stopPropagation();
                  modalApi.confirm({
                    title: tr(lang, 'del_col_confirm'), okText: tr(lang, 'delete_column'), okType: 'danger',
                    onOk: async () => {
                      try { const s = await api(`/api/columns/${c.id}`, 'DELETE', {}, actorId); setState(s); } catch (err: any) { toast(err.message, false); }
                    },
                  });
                }} />
              </span>
            </h3>
            {list.length ? list.map((t) => <TaskCard key={t.id} task={t} S={S} lang={lang} openTask={openTask} moveTask={moveTask} />) : <p className="muted">{tr(lang, 'empty_col')}</p>}
            {isEntryColumn(c) && <Button type="primary" block onClick={() => newTask(c.id)}>{tr(lang, 'new_task')}</Button>}
          </div>
        );
      })}
      <PromptModal open={!!renameCol} title={tr(lang, 'rename_column')} label={tr(lang, 'rename_col')} initialValue={renameCol?.name || ''}
        onOk={async (name) => {
          const c = renameCol!; setRenameCol(null);
          try { const s = await api(`/api/columns/${c.id}`, 'PATCH', { name }, actorId); setState(s); } catch (err: any) { toast(err.message, false); }
        }}
        onCancel={() => setRenameCol(null)} />
    </div>
  );
}
