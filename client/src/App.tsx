// Team Management Dashboard — React frontend (v2.1.0), Ant Design restyle.
// Same API, same data, same features as before: Overview, Kanban, Log
// (monthly report) + shift import, Materials daily cycle, Team, evidence
// photos, EN/ID + dark/light toggles, "Acting as". All rules are enforced
// server-side; the UI only reflects them.
// antd owns the components it has (Layout/Sider/Menu, Table, Modal,
// Button, Select, Input, Segmented, Tag, Badge, Statistic, notification);
// the Kanban drag-and-drop and the Log month grid stay custom code inside
// the antd layout, because antd has no Kanban/calendar-grid that fits.
// Theme tokens use Catppuccin (Latte light, Mocha dark) with a teal
// primary; dark mode uses antd's dark algorithm.
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
  EditOutlined, HistoryOutlined, InboxOutlined, KeyOutlined, MenuOutlined, MoonOutlined,
  PlusOutlined, SearchOutlined, SunOutlined, TeamOutlined,
} from '@ant-design/icons';
import { api, fetchState, getMe, logout, setOnAuthError, AuthError, type Me } from './api';
import { AdminView, ChangePasswordForm, LoginPage, LogoutButton } from './Auth';
import {
  tr, tCol, tPri, tKind, tDept, tRole, tStatus, isEntryColumn, todayStr, ydayStr,
  type ConfirmFn, type DailyLine, type Lang, type State, type Task, type Column,
} from './lib';
import { LogView, MaterialsView, type ViewCtx } from './CalendarMaterials';
import { TeamView } from './TeamActivity';
import { TaskDetail, NewTaskForm, type ModalCtx } from './TaskModal';
import PromptModal from './PromptModal';

type View = 'overview' | 'board' | 'log' | 'materials' | 'team' | 'admin';
const VIEWS: View[] = ['overview', 'board', 'log', 'materials', 'team'];

// ---- antd theme: Catppuccin palette (Latte light, Mocha dark), teal primary ----
// Palette source: https://raw.githubusercontent.com/catppuccin/palette/main/palette.json
// v1.8.0 (repo catppuccin/palette). Latte teal #179299, Mocha teal #94e2d5.
// Same seeds as the prototype migration, so the two versions match:
// raw Latte accents fail as text on white (teal #179299 3.74:1, green
// #40a02b 3.34:1, peach #fe640b 2.98:1), so the seeds are documented
// darkened derivatives — light primary #0b6a73 is antd's own derivation
// of Latte teal, dark primary seed #179299 derives #177f85 with text
// #94e2d5. controlHeight 44 keeps every control on the 44px tap-target
// rule; controlHeightSM 44 keeps small buttons at 44px too (the v2.0.2
// finding-5 fix). borderRadius 10 matches the existing 10px control
// radius. The navy identity is gone by design: Mocha's darkest is
// crust #11111b, near-black with a purple tint, not navy.
// Contrast: text-facing tokens use same-hue darkened overrides (green
// #2d701e 6.09:1, warning #b93d00 5.15:1 on its bg, info #0f6478
// 6.02:1 on its bg, error text #ab032d 6.37:1 on its bg). Mocha
// accents all pass as text on base. The dark algorithm derives
// colorLink from its input token (#94e2d5 -> #81c3b8, 8.15:1 on base);
// with the seed #177f85 as the input it derives to #176f74 (3.46:1,
// fails), so the dark colorLink input is the raw Mocha teal, not the
// seed. Every other pinned token below was verified to stick via
// theme.getDesignToken. Dark danger buttons use Latte red #d20f39 via
// the Button component token: Mocha red #f38ba8 is too light for the
// white solid text (3.04:1 on the effective #d27992), while Latte red
// is 5.43:1. All 84 checked pairs pass (see /tmp/catppuccin-pairs.py).
const SEED_TOKENS = {
  colorPrimary: '#0b6a73',
  colorSuccess: '#40a02b',
  colorError: '#d20f39',
  colorWarning: '#fe640b',
  colorInfo: '#209fb5',
  colorLink: '#0b6a73',
  borderRadius: 10,
  controlHeight: 44,
  controlHeightSM: 44,
  fontFamily: 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
};
export const LIGHT_THEME: ThemeConfig = {
  token: {
    ...SEED_TOKENS,
    colorBgBase: '#ffffff', colorBgLayout: '#eff1f5',
    colorBorder: '#5c5f77', colorBorderSecondary: '#5c5f77',
    colorText: '#4c4f69', colorTextSecondary: '#5c5f77', colorTextTertiary: '#5c5f77',
    colorTextPlaceholder: '#5c5f77',
    // Pinned derived tokens: the default algorithm derives muddy
    // mid-tone tints from a dark teal seed (colorPrimaryBg #a1b3b1,
    // 2.89:1 for primary text on it), so the tints and the text colours
    // that sit on them are pinned to measured values.
    colorPrimaryBg: '#d8ecec', colorPrimaryBgHover: '#c2e0de',
    colorPrimaryBorder: '#0b6a73', colorPrimaryBorderHover: '#217b80',
    colorPrimaryTextHover: '#0b6a73', colorLinkHover: '#0b6a73',
    colorSuccessBg: '#eef5eb', colorSuccessText: '#2d701e',
    colorErrorText: '#ab032d', colorErrorHover: '#c40e35',
    colorWarningText: '#b93d00', colorInfoText: '#0f6478',
  },
  algorithm: antdTheme.defaultAlgorithm,
  components: {
    // Sidebar Menu: teal selected item, white text; light hover.
    // Item height 48 matches the old sidebar-item min-height; icon
    // size 18 matches the old glyphs.
    Menu: { itemHeight: 48, iconSize: 18, itemBg: '#ffffff', itemSelectedBg: '#0b6a73', itemSelectedColor: '#ffffff', itemHoverBg: '#e6e9ef', itemActiveBg: '#e6e9ef', itemColor: '#4c4f69' },
    Table: { headerBg: '#e6e9ef', headerColor: '#5c5f77' },
  },
};
export const DARK_THEME: ThemeConfig = {
  token: {
    colorPrimary: '#179299',
    colorSuccess: '#a6e3a1',
    colorError: '#f38ba8',
    colorWarning: '#fab387',
    colorInfo: '#74c7ec',
    // colorLink input is #94e2d5 (raw Mocha teal): the dark algorithm
    // derives it to #81c3b8 (8.15:1 on base). With the seed #179299 as
    // the input it derives to #177f85 (3.46:1, fails), so the input
    // must be the light teal, not the seed.
    colorLink: '#94e2d5',
    borderRadius: 10,
    controlHeight: 44,
    controlHeightSM: 44,
    fontFamily: 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
    colorBgBase: '#1e1e2e', colorBgLayout: '#1e1e2e',
    colorBgContainer: '#313244', colorBgElevated: '#45475a',
    colorBorder: '#9399b2', colorBorderSecondary: '#9399b2',
    colorText: '#cdd6f4', colorTextSecondary: '#bac2de', colorTextTertiary: '#bac2de',
    colorTextPlaceholder: '#a6adc8', colorTextLightSolid: '#ffffff',
    // Pinned: the dark algorithm derives a near-black primary bg
    // (#153436) and dim primary text (#176f74, 2.26:1 on that bg), a
    // dim link hover (#154447) and a dim primary hover (#2d8485,
    // 4.45:1 with white text); the raw Mocha teal is pinned for the
    // text/border tokens (8.97:1 on the bg, 8.44:1 on surfaces).
    colorPrimaryText: '#94e2d5', colorPrimaryTextHover: '#94e2d5',
    colorPrimaryTextActive: '#94e2d5', colorPrimaryBorder: '#94e2d5',
    colorPrimaryBorderHover: '#94e2d5', colorPrimaryHover: '#14686d',
    colorLinkHover: '#94e2d5', colorLinkActive: '#94e2d5',
  },
  algorithm: antdTheme.darkAlgorithm,
  components: {
    // Dark sidebar: crust #11111b surface, teal selected item, crust text.
    // The Menu is theme="light" (see Sidebar), so the item* tokens
    // below apply in both modes; no darkItem* tokens are needed.
    Menu: { itemHeight: 48, iconSize: 18, itemBg: '#181825', itemSelectedBg: '#94e2d5', itemSelectedColor: '#11111b', itemHoverBg: '#313244', itemActiveBg: '#313244', itemColor: '#cdd6f4' },
    Table: { headerBg: '#313244', headerColor: '#a6adc8', rowHoverBg: '#45475a' },
    // Danger buttons: Latte red, because Mocha red is too light for
    // the white solid text (see the token comment above).
    Button: { colorError: '#d20f39', colorErrorHover: '#c40e35', colorErrorActive: '#ab032d' },
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
  // Theme switch: set data-theme in the same tick as the state change,
  // and suppress transitions for two frames. The flash in Rivaldo's
  // recording came from both halves: antd v5 components carry ~0.2s
  // background/color transitions, so a theme change cross-faded every
  // component through a washed-out grey, and data-theme was set in a
  // post-paint useEffect, so the custom CSS lagged one frame behind the
  // antd tokens. With data-theme set synchronously and transitions
  // killed during the switch (see .no-transition in styles.css), the
  // switch is instant. The useEffect stays for the initial load.
  const setTheme = (t: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.classList.add('no-transition');
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('no-transition')));
    setThemeState(t);
    try { localStorage.setItem('tmd-theme', t); } catch { /* ignore */ }
  };
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
  // Auth state: undefined = not checked yet, null = log in required,
  // Me = logged in (or demo mode, where me.demo is true and the old
  // "Acting as" switcher is the auth). In login mode actorId is the
  // logged-in person's id and is never changeable in the UI; in demo
  // mode it is the switcher value, as before.
  const [me, setMe] = useState<Me | null | undefined>(undefined);
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

  // Auth first, state second. A 401 anywhere (here or in any later
  // api() call, via setOnAuthError) drops back to the login page.
  useEffect(() => {
    setOnAuthError(() => { setMe(null); setS(null); });
    getMe().then((m) => {
      setMe(m);
      if (m.demo) {
        refresh(actorId).catch((e: any) => setLoadError(e.message));
      } else if (m.person) {
        setActorId(m.person.id);
        refresh(m.person.id).catch((e: any) => {
          if (e instanceof AuthError) setMe(null);
          else setLoadError(e.message);
        });
      }
    }).catch((e: any) => {
      if (e instanceof AuthError) setMe(null);
      else setLoadError(e.message);
    });
    return () => setOnAuthError(null);
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
    const shown: View = S.people.find((p) => p.id === actorId)?.role === 'warehouse_manager' && view !== 'admin' ? 'materials' : view;
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

  // Auth gates: still checking, log in required, or first log in /
  // reset password change, in that order. Only then the dashboard.
  if (me === undefined) {
    return <main><p>Loading dashboard…</p></main>;
  }
  if (me === null) {
    return (
      <LoginPage lang={lang} theme={theme} setLang={setLang} setTheme={setTheme} onLoggedIn={(m) => {
        setMe(m);
        if (m.person) {
          setActorId(m.person.id);
          if (!m.mustChangePassword) refresh(m.person.id).catch((e: any) => { if (e instanceof AuthError) setMe(null); else setLoadError(e.message); });
        }
      }} />
    );
  }
  if (me.mustChangePassword) {
    return (
      <ChangePasswordForm lang={lang} theme={theme} setLang={setLang} setTheme={setTheme} onDone={() => {
        setMe({ ...me, mustChangePassword: false });
        if (me.person) refresh(me.person.id).catch((e: any) => { if (e instanceof AuthError) setMe(null); else setLoadError(e.message); });
      }} />
    );
  }
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
  const currentView: View = isWM && view !== 'admin' ? 'materials' : view;
  const personName = (id: number | null | undefined) => S.people.find((p) => p.id === id)?.name || '–';
  const colById = (id: number) => S.columns.find((c) => c.id === id);
  const canApproveTask = (t: Task) => actor.role === 'head_noc' || (actor.role === 'osp' && t.createdById === actor.id);

  const { pending: pendingCount, flagged: flaggedCount } = navCounts(S);

  const setCollapsed = (c: boolean) => { setCollapsedState(c); try { localStorage.setItem('tmd-sidebar-collapsed', c ? '1' : '0'); } catch { /* ignore */ } };
  const switchView = (v: View) => setViewState(isWM && v !== 'admin' ? 'materials' : v);
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
          {me?.demo ? (
            <>
              <label htmlFor="actorSelect">{tr(lang, 'acting_as')}</label>
              <Select id="actorSelect" value={actorId} style={{ width: 240 }}
                options={S.people.filter((p) => p.active && p.role !== 'field_tech').map((p) => ({ value: p.id, label: `${p.name} · ${tDept(lang, p.department)}` }))}
                onChange={(id) => {
                  setActorId(id);
                  try { localStorage.setItem('actorId', String(id)); } catch { /* ignore */ }
                  refresh(id).catch((err: any) => toast(err.message, false));
                }} />
              <Tag className="tag-demo">{tr(lang, 'demo_badge')}</Tag>
            </>
          ) : (
            <LogoutButton lang={lang} onClick={async () => { await logout(); setMe(null); setS(null); }} />
          )}
          <Tag className="tag-role">{me?.demo ? `${tDept(lang, actor.department)} · ${tRole(lang, actor.role)}` : `${tr(lang, 'logged_in_as')} ${actor.name} · ${tRole(lang, actor.role)}`}</Tag>
        </div>
      </header>
      <Layout>
        <Sidebar
          lang={lang} currentView={currentView} isWM={isWM} showAdmin={!!me?.isAdmin}
          collapsed={collapsed} drawerOpen={drawerOpen} isPhone={isPhone} isDark={theme === 'dark'}
          pendingCount={pendingCount} flaggedCount={flaggedCount}
          sidebarRef={sidebarRef}
          onNavigate={(v) => { drawerCloseReason.current = 'nav'; switchView(v); setDrawerOpen(false); }}
          onCloseDrawer={() => { drawerCloseReason.current = 'other'; setDrawerOpen(false); }}
        />
        {drawerOpen && isPhone && <div className="sidebar-backdrop" aria-hidden="true" onClick={() => { drawerCloseReason.current = 'other'; setDrawerOpen(false); }} />}
        <Layout.Content id="main" ref={mainRef} tabIndex={-1} className="main-content">
          {currentView === 'overview' && <Overview S={S} lang={lang} openTask={openTask} />}
          {currentView === 'admin' && me?.isAdmin && <AdminView S={S} lang={lang} toast={toast} modal={modalApi} />}
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
  admin: <KeyOutlined />,
};
const NAV_COUNT: Record<View, 'pending' | 'flagged' | null> = {
  overview: null, board: 'pending', log: null, materials: 'flagged', team: null, admin: null,
};

export function Sidebar({ lang, currentView, isWM, showAdmin, collapsed, drawerOpen, isPhone, isDark, pendingCount, flaggedCount, sidebarRef, onNavigate, onCloseDrawer }: {
  lang: Lang; currentView: View; isWM: boolean; showAdmin: boolean;
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
      label: (<span className="menu-label"><span>{tr(lang, 'nav_' + v)}</span>{count > 0 && <Badge count={count} size="small" color="#d20f39" />}</span>),
    };
  });
  // Admin is not one of the workflow views: it appears only for the
  // app admin, after the main nav, and never for anyone else.
  if (showAdmin) {
    items.push({
      key: 'admin',
      icon: NAV_ICONS.admin,
      label: (<span className="menu-label"><span>{tr(lang, 'nav_admin')}</span></span>),
    });
  }
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
      style={{ background: isDark ? '#181825' : '#ffffff' }} className="sidebar-antd" aria-label={tr(lang, 'nav_main')}>
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
          ? <Tag className="tag-urgent">{tPri(lang, task.priority)}</Tag>
          : task.priority === 'high'
            ? <Tag className="tag-high">{tPri(lang, task.priority)}</Tag>
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
