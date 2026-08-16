# NexusOne — Installation Guide

## Prerequisites

- Node.js ≥ 20 and npm ≥ 10
- Docker + Docker Compose (recommended path) **or** local PostgreSQL 15+,
  MongoDB 7, Redis 7

## Option A — Docker Compose (recommended, 5 minutes)

```bash
cd nexusone
cp .env.example .env          # edit JWT_SECRET / POSTGRES_PASSWORD
docker compose up --build
```

That starts: postgres, mongo, redis, all 9 backend services, gateway and the
web app. The PostgreSQL container auto-runs `database/postgres/schema.sql`
and `seed.sql` on first boot.

Open:

| Service | URL |
| ------- | --- |
| Web app | http://localhost:3000 |
| API gateway | http://localhost:8080 |
| Gateway docs (Swagger) | http://localhost:8080/docs |
| Gateway GraphQL | http://localhost:8080/graphql |
| Chat WebSocket | ws://localhost:3003 (socket.io) |

## Option B — Local development (no Docker)

**1. Databases.** Create `nexusone` in PostgreSQL and apply the schema:

```bash
psql -U nexusone -d nexusone -f database/postgres/schema.sql
psql -U nexusone -d nexusone -f database/postgres/seed.sql   # optional demo data
```

MongoDB and Redis run with defaults (`localhost:27017`, `localhost:6379`).

**2. Backend.** Install once at the workspace root; then run everything with
concurrently, or start individual services:

```bash
cd backend
cp .env.example .env
npm install
npm run dev:all                 # all 9 services + gateway (watch mode)
```

Individual service (example): `npm run start:dev -w @nexusone/auth`.

**3. Frontend.**

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3000
```

## Demo accounts (seeded automatically)

| Role | Email | Password |
| ---- | ----- | -------- |
| Org Admin | alice.admin@nexuslabs.io | Admin@123 |
| Manager | bob.manager@nexuslabs.io | Manager@123 |
| Employee | carol.dev@nexuslabs.io | Carol@123 |
| Employee | dave.dev@nexuslabs.io | Dave@123 |
| Guest | erin.guest@nexuslabs.io | Guest@123 |

The demo org **Nexus Labs** ships with departments, teams, a project with
tasks, calendar events, a file, chat channels (`#general`,
`#announcements`) and module entitlements.

## Environment variables

| Variable | Default | Used by |
| -------- | ------- | ------- |
| JWT_SECRET | dev value | all services |
| JWT_EXPIRES_IN | 8h | auth |
| POSTGRES_* | nexusone | auth, org, projects, files, calendar |
| MONGO_URI | mongodb://localhost:27017/nexusone | chat, notifications |
| REDIS_HOST/PORT | localhost/6379 | auth, org, chat, projects, calendar, notifications |
| SERVICE_*_URL | http://localhost:300x | gateway |
| OPENAI_API_KEY | *(empty)* | ai — empty = deterministic fallback engine |
| NEXT_PUBLIC_CHAT_WS_URL | http://localhost:3003 | frontend |
| NEXT_PUBLIC_API_URL | http://localhost:8080 | frontend (rewrites) |

## Troubleshooting

- **`npm run dev:all` ports busy** — change `PORT` per service in
  `backend/.env` (ports are `3001`–`3008` + gateway `8080`).
- **WebSocket won't connect** — confirm `NEXT_PUBLIC_CHAT_WS_URL` points at
  the chat service (localhost:3003) and CORS allows the origin.
- **No channels after creating an org** — the chat service creates
  `#general`/`#announcements` when it receives `org.created`; if Redis was
  down, restart the chat service (it also seeds the demo org on boot).
- **AI Copilot answers look canned** — set `OPENAI_API_KEY` to switch the
  ai service from the deterministic fallback engine to real completions.
