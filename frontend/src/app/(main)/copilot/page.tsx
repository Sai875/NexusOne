'use client';

import { useState } from 'react';
import { Bot, ListChecks, PenLine, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPost } from '@/lib/api';
import { useChatStore } from '@/lib/chat-store';
import type { CopilotResult, Project, Task } from '@/lib/types';

function SourceBadge({ source }: { source: 'openai' | 'fallback' }) {
  return (
    <Badge variant={source === 'openai' ? 'success' : 'warning'}>
      {source === 'openai' ? 'OpenAI' : 'Deterministic engine'}
    </Badge>
  );
}

function ResultPanel({ result }: { result: CopilotResult | null }) {
  if (!result) return null;
  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bot className="h-4 w-4" />
        Copilot responded
        <SourceBadge source={result.meta.source} />
        {result.meta.latencyMs !== undefined && ` · ${result.meta.latencyMs}ms`}
      </div>
      <div className="whitespace-pre-wrap text-sm">{result.content}</div>
      {result.actionItems && result.actionItems.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Action items</div>
          <ul className="list-inside list-disc space-y-0.5 text-sm">
            {result.actionItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {result.tasks && result.tasks.length > 0 && <GeneratedTasks tasks={result.tasks} />}
    </div>
  );
}

function GeneratedTasks({ tasks }: { tasks: CopilotResult['tasks'] }) {
  const { data: projects } = useSWR<Project[]>('copilot-projects', () => apiGet<Project[]>('/api/projects'));
  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);

  async function commit() {
    if (!projectId || !tasks) return;
    setCreating(true);
    try {
      for (const task of tasks) {
        await apiPost<Task>('/api/tasks', {
          projectId,
          title: task.title,
          description: task.description,
          priority: task.priority,
        });
      }
      toast.success(`Created ${tasks.length} task${tasks.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create tasks');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Generated tasks ({tasks?.length}) — review before committing
        </span>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Target project" />
          </SelectTrigger>
          <SelectContent>
            {(projects ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.key} — {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={commit} disabled={!projectId || creating}>
          {creating ? 'Creating…' : 'Commit to board'}
        </Button>
      </div>
      <ul className="list-inside list-disc text-sm">
        {tasks?.map((task, index) => (
          <li key={index}>
            {task.title}{' '}
            {task.priority && <Badge variant="secondary" className="text-[10px]">{task.priority}</Badge>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CopilotPage() {
  const channels = useChatStore((state) => state.channels);
  const messagesByChannel = useChatStore((state) => state.messagesByChannel);

  const [summaryKind, setSummaryKind] = useState<'chat' | 'meeting'>('chat');
  const [summaryText, setSummaryText] = useState('');
  const [summaryResult, setSummaryResult] = useState<CopilotResult | null>(null);

  const [tasksText, setTasksText] = useState('');
  const [tasksResult, setTasksResult] = useState<CopilotResult | null>(null);

  const [draftKind, setDraftKind] = useState<'announcement' | 'email' | 'report' | 'project-plan'>('announcement');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftResult, setDraftResult] = useState<CopilotResult | null>(null);

  const [askQuestion, setAskQuestion] = useState('');
  const [askContext, setAskContext] = useState('');
  const [askResult, setAskResult] = useState<CopilotResult | null>(null);

  const [busy, setBusy] = useState(false);

  function grabLatestChat() {
    const channelId = useChatStore.getState().activeChannelId;
    const messages = channelId ? messagesByChannel[channelId] ?? [] : [];
    if (!messages.length) {
      toast.info('Open a channel first — no messages to summarize');
      return;
    }
    setSummaryText(
      messages
        .slice(-40)
        .map((message) => `${new Date(message.createdAt).toLocaleTimeString()} · ${message.text}`)
        .join('\n'),
    );
    toast.success(`Loaded ${Math.min(messages.length, 40)} messages from the active channel`);
  }

  async function run(fn: () => Promise<CopilotResult>, setResult: (r: CopilotResult) => void) {
    setBusy(true);
    try {
      setResult(await fn());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Copilot request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" /> AI Copilot
        </h1>
        <p className="text-sm text-muted-foreground">
          Summarize conversations and meetings, generate tasks, draft content and answer questions from your
          documents. The Copilot drafts — you approve (SRS §4.6).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Summarize
          </CardTitle>
          <CardDescription>Chat threads and meeting transcripts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={summaryKind} onValueChange={(kind) => setSummaryKind(kind as 'chat' | 'meeting')}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">Chat thread</SelectItem>
                <SelectItem value="meeting">Meeting transcript</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={grabLatestChat}>
              Load active channel
            </Button>
          </div>
          <Textarea
            rows={5}
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            placeholder="Paste a chat thread or meeting transcript…"
          />
          <Button
            onClick={() =>
              void run(() => apiPost<CopilotResult>('/api/copilot/summarize', { kind: summaryKind, text: summaryText }), setSummaryResult)
            }
            disabled={busy || !summaryText.trim()}
          >
            Summarize
          </Button>
          <ResultPanel result={summaryResult} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Generate tasks
          </CardTitle>
          <CardDescription>Turn notes into tasks on your project board</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            value={tasksText}
            onChange={(e) => setTasksText(e.target.value)}
            placeholder="e.g. Create the login page, build the kanban board, fix the upload bug asap…"
          />
          <Button
            onClick={() =>
              void run(() => apiPost<CopilotResult>('/api/copilot/tasks', { text: tasksText }), setTasksResult)
            }
            disabled={busy || !tasksText.trim()}
          >
            Extract tasks
          </Button>
          <ResultPanel result={tasksResult} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4" /> Draft
          </CardTitle>
          <CardDescription>Announcements, emails, reports and project plans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={draftKind} onValueChange={(kind) => setDraftKind(kind as typeof draftKind)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="project-plan">Project plan</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            rows={3}
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            placeholder="Describe what to write…"
          />
          <Button
            onClick={() =>
              void run(() => apiPost<CopilotResult>('/api/copilot/draft', { kind: draftKind, prompt: draftPrompt }), setDraftResult)
            }
            disabled={busy || !draftPrompt.trim()}
          >
            Draft
          </Button>
          <ResultPanel result={draftResult} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ask with context</CardTitle>
          <CardDescription>Grounded answers from documents you provide (RAG-style, permission-filtered)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input value={askQuestion} onChange={(e) => setAskQuestion(e.target.value)} placeholder="What is our password policy?" />
          </div>
          <div className="space-y-2">
            <Label>Context</Label>
            <Textarea
              rows={4}
              value={askContext}
              onChange={(e) => setAskContext(e.target.value)}
              placeholder="Paste policy excerpts or documents…"
            />
          </div>
          <Button
            onClick={() =>
              void run(
                () => apiPost<CopilotResult>('/api/copilot/ask', { question: askQuestion, context: askContext || undefined }),
                setAskResult,
              )
            }
            disabled={busy || !askQuestion.trim()}
          >
            Ask
          </Button>
          <ResultPanel result={askResult} />
        </CardContent>
      </Card>
    </div>
  );
}
