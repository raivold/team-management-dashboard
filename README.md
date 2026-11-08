# Team Management Dashboard — standalone, self-hostable

Replaces WhatsApp chaos for the NOC team at **PT Sakti Wijaya Network**: one
dashboard for tasks, shifts, material, and evidence — with roles and approvals
enforced on the server.

This is the standalone rebuild of the Muse prototype. It is **not** an export
of that prototype (Muse fullstack artifacts cannot be exported); it is fresh
code implementing the same spec, so it can run on your own VM and be reached
over Tailscale.

## Features

- **Overview — Yesterday → Today:** done yesterday, due/overdue today,
  material used yesterday, who's on shift today, Pending Approval count.
- **Kanban:** customizable columns (Backlog / To Do / In Progress / Waiting /
  Pending Approval / Done), drag-and-drop + "Move to" menu, add/rename/delete
  columns.
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

## Stack

Node.js 22+ + Express + SQLite (`node:sqlite`, no native addons) + vanilla
HTML/CSS/JS. No build step. Data lives in `data/app.db` (created + seeded on
first run with clearly-labeled **demo** data — 10 mock people, 10 tasks,
shifts around today, yesterday/today material days). Uploads live in
`uploads/`.

## Run it

### Option A — Node directly (Proxmox VM, Ubuntu/Debian)

```bash
git clone https://github.com/raivold/team-management-dashboard.git
cd team-management-dashboard
cp .env.example .env   # optional, defaults work
npm install
node server.js         # or: npm start
# open http://<vm-ip>:3000
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
- `POST /api/tasks` · `PATCH /api/tasks/:id` · `DELETE /api/tasks/:id`
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
