# Team Management Dashboard — standalone, self-hostable

Replaces WhatsApp chaos for the NOC team at **PT Sakti Wijaya Network**: one
dashboard for tasks, shifts, material, and evidence — with roles and approvals
enforced on the server.

This is the standalone rebuild of the Muse prototype. It is **not** an export
of that prototype (Muse fullstack artifacts cannot be exported); it is fresh
code implementing the same spec, so it can run on your own VM and be reached
over Tailscale.

**v2.0.0: the frontend is now React** (Vite + React 18 + TypeScript, like
the prototype) — same API, same data, same features as the vanilla frontend
it replaces. The old vanilla frontend is still in the repo at `public/`
(`public/app.js`, `public/index.html`, `public/styles.css`) as a fallback:
if `dist/` has not been built yet, the server serves `public/` so it still
starts, but the React build in `dist/` is the served frontend once built
(`npm run build`). `server.js` and the API/DB schema are unchanged.

## Features

- **Overview — Yesterday → Today:** done yesterday, due/overdue today,
  material used yesterday, who's on shift today, Pending Approval count.
- **Kanban:** customizable columns (Backlog / To Do / In Progress / Waiting /
  Pending Approval / Done), drag-and-drop + "Move to" menu, add/rename/delete
  columns. The "+ Add task" button only appears in **Backlog and To Do** —
  new work is created there; the other columns are states a task moves into,
  not entry points. (Enforced server-side too: creating a task straight into
  In Progress, Waiting, Pending Approval or Done is rejected.)
- **To-Do list:** same tasks, grouped by assignee.
- **Roles & approval (server-enforced, not just hidden in the UI):**
  - **Head NOC (Rivaldo)** — approves anything.
  - **OSP (Fajar Nugroho)** — drops projects (new ODP, new link, expansion)
    and approves **only** tasks they dropped themselves.
  - **NOC (Bima Prasetyo, Sari Wulandari)** — monitors tickets/projects,
    assigns work to field techs, creates Handover tasks for the oncoming shift
    and Reminder tasks for future maintenance/projects.
  - **Customer Service (Dewi Anggraini)** — logs material used for the day.
  - **Warehouse Manager (Putri Ayu)** — issues material in the morning,
    tracks in/out (used vs returned), checks/approves the daily report.
    **WM only sees the Materials board — nothing else.** When acting as WM
    the UI shows Materials as the only view, and the server rejects WM
    requests to task/board/calendar/team/activity endpoints (403).
  - **Field techs (Agus, Dedi, Joko, Rina)** — assignee-only, **no login**.
  - NOC / CS / Warehouse cannot approve a task to Done.
- **Calendar:** tasks by due date + shifts, day detail, who's on board.
- **Shift import:** CSV upload or paste, preview with name matching,
  replace-on-reimport (no duplicates). Template at `/api/shifts/template.csv`
  — columns: `Date | Name | Shift | Start | End | Department | Notes`.
- **Materials — daily cycle:**
  1. Morning: Warehouse issues everything that might be used that day.
  2. During the day: CS logs used/returned per line and submits the report.
     When logging, CS can add an optional free-text note for where the
     material went (e.g. "Install Ibu Ratna, Binong") — manually typed,
     never a dropdown. The note shows in the Materials table / daily report
     so the Warehouse Manager sees it when checking the next day.
     Submit is blocked until every line is logged.
  3. Next day: Warehouse checks it against issued data and approves or flags it.
  - Reconciliation table: Issued vs Used + Returned, variance highlighted.
  - Yesterday's report is surfaced first.
  - Ad-hoc material per task too: free-text name + qty + unit, autocomplete
    from previously used names, no master catalog, serial optional.
- **Evidence photos per task:** upload one/several pictures (camera/gallery
  on phone), one-tap captions (ONT installed, Speedtest result,
  Before/After), thumbnail gallery + full-size viewer with uploader/time,
  photo-count badge on board cards. The approver sees evidence in the Pending
  Approval panel, with a warning if a task was sent for approval with no
  evidence photos. General Files section stays for configs/PDFs.
- **File attachments per task, activity log** (who did what, when).
- **Language — English / Bahasa Indonesia:** an **EN | ID** toggle in the
  header switches the whole UI (nav, Kanban columns, buttons, task fields,
  priorities, statuses, roles/departments, Materials cycle labels, evidence
  photos, shift import, Yesterday/Today overview, empty states, warnings).
  The choice is saved in the browser (`localStorage`, key `tmd-lang`) and
  persists across reloads. **Default is English** on first load, so existing
  users see no surprise change — Indonesian is one tap away. Proper names,
  customer names, and material names are never translated.
- **Theme — dark / light:** a **🌙 Dark mode / ☀️ Light mode** toggle in the header,
  next to EN | ID (🌙 Mode gelap / ☀️ Mode terang in Indonesian). **Default is light** on first load; the choice is saved
  in the browser (`localStorage`, key `tmd-theme`) and persists across
  reloads, and is applied before first paint so there is no light flash.
  Dark mode covers every view (Overview, Kanban, To-Do, Calendar, Materials,
  Team, Activity, task panel, modals, tables, inputs, pills, toast) with
  light text on dark surfaces. No OS-theme follow — the toggle is explicit.

## Changelog

- **v2.0.2** — Antislop audit fixes, all 8 HIGH findings: no em dashes in rendered text (EN/ID strings, document title, page title, seed titles and activity strings); muted text and dark placeholder now pass WCAG AA 4.5:1; dark focus colour passes 3:1; control borders pass 3:1 in both themes via one border token per theme; interactive targets raised to 44px; base-layer pointer cursor (task cards keep grab for drag); Move-to select named and compact form rows labelled; task titles are real buttons, not hash links. No API/DB/role/i18n-key changes. No live-browser visual check in this VM, so the taller buttons and 44px targets still need a look on phone width.
- **v2.0.1** — Accessibility: icon-only buttons named, Kanban cards/calendar days/evidence photos keyboard-operable, task modal + lightbox are real dialogs (Escape, focus in/out), toasts announced with error toasts kept until dismissed, load-failure Retry, skip link, view changes announced, inputs labelled, tables scroll on phones. Also: untranslated strings fixed in ID mode, header badge now 'Demo data', Share to WhatsApp per task, Download CSV per material day, board filter matches service ID, npm run typecheck. No API/DB/role changes. No live-browser visual check — tab through a card, a modal, and an error toast before merging.
- **v2.0.0** — Frontend rebuilt in React (Vite + React 18 + TypeScript), like the prototype. Same API, same SQLite DB/schema, same features: Overview, Kanban (drag-drop, Add Task only in Backlog/To Do), To-Do, Calendar + CSV shift import, Materials daily cycle, Team, Activity, evidence photos, EN/ID + dark/light toggles, "Acting as" switcher. The i18n dictionary and the v1.7.0 styles were ported verbatim, so the look and all translations are unchanged. `server.js` only changed to serve the built frontend from `dist/` (falling back to the old vanilla `public/` if `dist/` has not been built yet — the old files are kept in the repo, not deleted). Build with `npm run build`, then `node server.js`; dev is `npm run dev` (Vite, port 5173, proxies `/api` to the Express server on 3000). Docker builds the frontend during image build. `dist/` is gitignored and built on deploy. Verified: `npm run build` passes, `npx tsc --noEmit` clean, full-stack run on a throwaway DB — create/move/approve-as-Head-NOC, NOC approve 403, create-in-Done 400, WM Materials-only state, material issue/log/submit/check, shift import (incl. unknown-person skip). No live-browser visual check in this VM.
- **v1.7.0** — Visual parity pass vs the Muse prototype (same look for the same view, language, and theme; code underneath still differs). Header: theme toggle labels now match the prototype ("Dark mode" / "Light mode", "Mode gelap" / "Mode terang"). Kanban/To-Do: evidence badge, priority pills, and due dates now translate in ID; empty-column fallback renders correctly. Calendar: CSV "Preview import" button and match cells now translate in ID. Materials: "Add line" / "Issue morning material" buttons and day status (Terbuka / Terkirim / Disetujui / Ditandai) now translate in ID; the "Issue more" button no longer misuses the "Issued." toast string as its label; log/issue forms now use flex rows that wrap on phone width. Task panel: approval note and approval toast now translate in ID. Fixed 9 empty-state fallbacks (Overview, Board, Materials, task panel) that rendered the literal text `${tr('…')}` instead of the translated string. Toast no longer overrides the dark theme with an inline background (error toasts use a CSS class instead). English priorities now render capitalised ("Normal" / "High" / "Urgent"). No logic, roles, approval rules, or API behaviour changed; `server.js` untouched. Verified with a DOM-stub runtime test: every view renders in EN/light and ID/dark, full and empty states, with zero JS errors and no English leakage in ID mode. No live-browser visual check in this VM — remaining pixel-level differences (if any) still need a side-by-side screenshot check.
- **v1.6.0** — Dark / light mode toggle in the header (🌙 Dark / ☀️ Light, 🌙 Gelap / ☀️ Terang in Indonesian), persisted in `localStorage` (`tmd-theme`), default light, applied before first paint. Dark theme is a `data-theme="dark"` override block in `styles.css` covering all views, panels, modals, tables, inputs, pills and toast. No logic, roles, approval rules, or API behaviour changed.
- **v1.5.0** — Restyled the standalone to match the Muse prototype: same navy/blue/teal palette, now with soft shadows, 12–14px rounded cards/panels/columns, stat cards with coloured left accents, Kanban task cards that lift on hover, a gradient navy topbar, pill nav with shadow, cleaner tables, and rounded buttons/inputs/modals. CSS/layout only — no logic, roles, approval rules, i18n strings, or API behaviour changed; no external fonts/CDN.
- **v1.4.1** — Bugfix: fixed `Failed to load: t is not a function` on Overview. The i18n translator was named `t` and got shadowed by local variables also named `t` (`todayStr()` result, task lookups). The translator is now `tr` throughout, and the broken `no_shifts_today` / `no_mat_yday` strings are plain text again (English + Indonesian).
- **v1.4.0** — "+ Add task" only in Backlog and To Do (server-enforced).
- **v1.3.0** — Bahasa Indonesia version: EN | ID language toggle.
- **v1.2.0** — CS free-text "where did it go?" note on material lines.
- **v1.1.0** — Warehouse Manager sees Materials only.
- **v1.0.0** — Initial standalone release.

## Stack

Node.js 22+ + Express + SQLite (`node:sqlite`, no native addons) + React 18
+ TypeScript, built with Vite (`client/`, output `dist/`). The server serves
the built frontend and the API on the same port 3000. Data lives in
`data/app.db` (created + seeded on first run with clearly-labeled **demo**
data — 10 mock people, 10 tasks, shifts around today, yesterday/today
material days). Uploads live in `uploads/`.

## Run it

### Option A — Node directly (Proxmox VM, Ubuntu/Debian)

```bash
git clone https://github.com/raivold/team-management-dashboard.git
cd team-management-dashboard
cp .env.example .env   # optional, defaults work
npm install
npm run build          # build the React frontend into dist/
node server.js         # or: npm start
# open http://<vm-ip>:3000
```

For development, run the API server and the Vite dev server in two
terminals (Vite on port 5173 proxies `/api` to the Express server on 3000):

```bash
npm run dev:server     # terminal 1: Express + API on :3000
npm run dev            # terminal 2: Vite dev server on :5173
```

To keep it running after you log out, use systemd or `pm2`:

```bash
npm install -g pm2
pm2 start server.js --name team-dashboard
pm2 save && pm2 startup
```

### Option B — Docker

```bash
docker compose up -d --build
# open http://<vm-ip>:3000
```

Data persists in `./data` and `./uploads` (bind-mounted). Back them up
together with the repo.

## Reach it on the go via Tailscale

1. Install Tailscale on the VM and on your phone (and team phones later):
   `curl -fsSL https://tailscale.com/install.sh | sh` on the VM, then
   `tailscale up`. Install the Tailscale app on the phone and sign in to the
   same tailnet.
2. Find the VM's tailnet name/IP: `tailscale ip -4` or `tailscale status`.
3. On the phone (with Tailscale connected), open
   `http://<vm-tailnet-name-or-ip>:3000` — e.g. `http://team-dashboard:3000`
   if MagicDNS is on.
4. No port forwarding, no public domain, no public exposure — only devices
   on your tailnet can reach it. The dashboard itself listens on `0.0.0.0:3000`
   but is not exposed to the internet unless you forward a port (don't).

## Auth — read this before real team use

The prototype uses an **"Acting as" switcher** (demo auth): the client sends
`actorId` and the server enforces the role rules for that actor. That is
fine for testing the workflow, but it is **not real login** — anyone who can
reach the server can pick any role. Before real team use, add proper login
(passwords / sessions) — that is the planned next step, not part of v1.
Tailscale already limits reachability to your tailnet, which is the main
protection in the meantime.

## API

All mutations take `actorId` in the JSON body; rules are enforced server-side.

- `GET /api/state` — people, columns, tasks (+materials/files), shifts,
  material days (+lines), activity, material names.
- `POST /api/tasks` (new tasks only in Backlog or To Do — other `columnId`
  values are rejected) · `PATCH /api/tasks/:id` · `DELETE /api/tasks/:id`
- `POST /api/tasks/:id/move` `{columnId}` — moving to a Done column requires
  approval rights (403 otherwise). `POST /api/tasks/:id/reject` `{reason}`.
- `POST /api/columns` · `PATCH /api/columns/:id` · `DELETE /api/columns/:id`
- `POST /api/people` · `PATCH /api/people/:id` (Head NOC only)
- `POST /api/shifts` · `DELETE /api/shifts/:id` ·
  `POST /api/shifts/import` `{rows:[{date,name,shift,start,end,department,notes}]}` ·
  `GET /api/shifts/template.csv`
- `POST /api/material-days/:date/issue` (WM only) ·
  `POST /api/material-days/:id/log` (CS only, used+returned ≤ issued, optional free-text `note` for where it went) ·
  `POST /api/material-days/:id/submit` (CS only, blocked until all logged) ·
  `POST /api/material-days/:id/check` (WM only, `{decision: approved|flagged, note}`)
- `POST /api/tasks/:id/materials` · `DELETE /api/tasks/:id/materials/:mid`
- `POST /api/tasks/:id/files` `{name, mimeType, data (base64), category: evidence|file, caption}` ·
  `GET /api/files/:id` · `PATCH /api/files/:id` · `DELETE /api/files/:id`
