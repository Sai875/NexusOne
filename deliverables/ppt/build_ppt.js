/*
 * Generates NexusOne_Presentation.pptx
 * Run: node build_ppt.js  (from this directory)
 */
// Resolve deps from the sibling tools/ folder (they are not installed here)
const path = require('path');
const { createRequire } = require('module');
const req = createRequire(path.join(__dirname, '..', 'tools', 'package.json'));
const pptxgen = req('pptxgenjs');
const pptx = new pptxgen();

pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
pptx.layout = 'WIDE';

const C = {
  ink: '1E1B4B',        // indigo-950
  accent: '6366F1',     // indigo-500
  accentDark: '4338CA', // indigo-600
  light: 'E0E7FF',      // indigo-100
  body: '475569',       // slate-600
  muted: '64748B',      // slate-500
  border: 'CBD5E1',     // slate-300
  white: 'FFFFFF',
  band: 'F8FAFC',       // slate-50
  green: '059669',
  amber: 'D97706',
  red: 'DC2626',
};
const FONT = 'Calibri';

let page = 0;

function header(slide, title, subtitle) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.55, y: 0.48, w: 0.09, h: 0.6,
    fill: { color: C.accent }, line: { type: 'none' },
  });
  slide.addText(title, {
    x: 0.8, y: 0.4, w: 11.9, h: 0.55,
    fontSize: 24, bold: true, color: C.ink, fontFace: FONT,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.8, y: 0.92, w: 11.9, h: 0.35,
      fontSize: 13, color: C.muted, fontFace: FONT,
    });
  }
  slide.addShape(pptx.ShapeType.line, {
    x: 0.55, y: 1.32, w: 12.23, h: 0,
    line: { color: C.border, width: 0.75 },
  });
}

function footer(slide) {
  page += 1;
  slide.addText(`NexusOne · ${page}`, {
    x: 0.55, y: 7.12, w: 12.23, h: 0.3,
    align: 'right', fontSize: 9, color: C.muted, fontFace: FONT,
  });
}

// items: string | { text, level?, bold?, color?, size? }
function bullets(slide, items, x, y, w, h, fontSize = 14) {
  const runs = items.map((it) => {
    const t = typeof it === 'string' ? { text: it } : it;
    const level = t.level || 0;
    return {
      text: t.text,
      options: {
        bullet: level
          ? { code: '25AA', indent: 30 }
          : { code: '2022', indent: 14 },
        color: t.color || C.body,
        fontSize: t.size || (level ? fontSize - 1.5 : fontSize),
        bold: !!t.bold,
        fontFace: FONT,
        paraSpaceAfter: 7,
        breakLine: true,
      },
    };
  });
  slide.addText(runs, { x, y, w, h, valign: 'top', fontFace: FONT });
}

function panel(slide, x, y, w, h, title, items, accent = C.accent) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: C.white }, line: { color: C.border, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.07, h,
    fill: { color: accent }, line: { type: 'none' },
  });
  slide.addText(title, {
    x: x + 0.22, y: y + 0.12, w: w - 0.4, h: 0.34,
    fontSize: 14.5, bold: true, color: C.ink, fontFace: FONT,
  });
  bullets(slide, items, x + 0.22, y + 0.5, w - 0.42, h - 0.6, 12.5);
}

function box(slide, x, y, w, h, text, opts = {}) {
  const fill = opts.fill || C.light;
  const color = opts.color || C.ink;
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: fill },
    line: { color: opts.line || C.accent, width: opts.lineW || 1 },
    shadow: opts.shadow
      ? { type: 'outer', color: C.border, blur: 5, angle: 45, distance: 2, opacity: 0.5 }
      : undefined,
  });
  slide.addText(text, {
    x, y, w, h,
    fontSize: opts.size || 12,
    bold: opts.bold !== false,
    color, fontFace: FONT,
    align: 'center', valign: 'middle',
  });
}

function arrow(slide, x1, y1, x2, y2, opts = {}) {
  slide.addShape(pptx.ShapeType.line, {
    x: Math.min(x1, x2), y: Math.min(y1, y2),
    w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    line: {
      color: opts.color || C.muted,
      width: opts.width || 1.25,
      dash: opts.dash,
      endArrowType: opts.endArrow === false ? undefined : 'triangle',
    },
  });
}

/* ─────────────────────────── Slide 1 · Title ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.ink };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: C.accent }, line: { type: 'none' } });
  s.addText('NEXUSONE', {
    x: 1.0, y: 1.55, w: 11.3, h: 1.1,
    fontSize: 54, bold: true, color: C.white, fontFace: FONT,
  });
  s.addText('Enterprise Collaboration & Workforce Management Platform', {
    x: 1.0, y: 2.7, w: 11.3, h: 0.6,
    fontSize: 21, color: C.light, fontFace: FONT,
  });
  s.addShape(pptx.ShapeType.line, { x: 1.0, y: 3.5, w: 4.5, h: 0, line: { color: C.accent, width: 2 } });
  s.addText('A production-grade microservices platform built with NestJS, Next.js, PostgreSQL, MongoDB, Redis, and AI', {
    x: 1.0, y: 3.7, w: 11.0, h: 0.5,
    fontSize: 14, color: 'A5B4FC', fontFace: FONT,
  });
  s.addText([
    { text: 'Project Report & Presentation', options: { bullet: false, color: C.light, fontSize: 15, bold: true, paraSpaceAfter: 6 } },
    { text: 'College MVP · August 2026', options: { bullet: false, color: 'A5B4FC', fontSize: 13 } },
  ], { x: 1.0, y: 4.8, w: 8.0, h: 1.0, fontFace: FONT });
  s.addText('Team: [Your Name(s)]  ·  Guide: [Guide Name]', {
    x: 1.0, y: 6.3, w: 11.0, h: 0.4,
    fontSize: 12, color: 'A5B4FC', fontFace: FONT,
  });
  page += 1;
}

/* ─────────────────────────── Slide 2 · Agenda ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Agenda', 'What we will cover');
  bullets(s, [
    'Problem statement & objectives',
    'Technology stack',
    'System architecture — microservices, gateway, event bus',
    'Module walkthrough — auth, org, chat, projects, files, calendar, notifications, admin, AI Copilot',
    'Database design — PostgreSQL, MongoDB, Redis',
    'API surface — REST, GraphQL, WebSocket, SSE',
    'Security & RBAC',
    'Testing, CI/CD and deployment',
    'SRS coverage, future work & conclusion',
  ], 0.8, 1.6, 11.6, 5.2, 15);
  footer(s);
}

/* ─────────────────────────── Slide 3 · Problem ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Problem Statement', 'Why an integrated platform?');
  panel(s, 0.8, 1.7, 11.7, 1.35, 'Fragmented tooling', [
    'Teams juggle chat, task boards, files, calendars and status reports across disconnected apps — no single source of truth.',
  ]);
  panel(s, 0.8, 3.2, 11.7, 1.35, 'No context, no automation', [
    'Assignments, mentions and deadlines are lost between tools; reporting and admin insight require manual consolidation.',
  ]);
  panel(s, 0.8, 4.7, 11.7, 1.35, 'Security & scaling gaps', [
    'Role-based access control, audit trails and safe multi-tenant isolation are hard to retrofit once tools are glued together.',
  ]);
  footer(s);
}

/* ─────────────────────────── Slide 4 · Objectives ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Objectives', 'What NexusOne sets out to deliver');
  bullets(s, [
    { text: 'One unified workspace: chat, projects & tasks, files, calendar, notifications, admin', bold: false },
    { text: 'Microservice architecture — independently deployable, scalable services', bold: false },
    { text: 'Enterprise-grade security — JWT, refresh rotation, 5-role RBAC, multi-tenant orgs', bold: false },
    { text: 'Real-time collaboration — WebSocket chat, SSE notifications, Redis event bus', bold: false },
    { text: 'AI Copilot — chat & meeting summaries, task generation, drafts, grounded Q&A', bold: false },
    { text: 'Production tooling — Docker Compose, CI/CD, Render blueprint, full documentation', bold: false },
  ], 0.8, 1.7, 11.6, 4.6, 15);
  footer(s);
}

/* ─────────────────────────── Slide 5 · Scope ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Scope — MVP Modules', 'Nine modules implemented end-to-end (SRS mapping in the report)');
  const mods = [
    ['Authentication', 'JWT + refresh rotation, RBAC, org registration, invitations', C.accent],
    ['Organization Mgmt', 'Tenants, departments, entitlements, audit trail', C.accentDark],
    ['Chat', 'Channels, threads, reactions, presence, search', C.green],
    ['Projects & Tasks', 'Workspaces → projects → tasks, kanban, sprints', C.accent],
    ['Files', 'Uploads, folders, share links, storage abstraction', C.amber],
    ['Calendar', 'Events, RSVP, availability, reminders', C.accentDark],
    ['Notifications', 'In-app feed, unread badge, SSE live push', C.green],
    ['Admin Dashboard', 'KPIs, member/role admin, entitlements, audit', C.amber],
    ['AI Copilot', 'Summaries, task generation, drafts, grounded Q&A', C.red],
  ];
  mods.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.8 + col * 4.0;
    const y = 1.7 + row * 1.72;
    panel(s, x, y, 3.85, 1.6, m[0], [m[1]], m[2]);
  });
  footer(s);
}

/* ─────────────────────────── Slide 6 · Tech stack ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Technology Stack', 'Proven, production-grade building blocks');
  panel(s, 0.8, 1.7, 5.7, 5.1, 'Backend', [
    'NestJS 10 — 9 microservices + API gateway',
    'TypeORM (PostgreSQL) · Mongoose (MongoDB)',
    'Socket.IO realtime · ioredis (Redis)',
    'JWT / passport · bcrypt · class-validator',
    'Swagger/OpenAPI · Apollo GraphQL (gateway)',
    'Jest unit tests across all services',
  ], C.accent);
  panel(s, 6.85, 1.7, 5.7, 5.1, 'Frontend & Infra', [
    'Next.js 14 (App Router) · React 18 · TypeScript',
    'Tailwind CSS · shadcn/ui (Radix primitives)',
    'zustand · SWR · Recharts · socket.io-client',
    'PostgreSQL 16 · MongoDB 7 · Redis 7',
    'Docker Compose · GitHub Actions CI/CD',
    'Render blueprint (render.yaml) for cloud deploy',
  ], C.green);
  footer(s);
}

/* ─────────────────────────── Slide 7 · Architecture ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'High-Level Architecture', 'One gateway, nine microservices, three datastores');

  // Web app
  box(s, 5.35, 1.42, 2.6, 0.55, 'Next.js Web App\n(REST · GraphQL · WS)', { fill: C.ink, color: C.white, size: 11 });
  // Gateway
  box(s, 5.55, 2.28, 2.8, 0.55, 'API Gateway :8080\nproxy · rate-limit · GraphQL', { fill: C.accent, color: C.white, size: 11 });
  arrow(s, 6.65, 1.97, 6.65, 2.28);

  // Socket.IO dashed line: web → chat (chat is 3rd of 7 service boxes)
  arrow(s, 5.35, 1.7, 5.08, 3.42, { color: C.green, dash: 'dash' });
  s.addText('Socket.IO', { x: 3.15, y: 2.32, w: 1.7, h: 0.3, fontSize: 9.5, color: C.green, fontFace: FONT, align: 'center' });

  // Service row: 7 boxes
  const services = ['auth\n:3001', 'org\n:3002', 'chat\n:3003', 'projects\n:3004', 'files\n:3005', 'calendar\n:3006', 'notif.\n:3007', 'ai\n:3008'];
  const svcX = 0.8;
  const svcW = 1.46;
  const svcGap = 0.16;
  const svcY = 3.5;
  const svcH = 0.68;
  const centers = services.map((_, i) => svcX + i * (svcW + svcGap) + svcW / 2);
  // bus
  s.addShape(pptx.ShapeType.line, {
    x: svcX, y: 3.22, w: 8 * svcW + 7 * svcGap, h: 0,
    line: { color: C.muted, width: 1.5 },
  });
  arrow(s, 6.65, 2.83, 6.65, 3.22);
  services.forEach((name, i) => {
    box(s, svcX + i * (svcW + svcGap), svcY, svcW, svcH, name, { fill: C.white, line: C.accent, size: 10.5 });
    arrow(s, centers[i], 3.22, centers[i], 3.5, { color: C.muted, width: 1.1 });
  });

  // services → datastores bus
  s.addShape(pptx.ShapeType.line, {
    x: svcX, y: 4.55, w: 8 * svcW + 7 * svcGap, h: 0,
    line: { color: C.border, width: 1.25, dash: 'dash' },
  });
  arrow(s, centers[3], 4.18, centers[3], 4.55, { color: C.border, width: 1.1 });

  // Datastores
  const dsY = 5.0;
  box(s, 0.8, dsY, 3.9, 0.62, 'PostgreSQL', { fill: C.light, size: 13 });
  box(s, 4.95, dsY, 3.0, 0.62, 'MongoDB', { fill: C.light, size: 13 });
  box(s, 8.2, dsY, 3.0, 0.62, 'Redis', { fill: C.light, size: 13 });
  arrow(s, centers[3], 4.55, 2.75, 5.0, { color: C.border, width: 1.1, dash: 'dash' });
  arrow(s, centers[3], 4.55, 6.45, 5.0, { color: C.border, width: 1.1, dash: 'dash' });
  arrow(s, centers[3], 4.55, 9.7, 5.0, { color: C.border, width: 1.1, dash: 'dash' });

  s.addText('auth · org · projects · files · calendar', { x: 0.8, y: 5.72, w: 3.9, h: 0.3, fontSize: 9.5, color: C.muted, fontFace: FONT, align: 'center' });
  s.addText('chat · notifications', { x: 4.95, y: 5.72, w: 3.0, h: 0.3, fontSize: 9.5, color: C.muted, fontFace: FONT, align: 'center' });
  s.addText('presence · events · rate limits', { x: 8.2, y: 5.72, w: 3.0, h: 0.3, fontSize: 9.5, color: C.muted, fontFace: FONT, align: 'center' });

  s.addText('WebSocket: browsers connect to chat :3003 directly (Redis pub/sub fans out across replicas) · domain events flow through Redis (task.assigned, chat.mentioned, event.reminder, invite.accepted)', {
    x: 0.8, y: 6.25, w: 11.7, h: 0.7,
    fontSize: 10, color: C.muted, fontFace: FONT, italic: true,
  });
  footer(s);
}

/* ─────────────────────────── Slide 8 · Microservices ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Microservices Overview', 'Each service owns its data and exposes a Swagger-documented API');
  const rows = [
    [
      { text: 'Service', options: { bold: true, color: C.white, fill: { color: C.accent } } },
      { text: 'Port', options: { bold: true, color: C.white, fill: { color: C.accent } } },
      { text: 'Responsibility', options: { bold: true, color: C.white, fill: { color: C.accent } } },
      { text: 'Datastore', options: { bold: true, color: C.white, fill: { color: C.accent } } },
    ],
    ['Gateway', '8080', 'Reverse proxy, rate limiting, GraphQL aggregation, aggregated Swagger', '—'],
    ['Auth', '3001', 'JWT access + rotating refresh tokens, RBAC, multi-org membership, invites', 'PostgreSQL · Redis'],
    ['Org', '3002', 'Tenants, departments/teams, module entitlements, audit trail, admin KPIs', 'PostgreSQL'],
    ['Chat', '3003', 'Channels & messages, Socket.IO realtime, threads, reactions, presence', 'MongoDB · Redis'],
    ['Projects', '3004', 'Workspaces → projects → tasks, kanban, sprints, comments, activity', 'PostgreSQL'],
    ['Files', '3005', 'Multipart uploads, folders, expiring share links, storage abstraction', 'PostgreSQL · disk'],
    ['Calendar', '3006', 'Events, RSVP, availability, reminders', 'PostgreSQL'],
    ['Notifications', '3007', 'In-app feed, unread badge, SSE live push, domain-event consumer', 'MongoDB · Redis'],
    ['AI', '3008', 'Copilot — OpenAI adapter + deterministic fallback engine', '—'],
  ];
  s.addTable(rows, {
    x: 0.6, y: 1.6, w: 12.1,
    colW: [1.4, 0.7, 6.6, 3.4],
    border: { type: 'solid', color: C.border, pt: 0.5 },
    fontSize: 10.5,
    color: C.body,
    fontFace: FONT,
    valign: 'middle',
    rowH: 0.42,
  });
  footer(s);
}

/* ─────────────────────────── Slide 9 · Auth & Security ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Authentication & Security', 'Defense in depth across every service');
  panel(s, 0.8, 1.7, 5.7, 3.0, 'Identity', [
    'JWT access tokens (8h) + rotating refresh tokens with denylist in Redis',
    'bcrypt password hashing · class-validator DTO validation',
    'Multi-org membership & org switching · invitation flow with roles',
    'Demo-data bootstrap — idempotent seed of demo org & users',
  ]);
  panel(s, 6.85, 1.7, 5.7, 3.0, 'Authorization (RBAC)', [
    '5 roles: SUPER_ADMIN, ORG_ADMIN, MANAGER, EMPLOYEE, GUEST',
    '@Roles() decorator + guards enforced per endpoint',
    'Org-scoped access — users can only see their own tenant data',
  ]);
  panel(s, 0.8, 4.9, 11.7, 1.9, 'Transport & abuse protection', [
    'Gateway: helmet security headers, per-IP rate limiting, centralized CORS',
    'JWT verified independently by every service (shared secret)',
    'File share links expire · CORS locked to CLIENT_ORIGIN',
  ]);
  footer(s);
}

/* ─────────────────────────── Slide 10 · Chat & Realtime ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Chat & Realtime Collaboration', 'Slack-style channels on Socket.IO');
  panel(s, 0.8, 1.7, 5.7, 5.1, 'Messaging', [
    'Public / private / announcement channels per org',
    'Real-time messages, threads, reactions, edit & delete',
    'Mentions (@user) → notifications via Redis event bus',
    'Full-text search across messages',
  ]);
  panel(s, 6.85, 1.7, 5.7, 5.1, 'Realtime plumbing', [
    'Socket.IO with JWT auth handshake',
    'Presence (online/away) stored in Redis, shared across replicas',
    'Redis pub/sub fan-out for multi-instance chat',
    'Notifications service pushes SSE streams to connected clients',
  ]);
  footer(s);
}

/* ─────────────────────────── Slide 11 · Projects ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Project & Task Management', 'From workspaces to done');
  bullets(s, [
    'Hierarchy: workspaces → projects → tasks (with priorities, assignees, due dates)',
    'Kanban board UI — drag tasks across backlog / todo / in-progress / review / done',
    'Sprints with goals, comments and a per-task activity feed',
    'task.assigned domain event → notification to the assignee',
    'Admin analytics: task pipeline, workload and completion KPIs',
  ], 0.8, 1.7, 11.6, 4.0, 15);
  s.addText('REST: /workspaces · /projects · /tasks · /sprints  —  GraphQL: tasksByProject, dashboard aggregates', {
    x: 0.8, y: 5.9, w: 11.6, h: 0.4,
    fontSize: 11.5, color: C.accentDark, fontFace: FONT, italic: true,
  });
  footer(s);
}

/* ─────────────────────────── Slide 12 · Files & Calendar ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Files · Calendar · Notifications', 'The supporting modules');
  panel(s, 0.8, 1.7, 3.85, 3.4, 'Files', [
    'Multipart uploads with multer',
    'Folder hierarchy per org',
    'Expiring share links',
    'StorageProvider abstraction — local disk today, S3-ready',
  ]);
  panel(s, 4.75, 1.7, 3.85, 3.4, 'Calendar', [
    'Events with attendees & RSVP',
    'Availability / busy checks',
    'Reminders → event.reminder notifications',
    'Month-view UI with create/edit dialogs',
  ]);
  panel(s, 8.7, 1.7, 3.85, 3.4, 'Notifications', [
    'MongoDB feed + unread badge',
    'SSE live push to the browser',
    'Consumes the Redis domain event bus',
    'Task assigned · mentioned · reminders · invites',
  ]);
  bullets(s, [
    'Demo flows: upload a file → share link expires; create an event → attendees get reminders; assign a task → assignee is notified in real time.',
  ], 0.8, 5.35, 11.7, 1.1, 13);
  footer(s);
}

/* ─────────────────────────── Slide 13 · AI Copilot ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'AI Copilot', 'Assistant built into the workspace');
  panel(s, 0.8, 1.7, 5.7, 3.0, 'Capabilities', [
    'Chat summaries with action items',
    'Meeting / channel recap',
    'Task generation → one-click commit to the board',
    'Drafts: announcements, emails, reports, plans',
    'Grounded Q&A with source references',
  ]);
  panel(s, 6.85, 1.7, 5.7, 3.0, 'Engine', [
    'OpenAI adapter when OPENAI_API_KEY is set',
    'Deterministic fallback engine — fully functional with zero API keys',
    'Every answer shows its source (channels, tasks, events)',
  ]);
  bullets(s, [
    'Smoke-tested end-to-end with a real JWT: POST /api/copilot/summarize returns a source-grounded summary.',
  ], 0.8, 5.0, 11.7, 1.2, 13);
  footer(s);
}

/* ─────────────────────────── Slide 14 · Databases ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Data Stores', 'Polyglot persistence — the right store for each workload');
  panel(s, 0.8, 1.7, 3.85, 4.6, 'PostgreSQL (canonical)', [
    'users · organizations · memberships',
    'departments · teams',
    'projects · tasks · comments · activity',
    'files · folders · share_links',
    'calendar_events · rsvps',
    'audit_log · entitlements',
  ]);
  panel(s, 4.75, 1.7, 3.85, 4.6, 'MongoDB (documents)', [
    'chat channels · messages · threads',
    'notification feeds',
    'Schema-less, fits message payloads',
    'Indexes: channel + createdAt, userId + read',
  ]);
  panel(s, 8.7, 1.7, 3.85, 4.6, 'Redis (fast state)', [
    'presence & online status',
    'refresh-token denylist',
    'rate limiting counters',
    'domain event bus (pub/sub)',
  ]);
  s.addText('Full DDL + seed: database/postgres/schema.sql · ER diagrams: docs/er-diagram.md', {
    x: 0.8, y: 6.45, w: 11.7, h: 0.4,
    fontSize: 11, color: C.accentDark, fontFace: FONT, italic: true,
  });
  footer(s);
}

/* ─────────────────────────── Slide 15 · API Surface ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'API Surface', 'One gateway, every protocol');
  panel(s, 0.8, 1.7, 3.85, 3.1, 'REST', [
    '80+ endpoints across 9 services',
    'All traffic through the gateway (/api/*)',
    'Swagger at /docs per service + aggregated at the gateway',
  ]);
  panel(s, 4.75, 1.7, 3.85, 3.1, 'GraphQL', [
    'Aggregation layer at /graphql',
    'dashboard · tasksByProject · channels',
    'notifications · mutations',
  ]);
  panel(s, 8.7, 1.7, 3.85, 3.1, 'Realtime', [
    'Socket.IO — chat (direct to :3003)',
    'SSE — notification stream (:3007)',
    'Redis pub/sub — internal event bus',
  ]);
  s.addText('Example: the Dashboard page fetches one GraphQL query — org KPIs, task pipeline, recent activity, notifications — instead of four REST round-trips.', {
    x: 0.8, y: 5.15, w: 11.7, h: 0.9,
    fontSize: 12.5, color: C.body, fontFace: FONT, italic: true,
  });
  footer(s);
}

/* ─────────────────────────── Slide 16 · Frontend ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Frontend', 'Next.js app with a Teams-style shell');
  panel(s, 0.8, 1.7, 5.7, 3.1, 'Foundation', [
    'Next.js 14 App Router · TypeScript strict',
    'Tailwind CSS + shadcn/ui components',
    'zustand stores (auth, chat, org, notifications)',
    'Recharts visualizations on dashboard & admin',
  ]);
  panel(s, 6.85, 1.7, 5.7, 3.1, 'Routes (13)', [
    'login · signup · invite',
    'dashboard · chat · projects · calendar',
    'files · notifications · admin · copilot',
    'Responsive sidebar + mobile nav + org switcher',
  ]);
  bullets(s, [
    'Authentication flow: login → JWT stored → tokens refresh → 401 auto-logout; route guards redirect to /login.',
    'Realtime wiring: chat store syncs via Socket.IO; notifications badge updates via SSE.',
  ], 0.8, 5.1, 11.7, 1.7, 13);
  footer(s);
}

/* ─────────────────────────── Slide 17 · Testing & CI/CD ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Testing & CI/CD', 'Quality gates before anything ships');
  panel(s, 0.8, 1.7, 5.7, 3.0, 'Verification', [
    '25 unit tests — auth, chat, projects, files, entitlements, copilot',
    'tsc typecheck across all 9 services',
    'Production builds (Nest + next build)',
    'Live smoke test: AI service with real JWT',
  ]);
  panel(s, 6.85, 1.7, 5.7, 3.0, 'Pipeline (GitHub Actions)', [
    'push/PR → backend & frontend checks',
    'Docker buildx images with layer cache',
    'Push to GHCR on merge to main (main/latest/sha tags)',
    'Optional Render deploy-hook trigger',
  ]);
  bullets(s, [
    'Every merge to main is gated on typecheck + tests + builds; images are then published and deploys can fire automatically.',
  ], 0.8, 5.0, 11.7, 1.2, 13);
  footer(s);
}

/* ─────────────────────────── Slide 18 · Deployment ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Deployment', 'Local, Docker and cloud in one config');
  panel(s, 0.8, 1.7, 5.7, 3.0, 'Local / self-hosted', [
    'docker compose up --build → 3 datastores + 9 services + web',
    'Shared multi-stage Dockerfile (SERVICE env selects the app)',
    'Or run natively: npm install + npm run dev:all',
  ]);
  panel(s, 6.85, 1.7, 5.7, 3.0, 'Cloud (Render blueprint)', [
    'render.yaml provisions PostgreSQL + Redis + MongoDB + all services',
    'Env vars wired automatically (JWT secret, connection strings)',
    'Managed TLS · free tier with cold-start under a minute',
  ]);
  bullets(s, [
    'Secrets: JWT_SECRET shared across services · NEXT_PUBLIC_* baked at build time · CLIENT_ORIGIN locked down.',
  ], 0.8, 5.0, 11.7, 1.2, 13);
  footer(s);
}

/* ─────────────────────────── Slide 19 · Conclusion ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.white };
  header(s, 'Conclusion & Future Work', 'Delivered, verified, extensible');
  panel(s, 0.8, 1.7, 5.7, 3.2, 'Delivered', [
    '9 microservices + gateway, 3 datastores, Next.js frontend',
    'All 9 MVP modules implemented and tested',
    '~370 source files · 13,600+ lines · full docs (ER/UML/API)',
    'CI/CD + Render blueprint ready to deploy',
  ]);
  panel(s, 6.85, 1.7, 5.7, 3.2, 'Future work', [
    'Meetings/WebRTC, HR, ticketing (modeled as entitlement placeholders)',
    'Kafka for the event bus at scale; MongoDB Atlas; S3 storage',
    'Read replicas, Redis-backed rate limiting, OpenTelemetry metrics',
  ]);
  bullets(s, [
    'NexusOne proves the architecture: a real-time, multi-tenant, AI-assisted collaboration platform — built to be extended, not rewritten.',
  ], 0.8, 5.15, 11.7, 1.2, 14);
  footer(s);
}

/* ─────────────────────────── Slide 20 · Thank you ─────────────────────────── */
{
  const s = pptx.addSlide();
  s.background = { color: C.ink };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: C.accent }, line: { type: 'none' } });
  s.addText('Thank You', {
    x: 1.0, y: 2.6, w: 11.3, h: 1.0,
    fontSize: 48, bold: true, color: C.white, fontFace: FONT,
  });
  s.addText('Questions & discussion welcome', {
    x: 1.0, y: 3.7, w: 11.3, h: 0.5,
    fontSize: 18, color: C.light, fontFace: FONT,
  });
  s.addShape(pptx.ShapeType.line, { x: 1.0, y: 4.4, w: 4.5, h: 0, line: { color: C.accent, width: 2 } });
  s.addText('Demo logins: alice.admin@nexuslabs.io / Admin@123  ·  carol.dev@nexuslabs.io / Carol@123', {
    x: 1.0, y: 4.7, w: 11.3, h: 0.4,
    fontSize: 12, color: 'A5B4FC', fontFace: FONT,
  });
  page += 1;
}

pptx
  .writeFile({ fileName: 'NexusOne_Presentation.pptx' })
  .then(() => console.log('Wrote NexusOne_Presentation.pptx'))
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
