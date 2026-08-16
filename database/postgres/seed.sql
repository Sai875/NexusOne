-- ============================================================================
-- NexusOne — demo seed data (PostgreSQL domain tables)
-- Identity rows (users / organizations / memberships) are bootstrapped
-- idempotently by the auth service using the fixed UUIDs below, so users
-- always get correctly bcrypt-hashed passwords and the org-created event
-- fires (which creates default chat channels + entitlements).
-- ============================================================================

-- Fixed identity UUIDs (agreed across services) ------------------------------
-- Organization: 11111111-1111-4111-8111-111111111111
-- Users:        22222222-2222-4222-8222-222222222222 (Alice Admin)
--               33333333-3333-4333-8333-333333333333 (Bob Manager)
--               44444444-4444-4444-8444-444444444444 (Carol Developer)
--               55555555-5555-4555-8555-555555555555 (Dave Developer)
--               66666666-6666-4666-8666-666666666666 (Erin Guest)

INSERT INTO departments (id, org_id, name, head_id) VALUES
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Engineering', '33333333-3333-4333-8333-333333333333'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Product',      NULL),
  ('a0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'People & Ops', NULL)
ON CONFLICT (org_id, name) DO NOTHING;

INSERT INTO teams (id, org_id, department_id, name, description) VALUES
  ('b0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', 'Platform',    'Core platform & infrastructure'),
  ('b0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', 'Frontend',    'Web & mobile clients'),
  ('b0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000002', 'Design',      'Product design & research')
ON CONFLICT (org_id, name) DO NOTHING;

INSERT INTO team_members (team_id, user_id, role) VALUES
  ('b0000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'member'),
  ('b0000000-0000-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555', 'member'),
  ('b0000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'lead')
ON CONFLICT DO NOTHING;

-- Demo project workspace + project + tasks (projects service seed is
-- idempotent, so these rows just make the demo richer if present).
INSERT INTO workspaces (id, org_id, name, description, created_by) VALUES
  ('88888888-8888-4888-8888-888888888888', '11111111-1111-4111-8111-111111111111', 'NexusOne Build', 'Ships the NexusOne platform', '22222222-2222-4222-8222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO projects (id, org_id, workspace_id, key, name, description, owner_id) VALUES
  ('77777777-7777-4777-8777-777777777777', '11111111-1111-4111-8111-111111111111', '88888888-8888-4888-8888-888888888888', 'PLAT', 'Platform Revamp', 'Migrate the platform to the microservices architecture', '33333333-3333-4333-8333-333333333333')
ON CONFLICT (org_id, key) DO NOTHING;

INSERT INTO tasks (id, org_id, project_id, title, description, status, priority, assignee_id, reporter_id, order_index) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777', 'Design service boundaries',   'Draft the contract-first API surface for all nine services', 'in_progress', 'high',   '44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 0),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777', 'Set up CI/CD pipeline',       'GitHub Actions workflow with typecheck, tests and Docker builds', 'todo', 'high',     '55555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777', 'Migrate chat to WebSockets',  'Replace polling with Socket.IO fan-out', 'todo', 'medium', '44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 2),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777', 'Write admin analytics queries', 'Aggregate per-org KPIs for the admin dashboard', 'done', 'medium', '55555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222', 3)
ON CONFLICT DO NOTHING;

INSERT INTO sprints (id, org_id, project_id, name, goal, start_date, end_date, status) VALUES
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777', 'Sprint 1', 'Foundation', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days', 'active')
ON CONFLICT DO NOTHING;

-- Demo calendar events
INSERT INTO calendar_events (id, org_id, title, description, start_at, end_at, organizer_id, attendees, reminder_minutes) VALUES
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '11111111-1111-4111-8111-111111111111', 'Sprint 1 planning', 'Plan next sprint scope', now() + INTERVAL '2 days', now() + INTERVAL '2 days' + INTERVAL '1 hour', '22222222-2222-4222-8222-222222222222',
   '[{"userId":"44444444-4444-4444-8444-444444444444","status":"accepted"},{"userId":"55555555-5555-4555-8555-555555555555","status":"pending"}]', 30)
ON CONFLICT DO NOTHING;

-- Demo files (storage_keys reference uploads/<orgId>/... created at runtime)
INSERT INTO files (id, org_id, folder_id, name, original_name, mime_type, size, storage_key, uploader_id) VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '11111111-1111-4111-8111-111111111111', NULL, 'roadmap-q3.md', 'roadmap-q3.md', 'text/markdown', 2048, '11111111-1111-4111-8111-111111111111/roadmap-q3.md', '22222222-2222-4222-8222-222222222222')
ON CONFLICT DO NOTHING;

-- Audit trail sample
INSERT INTO audit_logs (id, org_id, actor_id, action, entity_type, metadata) VALUES
  ('ffffffff-ffff-4fff-8fff-fffffffffff1', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'entitlements.updated', 'organization', '{"module":"MEETINGS","enabled":false}')
ON CONFLICT DO NOTHING;
