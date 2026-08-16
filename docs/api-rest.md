# NexusOne — REST API Reference

All routes are reachable through the gateway at `/api/*` (services also
serve Swagger at `/docs` directly). Authenticated endpoints expect
`Authorization: Bearer <accessToken>`. DTOs are validated with
class-validator; responses use ISO-8601 dates.

## Auth service — `/api/auth`

| Method | Path                    | Auth   | Description |
| ------ | ----------------------- | ------ | ----------- |
| POST   | /auth/register          | Public | Create user + organization (first member = ORG_ADMIN) |
| POST   | /auth/login             | Public | Email/password → tokens + org list |
| POST   | /auth/refresh           | Public | Rotate a refresh token |
| POST   | /auth/logout            | JWT    | Revoke all refresh tokens |
| GET    | /auth/me                | JWT    | Profile + orgs + current org |
| POST   | /auth/switch-org        | JWT    | Re-issue tokens for another org |
| POST   | /auth/invites           | Admin/Manager | Create invite link |
| GET    | /auth/invites           | Admin/Manager | Pending invites |
| POST   | /auth/invite/accept     | Public | Accept invite → membership + tokens |
| GET    | /auth/health            | Public | Liveness |

## Org service — `/api/orgs` & `/api/admin`

| Method | Path                         | Auth   | Description |
| ------ | ---------------------------- | ------ | ----------- |
| GET    | /orgs/me                     | JWT    | Shell data: org + module flags + structure |
| GET    | /orgs/structure              | JWT    | Departments (with teams) |
| GET    | /orgs/entitlements           | JWT    | Module enablement flags |
| POST   | /orgs/departments            | Admin/Manager | Create department |
| POST   | /orgs/teams                  | Admin/Manager | Create team |
| POST   | /orgs/teams/:teamId/members  | Admin/Manager | Add member to team |
| GET    | /admin/members               | Admin/Manager | Members with roles |
| PATCH  | /admin/members/:id/roles     | Admin    | Update roles (audited) |
| DELETE | /admin/members/:id           | Admin    | Deactivate membership (audited) |
| GET    | /admin/entitlements          | Admin/Manager | Module flags |
| PATCH  | /admin/entitlements          | Admin    | Toggle modules (audited) |
| GET    | /admin/analytics             | Admin/Manager | Org KPIs + tasksByStatus + recent activity |
| GET    | /admin/audit-logs?limit=50   | Admin/Manager | Audit trail |

## Chat service — `/api/channels`, `/api/messages`, `/api/search`

| Method | Path                          | Description |
| ------ | ----------------------------- | ----------- |
| GET    | /channels                     | Channels visible to me |
| POST   | /channels                     | Create channel (public/private/dm/announcement) |
| GET    | /channels/:id/messages?before&limit | Paginated messages (newest first) |
| POST   | /channels/:id/messages        | Send message (`parentId` = thread reply) |
| GET    | /channels/:id/thread/:messageId | Thread replies |
| PATCH  | /messages/:id                 | Edit own message |
| DELETE | /messages/:id                 | Soft-delete (author or admin) |
| POST   | /messages/:id/reactions       | Toggle emoji reaction |
| GET    | /search?q=                    | Full-text search over messages |
| GET    | /presence/online              | Online user ids |

Realtime surface (Socket.IO at the chat service port): connect with
`auth.token`; events `channel:join`, `channel:leave`, `message:send`,
`message:edit`, `message:delete`, `reaction:toggle`, `presence:update`;
server pushes `message:new`, `message:updated`, `message:deleted`,
`reaction:updated`, `presence:update`.

## Projects service — `/api/projects`, `/api/tasks`, `/api/sprints`

| Method | Path                            | Description |
| ------ | ------------------------------- | ----------- |
| GET    | /workspaces                     | List workspaces |
| POST   | /workspaces                     | Create workspace |
| GET    | /projects?workspaceId=          | List projects |
| POST   | /projects                       | Create project (key auto-generated) |
| GET    | /projects/:id                   | Project + task count |
| PATCH  | /projects/:id                   | Update project |
| GET    | /projects/:id/board             | Kanban columns of tasks |
| GET    | /projects/:id/tasks             | Tasks of a project |
| GET    | /projects/:id/activity          | Recent activity for project |
| GET    | /tasks?projectId=&assigneeId=   | List tasks |
| POST   | /tasks                          | Create task (publishes `task.assigned`) |
| GET    | /tasks/:id                      | Task + comments |
| PATCH  | /tasks/:id                      | Update (status/assignee/priority/…, audited) |
| DELETE | /tasks/:id                      | Delete task |
| POST   | /tasks/:id/comments             | Add comment |
| GET    | /sprints?projectId=             | List sprints |
| POST   | /sprints                        | Create sprint |

## Files service — `/api/files`

| Method | Path                     | Auth   | Description |
| ------ | ------------------------ | ------ | ----------- |
| GET    | /files?folderId=         | JWT    | List files |
| GET    | /files/folders           | JWT    | List folders |
| POST   | /files/folders           | JWT    | Create folder |
| POST   | /files/upload            | JWT    | Multipart upload (`file`, `folderId`) |
| GET    | /files/:id/download      | JWT    | Stream download |
| PATCH  | /files/:id               | JWT    | Rename / move |
| DELETE | /files/:id               | JWT    | Delete + storage cleanup |
| POST   | /files/:id/share-link    | JWT    | Create expiring share link |
| GET    | /files/share/:token      | Public | Resolve share link |
| GET    | /files/share/:token/download | Public | Download via share link |

## Calendar service — `/api/events`

| Method | Path                        | Description |
| ------ | --------------------------- | ----------- |
| GET    | /events?from&to&mine        | Events in range (optionally mine) |
| POST   | /events                     | Create event (publishes `event.reminder`) |
| PATCH  | /events/:id                 | Update event |
| DELETE | /events/:id                 | Delete event |
| POST   | /events/:id/rsvp            | Accept/decline |
| GET    | /events/availability?userIds&from&to | Free/busy windows |

## Notifications service — `/api/notifications`

| Method | Path                         | Description |
| ------ | ---------------------------- | ----------- |
| GET    | /notifications?limit&before  | Feed |
| GET    | /notifications/unread-count  | Unread count |
| PATCH  | /notifications/:id/read      | Mark one read |
| PATCH  | /notifications/read-all      | Mark all read |
| GET    | /notifications/stream?token= | SSE live stream (JWT as query param) |

## AI Copilot service — `/api/copilot`

| Method | Path                  | Description |
| ------ | --------------------- | ----------- |
| POST   | /copilot/summarize    | `{kind: chat\|meeting, text, title?}` → summary + action items |
| POST   | /copilot/tasks        | `{text}` → extracted tasks |
| POST   | /copilot/draft        | `{kind: announcement\|email\|report\|project-plan, prompt}` |
| POST   | /copilot/ask          | `{question, context?}` → grounded answer |

Every Copilot response includes `meta.source` (`openai` or `fallback`) so
clients can show which engine produced the answer.

## Error shape

```json
{ "statusCode": 404, "message": "Task not found", "error": "Not Found" }
```

Common codes: `401` (missing/expired token), `403` (role or channel
membership insufficient), `409` (unique conflict), `422/400` (DTO validation).
