'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FolderKanban, Plus } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { TaskBoard } from '@/components/projects/task-board';
import { TaskDialog } from '@/components/projects/task-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost } from '@/lib/api';
import { useOrgStore } from '@/lib/org-store';
import type { Project, Task, TaskStatus } from '@/lib/types';

export default function ProjectsPage() {
  const params = useSearchParams();
  const members = useOrgStore((state) => state.members);
  const { data: projects, mutate: mutateProjects } = useSWR<Project[]>('projects', () =>
    apiGet<Project[]>('/api/projects'),
  );

  const [projectId, setProjectId] = useState<string | null>(params.get('project') ?? null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({ key: '', name: '' });
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task: Task | null; status?: TaskStatus }>({
    open: false,
    task: null,
  });
  const [boardVersion, setBoardVersion] = useState(0);

  const activeProject = projects?.find((project) => project.id === projectId) ?? projects?.[0];

  async function createProject() {
    try {
      await apiPost('/api/projects', {
        key: newProject.key || undefined,
        name: newProject.name,
      });
      await mutateProjects();
      setCreateProjectOpen(false);
      setNewProject({ key: '', name: '' });
      toast.success('Project created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create project');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Plan work, assign tasks and track progress</p>
        </div>
        <div className="flex items-center gap-2">
          {projects && projects.length > 0 && (
            <Select value={activeProject?.id} onValueChange={(id) => setProjectId(id)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.key} — {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setCreateProjectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New project
          </Button>
        </div>
      </div>

      {activeProject ? (
        <TaskBoard
          projectId={activeProject.id}
          members={members}
          refreshToken={boardVersion}
          onOpenTask={(task) => setTaskDialog({ open: true, task })}
          onCreateTask={(status) => setTaskDialog({ open: true, task: null, status })}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-20 text-muted-foreground">
          <FolderKanban className="h-10 w-10 opacity-40" />
          <p className="text-sm">No projects yet — create one to get started</p>
        </div>
      )}

      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>Projects group tasks into a single board.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="Platform Revamp" />
            </div>
            <div className="space-y-2">
              <Label>Key (optional)</Label>
              <Input
                value={newProject.key}
                onChange={(e) => setNewProject({ ...newProject, key: e.target.value.toUpperCase() })}
                placeholder="PLAT"
                maxLength={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateProjectOpen(false)}>Cancel</Button>
            <Button onClick={createProject} disabled={!newProject.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeProject && (
        <TaskDialog
          open={taskDialog.open}
          onOpenChange={(open) => setTaskDialog({ open, task: taskDialog.task, status: taskDialog.status })}
          projectId={activeProject.id}
          task={taskDialog.task}
          defaultStatus={taskDialog.status}
          members={members}
          onSaved={() => setBoardVersion((version) => version + 1)}
        />
      )}
    </div>
  );
}
