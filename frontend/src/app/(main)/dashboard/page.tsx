'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { graphql } from '@/lib/api';
import type { AnalyticsSummary } from '@/lib/types';

const DASHBOARD_QUERY = `
  query Dashboard {
    dashboard {
      members projects tasks tasksDone completionRate files events activity7d
      tasksByStatus { status count }
      recentActivity { action entityType actorId createdAt }
    }
  }
`;

const STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#6366f1',
  in_review: '#f59e0b',
  done: '#22c55e',
};

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<{ dashboard: AnalyticsSummary }>(
    'dashboard-graphql',
    () => graphql<{ dashboard: AnalyticsSummary }>(DASHBOARD_QUERY),
  );

  const summary = data?.dashboard;

  const kpis = [
    { label: 'Members', value: summary?.members, icon: Users },
    { label: 'Projects', value: summary?.projects, icon: ShieldCheck },
    { label: 'Open tasks', value: summary ? summary.tasks - summary.tasksDone : undefined, icon: CheckCircle2 },
    { label: 'Completion rate', value: summary ? `${summary.completionRate}%` : undefined, icon: Activity },
    { label: 'Files', value: summary?.files, icon: FolderOpen },
    { label: 'Calendar events', value: summary?.events, icon: CalendarDays },
  ];

  const chartData = (summary?.tasksByStatus ?? []).map((row) => ({
    name: row.status.replace('_', ' '),
    count: Number(row.count),
    fill: STATUS_COLORS[row.status] ?? '#6366f1',
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Organization overview and recent activity</p>
        </div>
        <Button asChild>
          <Link href="/chat">
            <MessageSquare className="mr-2 h-4 w-4" /> Open Chat
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      )}

      {error && (
        <Card className="p-6 text-sm text-destructive">
          Could not load dashboard: {error instanceof Error ? error.message : 'unknown error'}
        </Card>
      )}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{kpi.label}</span>
                    </div>
                    <div className="mt-2 text-2xl font-bold">{kpi.value ?? '—'}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Tasks by status</CardTitle>
                <CardDescription>Across all projects in this organization</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
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
                  <p className="py-10 text-center text-sm text-muted-foreground">No tasks yet — create some in Projects.</p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Last 10 events across modules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.recentActivity.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
                )}
                {summary.recentActivity.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                      {item.action}
                    </Badge>
                    <span className="truncate text-muted-foreground">{item.entityType ?? '—'}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Jump straight into the module you need</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href="/chat">Start a conversation</Link></Button>
              <Button asChild variant="outline"><Link href="/projects">Open task board</Link></Button>
              <Button asChild variant="outline"><Link href="/calendar">Schedule a meeting</Link></Button>
              <Button asChild variant="outline"><Link href="/files">Upload a file</Link></Button>
              <Button asChild variant="outline"><Link href="/copilot"><ArrowRight className="mr-2 h-4 w-4" /> Ask the Copilot</Link></Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
