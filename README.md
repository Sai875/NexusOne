# NexusOne
# NexusOne — Enterprise Collaboration & Workforce Management Platform

A Teams-style unified workspace (per SRS v2.0): **chat, projects & tasks,
files, calendar, notifications, an admin dashboard and an AI Copilot** — a
microservices backend (NestJS) with three datastores (PostgreSQL, MongoDB,
Redis), a Next.js + React + TypeScript + Tailwind + shadcn/ui frontend, and
full Docker/CI/CD tooling.

```
┌───────────────────────────────────────────────────────────────────────┐
│  Next.js Web App (App Router, TypeScript, Tailwind, shadcn/ui)       │
└──────────────┬────────────────────────────────────────────────────────┘
               │ REST /api/* · GraphQL /graphql · WebSocket (chat)
┌──────────────▼────────────────────────────────────────────────────────┐
│  API Gateway (NestJS) — proxies, rate limits, GraphQL aggregation     │
└──────┬────────┬────────┬────────┬────────┬────────┬────────┬──────────┘
       │        │        │        │        │        │        │
   [auth]    [org]    [chat]  [projects] [files] [calendar] [notifications] [ai]
   :3001     :3002    :3003    :3004     :3005    :3006      :3007         :3008
       │        │        │        │        │        │          │
  PostgreSQL · PostgreSQL · MongoDB · PostgreSQL · PostgreSQL · PostgreSQL · MongoDB
       └────────┴────────┴─── Redis (presence · events · limits) ─┴──────────┘
```

## Quick start (Docker)

```bash
docker compose up --build
```

Then open **http://localhost:3000** and sign in with
`alice.admin@nexuslabs.io` / `Admin@123` (admin) or
`carol.dev@nexuslabs.io` / `Carol@123` (employee).

Manual install, env reference and troubleshooting: **[docs/installation.md](docs/installation.md)**.

## Features (MVP modules)

| Module | What works |
| ------ | ---------- |
| **Authentication** | JWT access + rotating refresh tokens, RBAC (5 roles), org registration, multi-org switching, invitations with accept flow |
| **Organization mgmt** | Tenants, departments/teams, members & role admin, audit trail, **module entitlements** (per-org licensing flags) |
| **Chat** | Channels (public/private/announcement), realtime Socket.IO messaging, threads, reactions, edit/delete, search, presence |
| **Projects & Tasks** | Workspaces → projects → tasks, kanban board, priorities, assignees, due dates, comments, sprints, activity feed |
| **Files** | Multipart upload, folders, download, version field, expiring share links, storage abstraction (S3-ready) |
| **Calendar** | Month view, event creation with attendees, RSVP, reminders (event-driven notifications) |
| **Notifications** | In-app feed + unread badge + **SSE live push**, driven by a Redis **domain event bus** (task.assigned, chat.mentioned, event.reminder, invite.accepted) |
| **Admin dashboard** | Org KPIs, task-pipeline charts, member role management, entitlements toggles, audit log |
| **AI Copilot** | Chat/meeting summaries + action items, task generation → commit to board, drafts (announcement/email/report/plan), grounded Q&A. OpenAI-backed when `OPENAI_API_KEY` is set, otherwise a deterministic engine — always shows its source |

## Repository layout

```
nexusone/
├── backend/                 # npm workspaces monorepo
│   ├── services/
│   │   ├── gateway/         # API gateway: proxies, rate limit, GraphQL
│   │   ├── auth/            # identity, JWT, RBAC, invites, org bootstrap
│   │   ├── org/             # departments/teams, entitlements, audit, admin analytics
│   │   ├── chat/            # MongoDB channels/messages + Socket.IO + presence
│   │   ├── projects/        # workspaces, projects, tasks, sprints, activity
│   │   ├── files/           # uploads, folders, share links (StorageProvider)
│   │   ├── calendar/        # events, RSVP, availability, reminders
│   │   ├── notifications/   # in-app feed + SSE, domain-event consumer
│   │   └── ai/              # Copilot: OpenAI adapter + fallback engine
│   └── Dockerfile           # shared multi-stage build (SERVICE build arg)
├── frontend/                # Next.js 14 App Router + Tailwind + shadcn/ui
│   └── src/app/(main)/      # dashboard, chat, projects, calendar, files,
│                            # notifications, admin, copilot
├── database/
│   ├── postgres/schema.sql  # canonical PostgreSQL DDL (also runs in Docker)
│   ├── postgres/seed.sql    # demo domain data (fixed UUIDs)
│   └── mongo/collections.md # Mongo collections, indexes, Redis keys
├── docs/                    # architecture, ER/UML, REST & GraphQL, auth flow,
│                            # installation, deployment
├── docker-compose.yml       # full stack (3 datastores + 9 services + web)
└── .github/workflows/ci.yml # typecheck · tests · builds · Docker images
```

## Documentation

| Document | Contents |
| -------- | -------- |
| [docs/architecture.md](docs/architecture.md) | System architecture, SRS→service mapping, event bus, security |
| [docs/er-diagram.md](docs/er-diagram.md) | ER diagrams (PostgreSQL + MongoDB + Redis) |
| [docs/uml-diagrams.md](docs/uml-diagrams.md) | Class, sequence, deployment diagrams |
| [docs/api-rest.md](docs/api-rest.md) | Full REST endpoint reference |
| [docs/graphql.md](docs/graphql.md) | GraphQL aggregation schema + examples |
| [docs/auth-flow.md](docs/auth-flow.md) | Tokens, refresh rotation, RBAC, invites |
| [docs/installation.md](docs/installation.md) | Install (Docker + local), demo accounts, env vars |
| [docs/deployment.md](docs/deployment.md) | Production topology, CI/CD, backups, scaling |

Live API docs: Swagger on each service at `/docs`, aggregated at
`http://localhost:8080/docs`; GraphQL playground at
`http://localhost:8080/graphql`.

## Tech stack

- **Backend**: NestJS 10 · TypeORM · Mongoose · Socket.IO · ioredis · JWT ·
  class-validator · Swagger · GraphQL (Apollo, code-first) · Jest
- **Frontend**: Next.js 14 · React 18 · TypeScript · Tailwind CSS ·
  shadcn/ui (Radix) · zustand · SWR · Recharts · socket.io-client
- **Infra**: PostgreSQL 16 · MongoDB 7 · Redis 7 · Docker Compose ·
  GitHub Actions

## SRS coverage & scope decisions

This MVP implements every module required for the college deliverable.
Deliberate scope cuts (documented in the SRS and [docs/architecture.md](docs/architecture.md)):
meetings/WebRTC, HR, ticketing and workflow automation are modeled as
**disabled-by-default module entitlements** (data retained, re-enable anytime)
rather than half-built features; the event bus is Redis pub/sub (Kafka in
production); file storage is local disk behind an S3-ready interface; the
AI service runs a deterministic engine without an API key.

## License

Educational project — not for production use without the hardening steps in
[docs/deployment.md](docs/deployment.md).

Give feedback

