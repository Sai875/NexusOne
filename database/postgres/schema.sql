-- ============================================================================
-- NexusOne — PostgreSQL canonical schema (v1.0)
-- All relational/transactional data across services. Table ownership:
--   auth, org, projects, files, calendar  (one shared database, per-tenant
--   isolation enforced at the application layer via the orgId column).
-- MongoDB holds chat channels/messages and notifications (document-shaped).
-- Redis holds presence, domain-event fan-out and (prod) rate limits.
-- ============================================================================

-- ── Identity & Organization (auth + org services) ──────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  logo_url   TEXT,
  plan       TEXT NOT NULL DEFAULT 'free',
  settings   JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Membership: a user's role(s) inside an organization (multi-org support).
CREATE TABLE IF NOT EXISTS memberships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  roles      JSONB NOT NULL DEFAULT '["EMPLOYEE"]',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'EMPLOYEE',
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti        TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ── Organization structure (org service) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  head_id     UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(org_id);

CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(org_id);

CREATE TABLE IF NOT EXISTS team_members (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL DEFAULT 'member',
  UNIQUE (team_id, user_id)
);

-- Modular licensing: every functional module is toggleable per organization.
CREATE TABLE IF NOT EXISTS entitlements (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module  TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (org_id, module)
);
CREATE INDEX IF NOT EXISTS idx_entitlements_org ON entitlements(org_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id    UUID,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id, created_at DESC);

-- ── Project & task management (projects service) ───────────────────────────

CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workspaces_org ON workspaces(org_id);

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  key         TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  start_date  DATE,
  due_date    DATE,
  owner_id    UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'todo',
  priority        TEXT NOT NULL DEFAULT 'medium',
  assignee_id     UUID,
  reporter_id     UUID,
  due_date        DATE,
  estimated_hours NUMERIC,
  labels          JSONB NOT NULL DEFAULT '[]',
  order_index     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(org_id);

CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  UUID,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

CREATE TABLE IF NOT EXISTS sprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  goal        TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'planned',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  actor_id    UUID,
  action      TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);

-- ── File management (files service) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES folders(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, parent_id, name)
);

CREATE TABLE IF NOT EXISTS files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  folder_id   UUID REFERENCES folders(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type   TEXT,
  size        BIGINT NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL,
  checksum    TEXT,
  version     INTEGER NOT NULL DEFAULT 1,
  uploader_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_files_org ON files(org_id, folder_id);

CREATE TABLE IF NOT EXISTS share_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_id    UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  permission TEXT NOT NULL DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Calendar (calendar service) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  all_day          BOOLEAN NOT NULL DEFAULT FALSE,
  location         TEXT,
  organizer_id     UUID,
  attendees        JSONB NOT NULL DEFAULT '[]',
  recurrence_rule  TEXT,
  reminder_minutes INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_org_time ON calendar_events(org_id, start_at, end_at);
