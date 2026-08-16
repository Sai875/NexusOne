'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { OrgMember, Task, TaskComment, TaskPriority, TaskStatus } from '@/lib/types';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task: Task | null; // null = create mode
  defaultStatus?: TaskStatus;
  members: OrgMember[];
  onSaved: () => void;
}

export function TaskDialog({ open, onOpenChange, projectId, task, defaultStatus, members, onSaved }: TaskDialogProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    assigneeId: '',
    dueDate: '',
  });
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? defaultStatus ?? 'todo',
      priority: task?.priority ?? 'medium',
      assigneeId: task?.assigneeId ?? '',
      dueDate: task?.dueDate ?? '',
    });
    if (task) {
      void apiGet<{ task: Task; comments: TaskComment[] }>(`/api/tasks/${task.id}`).then((data) =>
        setComments(data.comments),
      );
    } else {
      setComments([]);
    }
  }, [open, task, defaultStatus]);

  async function save() {
    setSaving(true);
    try {
      const body = {
        ...form,
        assigneeId: form.assigneeId || undefined,
        dueDate: form.dueDate || undefined,
      };
      if (task) {
        await apiPatch(`/api/tasks/${task.id}`, body);
        toast.success('Task updated');
      } else {
        await apiPost('/api/tasks', { projectId, ...body });
        toast.success('Task created');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save task');
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    if (!task || !commentBody.trim()) return;
    try {
      await apiPost(`/api/tasks/${task.id}/comments`, { body: commentBody });
      setCommentBody('');
      const data = await apiGet<{ task: Task; comments: TaskComment[] }>(`/api/tasks/${task.id}`);
      setComments(data.comments);
    } catch {
      toast.error('Could not add comment');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>Details, assignee and workflow status</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(status) => setForm({ ...form, status: status as TaskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(priority) => setForm({ ...form, priority: priority as TaskPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={form.assigneeId} onValueChange={(assigneeId) => setForm({ ...form, assigneeId })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>

          {task && (
            <div className="space-y-2 border-t pt-3">
              <Label>Comments</Label>
              <div className="max-h-40 space-y-2 overflow-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-md border bg-muted/30 p-2 text-sm">
                    <div className="text-[10px] text-muted-foreground">
                      {members.find((m) => m.userId === comment.authorId)?.name ?? 'Team member'} ·{' '}
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                    {comment.body}
                  </div>
                ))}
                {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addComment();
                  }}
                />
                <Button variant="secondary" onClick={addComment}>Post</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.title.trim()}>
            {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
