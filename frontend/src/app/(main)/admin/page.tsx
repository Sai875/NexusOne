'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useOrgStore } from '@/lib/org-store';
import { initials } from '@/lib/utils';
import type { AnalyticsSummary, AuditLogEntry, OrgModule, OrgStructure } from './types';

const STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#6366f1',
  in_review: '#f59e0b',
  done: '#22c55e',
};

const ROLES = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'EMPLOYEE', 'GUEST'];

export default function AdminPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const currentOrg = useAuthStore((state) => state.currentOrg);
  const members = useOrgStore((state) => state.members);
  const setMembers = useOrgStore((state) => state.setMembers);
  const [tab, setTab] = useState('overview');

  const { data: analytics, mutate: mutateAnalytics } = useSWR<AnalyticsSummary>(
    'admin-analytics',
    () => apiGet<AnalyticsSummary>('/api/admin/analytics'),
  );
  const { data: entitlements, mutate: mutateEntitlements } = useSWR<OrgModule[]>(
    'admin-entitlements',
    () => apiGet<OrgModule[]>('/api/admin/entitlements'),
  );
  const { data: structure } = useSWR<OrgStructure>('admin-structure', () =>
    apiGet<OrgStructure>('/api/orgs/structure'),
  );
  const { data: auditLogs } = useSWR<AuditLogEntry[]>('admin-audit', () =>
    apiGet<AuditLogEntry[]>('/api/admin/audit-logs?limit=25'),
  );

  if (!isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <ShieldAlert className="h-10 w-10 opacity-40" />
        <p className="text-sm">You need an admin or manager role to view this page.</p>
      </div>
    );
  }

  async function changeRole(userId: string, roles: string[]) {
    try {
      await apiPatch(`/api/admin/members/${userId}/roles`, { roles });
      setMembers(members.map((member) => (member.userId === userId ? { ...member, roles } : member)));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update role');
    }
  }

  async function removeMember(userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from the organization?`)) return;
    try {
      await apiDelete(`/api/admin/members/${userId}`);
      setMembers(members.filter((member) => member.userId !== userId));
      await mutateAnalytics();
      toast.success('Member removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove member');
    }
  }

  async function toggleModule(module: string, enabled: boolean) {
    try {
      await apiPatch('/api/admin/entitlements', {
        changes: [{ module, enabled }],
      });
      await mutateEntitlements();
      toast.success(`${module} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update entitlement');
    }
  }

  const chartData = (analytics?.tasksByStatus ?? []).map((row) => ({
    name: row.status.replace('_', ' '),
    count: Number(row.count),
    fill: STATUS_COLORS[row.status] ?? '#6366f1',
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          {currentOrg?.name} · organization administration
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="entitlements">Modules</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Members', analytics?.members],
              ['Projects', analytics?.projects],
              ['Tasks', analytics?.tasks],
              ['Completion', analytics ? `${analytics.completionRate}%` : undefined],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="text-xs font-medium text-muted-foreground">{label}</div>
                  <div className="mt-1 text-2xl font-bold">{value ?? '—'}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Task pipeline</CardTitle>
              <CardDescription>Open work across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Manage roles and access ({members.length})</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">{initials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={member.roles[0] ?? 'EMPLOYEE'} onValueChange={(role) => void changeRole(member.userId, [role])}>
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'success' : 'secondary'}>{member.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void removeMember(member.userId, member.name)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entitlements">
          <Card>
            <CardHeader>
              <CardTitle>Module entitlements</CardTitle>
              <CardDescription>
                Every module is independently licensable per organization (SRS §2.3). Disabling hides it from
                navigation; data is retained.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(entitlements ?? []).map((module) => (
                <div key={module.key} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">{module.key}</div>
                    <div className="text-xs text-muted-foreground">
                      {module.enabled ? 'Enabled for this organization' : 'Disabled — data retained'}
                    </div>
                  </div>
                  <Switch
                    checked={module.enabled}
                    onCheckedChange={(enabled) => void toggleModule(module.key, enabled)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>Organization structure</CardTitle>
              <CardDescription>Departments and teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(structure?.departments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No departments defined yet.</p>
              )}
              {structure?.departments.map((department) => (
                <div key={department.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <span className="font-medium">{department.name}</span>
                  <span className="text-xs text-muted-foreground">Department</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
              <CardDescription>Admin actions and permission changes (SRS §10.3)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditLogs ?? []).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.entityType ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(auditLogs ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        No audit entries yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
