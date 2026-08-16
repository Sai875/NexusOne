# NexusOne — UML Diagrams

## 1. Domain class diagram (core services)

```mermaid
classDiagram
    class AuthService {
        +register(dto) Session
        +login(dto) Session
        +refresh(dto) Session
        +logout(userId) void
        +switchOrg(userId, orgId) Session
        +createInvite(dto, actor) Invitation
        +acceptInvite(dto) Session
    }
    class UsersService {
        +findByEmail(email) User
        +findWithPassword(email) User
        +create(data) User
    }
    class JwtAuthGuard {
        +canActivate(ctx) boolean
    }
    class RolesGuard {
        +canActivate(ctx) boolean
    }
    class AuthService --> UsersService
    AuthService ..> JwtAuthGuard : protected by
    AuthService ..> RolesGuard : protected by

    class ChatService {
        +listChannels(orgId, userId) Channel[]
        +createChannel(dto, user) Channel
        +sendMessage(channelId, dto, user) Message
        +toggleReaction(messageId, emoji, user) Message
        +search(orgId, q) Message[]
        +canAccess(channel, orgId, userId) boolean
    }
    class ChatGateway {
        +handleConnection(socket) void
        +onMessage(socket, payload) void
        +onReaction(socket, payload) void
    }
    class PresenceService {
        +setStatus(orgId, userId, status) void
        +onlineUserIds(orgId) string[]
    }
    ChatGateway --> ChatService
    ChatGateway --> PresenceService

    class ProjectsService {
        +createProject(dto, user) Project
        +createTask(dto, user) Task
        +updateTask(orgId, taskId, dto, user) Task
        +board(orgId, projectId) Board
        +addComment(orgId, taskId, body, user) TaskComment
        -notifyAssignment(task, actor) void
    }
    class DomainEventsService {
        +publish(type, orgId, payload) void
    }
    ProjectsService --> DomainEventsService

    class NotificationsService {
        +create(orgId, userId, input) Notification
        +list(userId, orgId, limit) Notification[]
        +stream(userId, orgId) Observable
    }
    class EventsConsumer {
        +handle(event) void
    }
    EventsConsumer --> NotificationsService

    class CopilotService {
        +summarize(dto) CopilotResult
        +generateTasks(dto) CopilotResult
        +draft(dto) CopilotResult
        +ask(dto) CopilotResult
        -fallbackSummarize(dto) CopilotResult
    }
```

## 2. Sequence — authentication flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant G as Gateway
    participant A as Auth Service
    participant P as PostgreSQL

    B->>G: POST /api/auth/login {email, password}
    G->>A: proxy /auth/login
    A->>P: SELECT user + membership
    alt credentials valid
        A->>A: bcrypt.compare, sign access+refresh JWT
        A->>P: INSERT refresh_token (jti)
        A-->>B: 200 {accessToken, refreshToken, user, orgs, currentOrg}
    else invalid
        A-->>B: 401 Invalid email or password
    end
    B->>G: GET /api/orgs/me (Bearer)
    G->>A: proxy /auth/me
    A-->>B: org + modules + structure
```

## 3. Sequence — realtime message delivery

```mermaid
sequenceDiagram
    participant U1 as User A (browser)
    participant WS as Chat Service (Socket.IO)
    participant M as MongoDB
    participant U2 as User B (browser)

    U1->>WS: connect (auth.token in handshake)
    U1->>WS: channel:join {channelId}
    U1->>WS: message:send {channelId, text}
    WS->>M: insert message
    WS->>WS: update channel.lastMessageAt
    WS-->>U2: message:new (channel room)
    U2->>WS: channel:join {channelId}
```

## 4. Sequence — task assignment → notification

```mermaid
sequenceDiagram
    participant U as User
    participant P as Projects Service
    participant R as Redis (domain-events)
    participant N as Notifications Service
    participant M as MongoDB
    participant B as Browser (SSE stream)

    U->>P: PATCH /api/tasks/:id {assigneeId}
    P->>P: update task + audit log
    P->>R: publish task.assigned
    R->>N: deliver
    N->>M: insert notification
    N-->>B: SSE push (user-notifications)
    B-->>U: toast "Task assigned to you"
```

## 5. Deployment diagram

```mermaid
flowchart LR
    subgraph DockerHost
        PG[(postgres:16)]
        MG[(mongo:7)]
        RD[(redis:7)]
        subgraph Backend
            A[auth] --- O[org] --- C[chat] --- P[projects] --- F[files] --- K[calendar] --- N[notifications] --- AI[ai]
        end
        GW[gateway :8080] --- Backend
        FE[frontend :3000]
    end
    Browser --> FE
    Browser --> GW
    Browser -->|ws| C
```
