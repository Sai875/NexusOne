export interface OrgSummary {
  id: string;
  slug: string;
  name: string;
  roles: string[];
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  orgs: OrgSummary[];
  currentOrg: OrgSummary;
}

export type ChannelType = 'public' | 'private' | 'dm' | 'announcement';

export interface Channel {
  _id: string;
  orgId: string;
  name: string;
  slug: string;
  type: ChannelType;
  description?: string;
  members: { userId: string; role?: string; joinedAt?: string }[];
  lastMessageAt?: string | null;
  isArchived?: boolean;
}

export interface Attachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  _id: string;
  orgId: string;
  channelId: string;
  authorId: string;
  text: string;
  threadId?: string | null;
  parentId?: string | null;
  mentions?: string[];
  attachments?: Attachment[];
  reactions?: Reaction[];
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  orgId: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string | null;
  dueDate: string | null;
  estimatedHours: string | null;
  labels: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  workspaceId: string | null;
  key: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  startDate?: string | null;
  dueDate?: string | null;
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string | null;
  organizerId: string | null;
  attendees: { userId: string; status: 'pending' | 'accepted' | 'declined' }[];
  reminderMinutes: number | null;
}

export interface FileItem {
  id: string;
  orgId: string;
  folderId: string | null;
  name: string;
  originalName: string;
  mimeType: string | null;
  size: string;
  uploaderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem {
  id: string;
  orgId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  orgId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface OrgModule {
  key: string;
  enabled: boolean;
}

export interface OrgMember {
  userId: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
  joinedAt: string;
}

export interface AnalyticsSummary {
  members: number;
  projects: number;
  tasks: number;
  tasksDone: number;
  completionRate: number;
  files: number;
  events: number;
  activity7d: number;
  tasksByStatus: { status: string; count: string }[];
  recentActivity: { action: string; entityType: string | null; actorId: string | null; createdAt: string }[];
}

export interface BoardColumn {
  key: TaskStatus;
  label: string;
  tasks: Task[];
}

export interface CopilotResult {
  content: string;
  actionItems?: string[];
  tasks?: { title: string; description?: string; priority?: 'low' | 'medium' | 'high' }[];
  meta: { source: 'openai' | 'fallback'; model?: string; latencyMs: number };
}
