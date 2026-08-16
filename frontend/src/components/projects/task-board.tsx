'use client';

import { CalendarDays, Plus } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiPatch } from '@/lib/api';
import { cn, initials } from '@/lib/utils';
import type { BoardColumn, OrgMember, Task, TaskPriority, TaskStatus } from '@/lib/types';

const COLUMNS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', dot: 'bg-slate-400' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-indigo-500' },
  { key: 'in_review', label: 'In Review', dot: 'bg-amber-500' },
  { key: 'done', label: 'Done', dot: 'bg-emerald-500' },
];

const PRIORITY_VARIANT: Record<TaskPriority, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  low: 'secondary',
  medium: 'secondary',
  high: 'warning',
  urgent: 'destructive',
};

interface TaskBoardProps {
  projectId: string;
  members: OrgMember[];
  onOpenTask: (task: Task) => void;
  onCreateTask: (status: TaskStatus) => void;
  refreshToken?: number;
}

export function TaskBoard({ projectId, members, onOpenTask, onCreateTask, refreshToken = 0 }: TaskBoardProps) {
  const { data, isLoading, mutate } = useSWR<{ statuses: BoardColumn[] }>(
    ['board', projectId, refreshToken],
    () => apiGet<{ statuses: BoardColumn[] }>(`/api/projects/${projectId}/board`),
  );

  async function moveStatus(task: Task, status: TaskStatus) {
    try {
      await apiPatch(`/api/tasks/${task.id}`, { status });
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update task');
    }
  }

  function assigneeName(task: Task): string {
    return members.find((member) => member.userId === task.assigneeId)?.name ?? 'Unassigned';
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => (
          <Skeleton key={column.key} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((column) => {
        const tasks = data?.statuses.find((s) => s.key === column.key)?.tasks ?? [];
        return (
          <div key={column.key} className="flex min-h-64 flex-col rounded-xl border bg-muted/20">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <span className={cn('h-2 w-2 rounded-full', column.dot)} />
              <span className="text-sm font-semibold">{column.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{tasks.length}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onCreateTask(column.key)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  className="rounded-lg border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{task.title}</span>
                    <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                  </div>
                  {task.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {task.dueDate && (
                        <>
                          <CalendarDays className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => void moveStatus(task, event.target.value as TaskStatus)}
                        className="rounded border bg-transparent px-1 py-0.5 text-[11px]"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">{initials(assigneeName(task))}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </button>
              ))}
              {tasks.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">Drop tasks here</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
