# NexusOne — GraphQL Aggregation Layer

GraphQL is served by the **gateway** at `/graphql` (same-origin via the
frontend, or `http://localhost:8080/graphql`). It is the client-facing
aggregation layer (SRS §8): dashboard-style screens combine data from several
services in one round trip. It uses the same `Authorization: Bearer` header
as REST.

## Schema

```graphql
type Project {
  id: ID!
  key: String!
  name: String!
  description: String
  status: String!
  dueDate: String
}

type Task {
  id: ID!
  projectId: ID!
  title: String!
  description: String
  status: String!
  priority: String!
  assigneeId: ID
  createdAt: String!
  updatedAt: String!
}

type Channel {
  id: ID!
  name: String!
  slug: String!
  type: String!
  lastMessageAt: String
}

type Notification {
  id: ID!
  type: String!
  title: String!
  body: String!
  link: String
  readAt: String
  createdAt: String!
}

type TasksByStatus {
  status: String!
  count: Int!
}

type RecentActivity {
  action: String!
  entityType: String
  actorId: ID
  createdAt: String!
}

type DashboardSummary {
  members: Int!
  projects: Int!
  tasks: Int!
  tasksDone: Int!
  completionRate: Int!
  files: Int!
  events: Int!
  activity7d: Int!
  tasksByStatus: [TasksByStatus!]!
  recentActivity: [RecentActivity!]!
}

type CopilotSummary {
  content: String!
  actionItems: [String]
  source: String!
}

type Query {
  dashboard: DashboardSummary!
  projects: [Project!]!
  tasksByProject(projectId: ID!): [Task!]!
  channels: [Channel!]!
  notifications(limit: Int): [Notification!]!
}

type Mutation {
  createTask(projectId: ID!, title: String!, description: String): Task!
  markAllNotificationsRead: Boolean!
  summarizeChat(text: String!): CopilotSummary!
}
```

> The schema is code-first (`schema.gql` is generated at gateway startup by
> `@nestjs/graphql`); the definition above is the generated contract.

## Example — dashboard in one round trip

```graphql
query {
  dashboard {
    members projects tasks tasksDone completionRate
    tasksByStatus { status count }
    recentActivity { action entityType createdAt }
  }
  channels { id name slug }
  notifications(limit: 5) { id title body readAt }
}
```

## Example — create a task and summarize a thread

```graphql
mutation {
  createTask(projectId: "77777777-7777-4777-8777-777777777777", title: "Ship v1.0") {
    id status
  }
}
```

## Why both REST and GraphQL?

- **REST** is the canonical per-resource API — third-party integrations,
  webhooks, and CRUD-heavy flows use it.
- **GraphQL** aggregates across service boundaries for screens (dashboard,
  notifications + tasks + channels), avoiding N+1 browser round trips.
Contracts are intentionally not duplicated per-resource; GraphQL resolves
against the same services the gateway proxies to.
