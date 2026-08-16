export interface OrgModule {
  key: string;
  enabled: boolean;
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
  recentActivity: {
    action: string;
    entityType: string | null;
    actorId: string | null;
    createdAt: string;
  }[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface OrgStructure {
  departments: { id: string; name: string; headId: string | null }[];
}
