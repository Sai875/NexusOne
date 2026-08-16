# NexusOne — MongoDB collections (document-shaped data)

MongoDB stores the data that is naturally document-shaped and read/write-heavy:
chat channels + messages, and notifications. Presence lives in Redis.

## Collection: channels

```
{
  _id: ObjectId,
  orgId: UUID,            // tenant boundary
  name: string,           // e.g. "general"
  slug: string,           // unique per org
  type: 'public' | 'private' | 'dm' | 'announcement',
  description?: string,
  members: [{ userId: UUID, role?: 'owner' | 'member', joinedAt: Date }],
  createdBy: UUID,
  lastMessageAt?: Date,
  isArchived: boolean,
  createdAt: Date, updatedAt: Date
}
```
Indexes: `{ orgId: 1, slug: 1 }` unique, `{ orgId: 1, type: 1 }`, `{ 'members.userId': 1 }`.

## Collection: messages

```
{
  _id: ObjectId,
  orgId: UUID,
  channelId: ObjectId,
  authorId: UUID,
  text: string,
  threadId?: ObjectId,        // set when this message is a thread reply
  parentId?: ObjectId,        // set when this message starts a thread (for reverse lookup)
  mentions: [UUID],
  attachments: [{ name, url, size, mimeType }],
  reactions: [{ emoji: string, userIds: [UUID] }],
  editedAt?: Date,
  deletedAt?: Date,
  createdAt: Date
}
```
Indexes: `{ channelId: 1, createdAt: -1 }`, `{ orgId: 1, threadId: 1 }`,
`{ createdAt: -1 }`, text index `{ text: 'text' }` for search.

## Collection: notifications

```
{
  _id: ObjectId,
  orgId: UUID,
  userId: UUID,               // recipient
  type: 'task.assigned' | 'chat.mentioned' | 'event.reminder' | 'system' | 'invite.accepted',
  title: string,
  body: string,
  link?: string,              // deep link in the web app
  data?: object,
  readAt?: Date,
  createdAt: Date
}
```
Indexes: `{ userId: 1, readAt: 1, createdAt: -1 }` (feed), `{ orgId: 1, createdAt: -1 }`.

## Presence (Redis)

Keys:
- `presence:{orgId}:{userId}` → JSON `{ status, lastSeen }` TTL 5 min
- `presence:org:{orgId}` set of online user ids (TTL-refreshed)

## Domain event bus (Redis pub/sub, channel `domain-events`)

Events (JSON): `org.created`, `task.assigned`, `chat.mentioned`, `event.reminder`, `invite.accepted`.
Consumers: chat (org.created → default channels), notifications (task.assigned,
chat.mentioned, event.reminder, invite.accepted → in-app notifications).
In production this bus is replaced by Kafka (durable, replayable); see docs/architecture.md.
