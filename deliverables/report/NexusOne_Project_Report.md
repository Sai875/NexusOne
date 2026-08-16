# NexusOne — Enterprise Collaboration & Workforce Management Platform

## Project Report

**Team:** [Your Name(s)] · **Guide:** [Guide Name] · **[College Name] · [Course] · August 2026**

> NOTE: Fill in the bracketed placeholders ([Your Name(s)], [Guide Name], [College Name], [Course]) before submission.

## 1. Introduction

### 1.1 Project Overview

NexusOne is an enterprise collaboration and workforce management platform that unifies chat, project and task management, file sharing, calendar, notifications, an admin dashboard and an AI Copilot in a single workspace. It is designed as a production-grade, microservice-based system per the Software Requirements Specification (SRS v2.0), implemented as a college MVP that is fully runnable and deployable.

### 1.2 Problem Statement

Teams today rely on a fragmented stack of chat tools, task boards, file drives, calendars and status spreadsheets. Information is scattered across disconnected applications, context is lost between tools, reporting is manual, and role-based access control and audit trails are difficult to retrofit. NexusOne addresses this by providing one integrated, secure, real-time platform with a single source of truth.

### 1.3 Objectives

- Deliver one unified workspace covering authentication, organizations, chat, projects & tasks, files, calendar, notifications, admin and an AI Copilot.
- Use a scalable microservice architecture (NestJS) with three datastores — PostgreSQL, MongoDB and Redis — chosen for the workload each serves.
- Implement enterprise-grade security: JWT authentication with refresh rotation, five-role RBAC, multi-tenant organization isolation and audit trails.
- Provide real-time collaboration via Socket.IO chat and SSE notifications, decoupled through a Redis domain event bus.
- Ship with production tooling: Docker Compose, GitHub Actions CI/CD, a Render cloud blueprint, and complete documentation (ER/UML/REST/GraphQL).

### 1.4 Scope — MVP Modules

- Authentication — JWT access + rotating refresh tokens, registration, multi-org membership and switching, invitation flow.
- Organization Management — tenants, departments/teams, member & role administration, module entitlements, audit trail.
- Chat — public/private/announcement channels, real-time messaging, threads, reactions, edit/delete, presence, search.
- Projects & Tasks — workspaces, projects, tasks, kanban board, priorities, assignees, sprints, comments, activity feed.
- Files — multipart uploads, folders, downloads, expiring share links, storage abstraction.
- Calendar — events, attendees, RSVP, availability, reminders.
- Notifications — in-app feed, unread badge, SSE live push, driven by the domain event bus.
- Admin Dashboard — KPIs, task pipeline charts, member role management, entitlements, audit log.
- AI Copilot — chat/meeting summaries with action items, task generation, drafts, grounded Q&A.

## 2. Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Backend | NestJS 10 (TypeScript) | 9 microservices + API gateway, modular, dependency-injected |
| RDBMS | PostgreSQL 16 + TypeORM | Users, orgs, projects, tasks, files, calendar, audit |
| Document DB | MongoDB 7 + Mongoose | Chat messages, threads, notification feeds |
| Cache / state | Redis 7 + ioredis | Presence, refresh-token denylist, rate limits, event bus |
| Realtime | Socket.IO · Server-Sent Events | Chat transport, live notification push |
| Auth | passport-jwt · bcryptjs | Access/refresh tokens, password hashing |
| API | Swagger/OpenAPI · Apollo GraphQL | REST docs, aggregation layer on the gateway |
| Frontend | Next.js 14 · React 18 · TypeScript | App Router, 13 routes, responsive shell |
| UI | Tailwind CSS · shadcn/ui (Radix) | Component library, dark-friendly design system |
| State/UI libs | zustand · SWR · Recharts | Client stores, data fetching, charts |
| Testing | Jest · ts-jest | 25 unit tests across six suites |
| DevOps | Docker · Docker Compose · GitHub Actions · Render | Build, orchestrate, CI/CD, cloud deploy |

## 3. System Architecture

### 3.1 Overview

The backend is an npm-workspace monorepo of nine NestJS services behind a single API gateway. Clients talk only to the gateway for REST/GraphQL and connect to the chat service directly for WebSocket traffic. Each service owns its data: PostgreSQL-backed services (auth, org, projects, files, calendar), MongoDB-backed services (chat, notifications), and a Redis layer shared for presence, events and rate limiting. The AI service is stateless.

```text
Next.js Web App (REST /api/* · GraphQL /graphql · WebSocket)
        │
   API Gateway :8080  — proxy · rate limiting · GraphQL aggregation
        │
  auth  org  chat  projects  files  calendar  notifications  ai
 3001  3002  3003   3004     3005    3006        3007       3008
   │     │     │      │        │       │           │
 PostgreSQL (auth, org, projects, files, calendar)   MongoDB (chat, notifications)   Redis (presence, events, limits)
```

### 3.2 Microservices

| Service | Port | Responsibility | Datastore |
| --- | --- | --- | --- |
| gateway | 8080 | Reverse proxy, per-IP rate limiting, GraphQL aggregation, aggregated Swagger | — |
| auth | 3001 | JWT access + refresh rotation, RBAC, org registration, invitations, demo bootstrap | PostgreSQL · Redis |
| org | 3002 | Tenants, departments/teams, module entitlements, audit trail, admin KPIs | PostgreSQL |
| chat | 3003 | Channels/messages, Socket.IO realtime, threads, reactions, presence, search | MongoDB · Redis |
| projects | 3004 | Workspaces → projects → tasks, kanban, sprints, comments, activity feed | PostgreSQL |
| files | 3005 | Multipart uploads, folders, downloads, expiring share links, storage abstraction | PostgreSQL · disk |
| calendar | 3006 | Events, attendees, RSVP, availability, reminders | PostgreSQL |
| notifications | 3007 | In-app feed, unread badge, SSE live push, domain-event consumer | MongoDB · Redis |
| ai | 3008 | Copilot: OpenAI adapter + deterministic fallback engine | — |

### 3.3 Communication & Event Bus

- REST: every /api/* request is proxied by the gateway with path rewrites; each service verifies JWTs independently.
- GraphQL: the gateway exposes an aggregation layer (/graphql) that combines data from several services in one query.
- WebSocket: browsers connect to chat :3003 with a JWT handshake; Redis pub/sub fans messages out across replicas.
- SSE: the notifications service streams events to connected clients for the live unread badge.
- Domain events: services publish to Redis pub/sub (task.assigned, chat.mentioned, event.reminder, invite.accepted, org.created); the notifications consumer turns them into feed entries and SSE pushes.

## 4. Module Implementation

### 4.1 Authentication & Authorization

The auth service issues a short-lived JWT access token and a rotating refresh token; refresh tokens are stored hashed and denylisted in Redis on logout/rotation. Registration creates the user plus a membership for the new organization. Five roles — SUPER_ADMIN, ORG_ADMIN, MANAGER, EMPLOYEE, GUEST — are enforced with @Roles() decorators and guards on every protected endpoint. Invitations are issued by admins/managers with a role and accepted through a join flow. A demo-data bootstrap seeds a demo organization and users idempotently so the platform is usable immediately after first boot.

### 4.2 Organization Management

The org service manages tenants: departments and teams, member/role administration, an audit trail of admin actions, and module entitlements — per-organization licensing flags that enable or disable features (meetings, HR, ticketing, workflow automation). Admin analytics endpoints compute KPIs such as member counts, project status and task pipeline data used by the admin dashboard.

### 4.3 Chat & Realtime Messaging

Channels and messages live in MongoDB. Socket.IO provides realtime delivery with a JWT-authenticated handshake, plus threads, reactions, edits/deletes and presence (online/away) shared through Redis. Mentions publish a chat.mentioned event consumed by the notifications service. A search endpoint indexes messages per organization.

### 4.4 Project & Task Management

The projects service models workspaces → projects → tasks with priorities, assignees and due dates, and supports sprints, comments and an activity feed. Assigning a task publishes a task.assigned event so the assignee is notified in real time. The frontend renders a kanban board and task dialogs with comments.

### 4.5 File Management

The files service handles multipart uploads through multer, organizes files in folders per org, streams downloads, and creates expiring share links. Storage is abstracted behind a StorageProvider interface — the MVP ships a local-disk provider, with an S3 implementation planned for production (no client changes required).

### 4.6 Calendar

The calendar service manages events with attendees and RSVP state, checks availability, and publishes event.reminder events consumed as notifications. The frontend provides a month view with create/edit dialogs.

### 4.7 Notifications

The notifications service stores a per-user feed in MongoDB, exposes unread counts and read/unread transitions, and pushes new notifications over Server-Sent Events. It consumes the Redis domain event bus, so any service can trigger a notification without knowing about the notifications service.

### 4.8 Admin Dashboard

An admin-only frontend page consumes org analytics endpoints: member and role management, entitlement toggles, the audit log, and charts (member distribution, task pipeline, workload). Access is restricted to ORG_ADMIN and MANAGER roles via the RBAC guards.

### 4.9 AI Copilot

The ai service exposes summarize, generate-tasks, draft and ask endpoints. With OPENAI_API_KEY set it calls OpenAI; without it, a deterministic fallback engine still produces source-grounded summaries, task drafts and Q&A from the requesting organization’s data. Answers always cite their sources (channels, tasks, events).

### 4.10 Frontend Application

A Next.js 14 App Router application (TypeScript strict) with a Teams-style responsive shell: sidebar navigation, topbar, organization switcher and mobile nav. Thirteen routes cover login, signup, invite, dashboard (GraphQL + Recharts), chat (Socket.IO), projects (kanban), calendar, files, notifications (SSE badge), admin and copilot. State is managed with zustand stores; a 401 interceptor logs the user out and redirects to /login.

## 5. Database Design

### 5.1 PostgreSQL (canonical relational schema)

The canonical DDL lives in database/postgres/schema.sql and is also mounted into the Docker Postgres container on first boot (with seed.sql for demo data).

- users, organizations, memberships (user ↔ org with roles)
- departments, teams
- projects, tasks, comments, activity_events
- files, folders, share_links
- calendar_events, rsvps
- audit_log, entitlements

### 5.2 MongoDB (chat & notifications)

- channels — per-org channels with type (public/private/announcement) and membership
- messages — per-channel messages with threads, reactions, edit history, mentions
- notifications — per-user feed with read state
- Indexes cover the hot paths: channel + createdAt for message pagination, userId + createdAt for the feed.

### 5.3 Redis (fast state & events)

- presence keys for online/away status
- refresh-token denylist for rotation/logout
- rate-limit counters (per IP at the gateway)
- domain event bus via pub/sub channels

ER diagrams (PostgreSQL + MongoDB + Redis) are in docs/er-diagram.md; UML class/sequence/deployment diagrams in docs/uml-diagrams.md.

## 6. API Design

### 6.1 REST

80+ endpoints across the nine services, all reached through the gateway at /api/*. Every service exposes Swagger at /docs (aggregated at the gateway). DTOs are validated with class-validator; responses follow consistent envelope conventions. Full reference: docs/api-rest.md.

### 6.2 GraphQL

The gateway’s code-first GraphQL layer aggregates cross-service queries: dashboard (KPIs, pipeline, recent activity), tasksByProject, channels, notifications, plus mutations. Example: the dashboard page fetches a single query instead of four REST round-trips. Schema: docs/graphql.md.

### 6.3 WebSocket & SSE

Chat uses Socket.IO with a JWT auth handshake (namespace default, path /socket.io). Notifications push over SSE at the notifications service. Both are described in the auth-flow and architecture docs.

## 7. Security

- JWT access tokens (8h) with rotating refresh tokens denylisted in Redis.
- Five-role RBAC enforced per endpoint via guards and decorators; org-scoped queries prevent cross-tenant access.
- bcrypt password hashing; DTO validation on every input.
- Gateway applies helmet security headers, per-IP rate limiting and centralized CORS locked to CLIENT_ORIGIN.
- File share links expire; uploads are stored behind the storage abstraction.
- Each microservice independently verifies JWTs using the shared JWT_SECRET.

## 8. Testing & Quality

- 25 unit tests across auth (5), chat (7), projects (4), files (3), entitlements (3) and copilot (3).
- TypeScript strict typecheck passes for all nine services (tsc --noEmit).
- Production builds verified: Nest builds all services; the frontend passes next build (13 routes).
- Live smoke test: the AI service boots, serves /health and Swagger, and answers a JWT-authenticated /copilot/summarize request end-to-end.
- CI (GitHub Actions) gates every push/PR on typecheck, tests and builds.

## 9. DevOps & Deployment

### 9.1 Docker & Compose

A shared multi-stage Dockerfile builds all nine NestJS services in one image; the SERVICE environment variable selects which app starts. The frontend uses its own standalone-output Dockerfile. docker-compose.yml runs the full stack: PostgreSQL 16, MongoDB 7, Redis 7, nine services and the web app, with health checks and dependency ordering.

```text
docker compose up --build   # then open http://localhost:3000
```

### 9.2 CI/CD (GitHub Actions)

On every push/PR to main: backend typecheck + tests + build, frontend typecheck + build. On merge to main, Docker images (ghcr.io/<owner>/nexusone/backend and /web) are built with buildx, cached, and pushed with main/latest/sha tags; an optional RENDER_DEPLOY_HOOK_URL secret triggers a deployment after the push.

### 9.3 Cloud Deployment (Render)

render.yaml is a complete Render blueprint: it provisions PostgreSQL, Redis, MongoDB (container with persistent disk), all nine services and the web app, and wires environment variables automatically (shared JWT_SECRET, connection strings, service URLs). Managed TLS is included; the free tier sleeps after idle and cold-starts in under a minute. The platform also runs on any Docker host, Railway or Kubernetes. Walkthrough: docs/deployment.md.

## 10. SRS Coverage & Scope Decisions

All modules required for the college deliverable are implemented. Deliberate, documented scope decisions: meetings/WebRTC, HR, ticketing and workflow automation are modeled as disabled-by-default module entitlements (data retained, re-enable anytime) rather than half-built features; the event bus is Redis pub/sub (Kafka recommended at scale); file storage is local disk behind an S3-ready interface; the Copilot runs a deterministic engine until OPENAI_API_KEY is set.

## 11. Future Work

- Implement the S3 storage provider and MongoDB Atlas for production persistence.
- Adopt Kafka for the domain event bus and Redis-backed (distributed) rate limiting.
- Add meetings/WebRTC, HR and ticketing modules behind their entitlement flags.
- Add OpenTelemetry metrics + Grafana dashboards and read replicas for analytics.
- Run RBAC boundary tests per role and a security review (pen test) for SOC 2 readiness.

## 12. Conclusion

NexusOne demonstrates a complete, production-shaped collaboration platform: nine tested microservices, three purpose-chosen datastores, real-time chat and notifications, RBAC and multi-tenancy, an AI Copilot, full CI/CD and a cloud blueprint — all verified by typechecks, unit tests, production builds and a live smoke test. The architecture is built to be extended rather than rewritten, making it a strong foundation for the roadmap in Section 11.

## 13. References

- Software Requirements Specification (SRS v2.0) — attached to the project.
- docs/architecture.md — architecture, SRS→service mapping, event bus, security.
- docs/er-diagram.md — ER diagrams; docs/uml-diagrams.md — UML diagrams.
- docs/api-rest.md — REST reference; docs/graphql.md — GraphQL schema; docs/auth-flow.md — token/RBAC flows.
- docs/installation.md — install guide; docs/deployment.md — deployment guide.
- Source: this repository (backend/, frontend/, database/, docker-compose.yml, render.yaml, .github/workflows/ci.yml).

## Appendix A — Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Organization Admin | alice.admin@nexuslabs.io | Admin@123 |
| Employee | carol.dev@nexuslabs.io | Carol@123 |

## Appendix B — Quick Start

```text
# Docker (full stack)
cd nexusone && docker compose up --build
# no Docker: backend
cd backend && npm install && npm run dev:all
# no Docker: frontend
cd frontend && npm install && npm run dev
```

## Appendix C — Repository Layout (abridged)

```text
nexusone/
├── backend/services/     # gateway, auth, org, chat, projects, files, calendar, notifications, ai
├── frontend/             # Next.js 14 app (13 routes)
├── database/             # postgres schema.sql + seed.sql, mongo collections.md
├── docs/                 # architecture, ER, UML, REST, GraphQL, auth-flow, install, deploy
├── docker-compose.yml · render.yaml · .github/workflows/ci.yml
└── deliverables/         # this report + presentation
```
