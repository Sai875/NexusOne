import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AskDto, DraftDto, GenerateTasksDto, SummarizeDto } from './dto/copilot.dto';

export interface CopilotMeta {
  source: 'openai' | 'fallback';
  model?: string;
  latencyMs: number;
}

export interface CopilotResult {
  content: string;
  actionItems?: string[];
  tasks?: { title: string; description?: string; priority?: 'low' | 'medium' | 'high' }[];
  meta: CopilotMeta;
}

const SYSTEM_SUMMARIZER = [
  'You are the NexusOne Copilot, an enterprise assistant.',
  'Summarize the following conversation/transcript concisely (5-8 bullet points).',
  'End with an "Action items:" section listing concrete next steps with owners when identifiable.',
  'Never invent facts that are not present in the input.',
].join('\n');

const SYSTEM_TASKS = [
  'You are the NexusOne Copilot. Extract actionable tasks from the text.',
  'Respond ONLY with a JSON array: [{"title": "...", "description": "...", "priority": "low|medium|high"}].',
].join('\n');

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get('OPENAI_API_KEY', '');
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = config.get('OPENAI_MODEL', 'gpt-4o-mini');
    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY not set — Copilot running in deterministic fallback mode');
    }
  }

  // ── Summaries (SRS 4.6: chat threads + meetings) ─────────────────────────

  async summarize(dto: SummarizeDto): Promise<CopilotResult> {
    const started = Date.now();
    if (this.client) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: 0.3,
          messages: [
            { role: 'system', content: SYSTEM_SUMMARIZER },
            {
              role: 'user',
              content: `${dto.title ? `Context: ${dto.title}\n\n` : ''}${dto.text}`,
            },
          ],
        });
        return {
          content: completion.choices[0]?.message?.content ?? 'No summary produced.',
          actionItems: this.extractActionItems(completion.choices[0]?.message?.content ?? ''),
          meta: { source: 'openai', model: this.model, latencyMs: Date.now() - started },
        };
      } catch (err) {
        this.logger.warn(`OpenAI call failed, falling back: ${(err as Error).message}`);
      }
    }
    return this.fallbackSummarize(dto, started);
  }

  // ── Task generation (SRS 4.6: task generation from prompts) ─────────────

  async generateTasks(dto: GenerateTasksDto): Promise<CopilotResult> {
    const started = Date.now();
    if (this.client) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: SYSTEM_TASKS },
            { role: 'user', content: dto.text },
          ],
        });
        const raw = completion.choices[0]?.message?.content ?? '[]';
        const tasks = this.parseTaskJson(raw);
        if (tasks.length) {
          return {
            content: `Generated ${tasks.length} task${tasks.length === 1 ? '' : 's'}.`,
            tasks,
            meta: { source: 'openai', model: this.model, latencyMs: Date.now() - started },
          };
        }
      } catch (err) {
        this.logger.warn(`OpenAI call failed, falling back: ${(err as Error).message}`);
      }
    }
    return { ...this.fallbackTasks(dto.text), meta: { source: 'fallback', latencyMs: Date.now() - started } };
  }

  // ── Drafting (SRS 4.6: emails, announcements, reports) ───────────────────

  async draft(dto: DraftDto): Promise<CopilotResult> {
    const started = Date.now();
    if (this.client) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: 0.5,
          messages: [
            {
              role: 'system',
              content:
                'You are the NexusOne Copilot drafting enterprise content. Match the tone of a professional collaboration platform.',
            },
            { role: 'user', content: `${dto.kind.toUpperCase()} requested: ${dto.prompt}` },
          ],
        });
        return {
          content: completion.choices[0]?.message?.content ?? '',
          meta: { source: 'openai', model: this.model, latencyMs: Date.now() - started },
        };
      } catch (err) {
        this.logger.warn(`OpenAI call failed, falling back: ${(err as Error).message}`);
      }
    }
    return this.fallbackDraft(dto, started);
  }

  // ── Grounded Q&A (SRS 4.6: RAG with permission-filtered context) ─────────

  async ask(dto: AskDto): Promise<CopilotResult> {
    const started = Date.now();
    if (this.client && dto.context) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'Answer using ONLY the provided context. If the context does not contain the answer, say so explicitly. Cite the source passages.',
            },
            { role: 'user', content: `Context:\n${dto.context}\n\nQuestion: ${dto.question}` },
          ],
        });
        return {
          content: completion.choices[0]?.message?.content ?? 'No answer produced.',
          meta: { source: 'openai', model: this.model, latencyMs: Date.now() - started },
        };
      } catch (err) {
        this.logger.warn(`OpenAI call failed, falling back: ${(err as Error).message}`);
      }
    }
    return this.fallbackAsk(dto, started);
  }

  // ── Deterministic fallback engine ────────────────────────────────────────

  private fallbackSummarize(dto: SummarizeDto, started: number): CopilotResult {
    const sentences = this.splitSentences(dto.text);
    const keywords = /\b(need to|must|should|will|follow up|todo|decide|review|approve|schedule|fix|create|ship|blocked)\b/i;
    const actionItems = sentences
      .filter((sentence) => keywords.test(sentence))
      .slice(0, 6)
      .map((sentence) => sentence.trim());

    const top = sentences.slice(0, 3).map((s) => s.trim()).filter(Boolean);
    const content = [
      `${dto.kind === 'meeting' ? 'Meeting' : 'Conversation'} summary (deterministic extractive engine):`,
      ...top.map((s) => `- ${s}`),
      '',
      'Action items:',
      ...(actionItems.length ? actionItems.map((s) => `- ${s}`) : ['- No explicit action items detected']),
    ].join('\n');

    return {
      content,
      actionItems,
      meta: { source: 'fallback', latencyMs: Date.now() - started },
    };
  }

  private fallbackTasks(text: string): Omit<CopilotResult, 'meta'> {
    const lines = text
      .split(/\n+|(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => /^[-*#•]|\d+[.)]|\b(?:task|todo|fix|build|create|design|review|test)\b/i.test(line));
    const tasks = lines.slice(0, 12).map((line) => ({
      title: line.replace(/^[-*#•]\s*|\d+[.)]\s*/g, '').slice(0, 140),
      description: 'Extracted by Copilot (fallback engine)',
      priority: (/\b(urgent|asap|critical)\b/i.test(line) ? 'high' : 'medium') as 'high' | 'medium',
    }));
    return {
      content: `Generated ${tasks.length} task${tasks.length === 1 ? '' : 's'} (fallback engine).`,
      tasks,
    };
  }

  private fallbackDraft(dto: DraftDto, started: number): CopilotResult {
    const templates: Record<DraftDto['kind'], (prompt: string) => string> = {
      announcement: (prompt) => `## Announcement\n\n**Headline:** ${prompt}\n\nHello team,\n\n${prompt}\n\n— NexusOne Copilot (draft, review before sending)`,
      email: (prompt) => `Subject: ${prompt}\n\nHi,\n\n${prompt}\n\nBest regards,\nNexusOne Copilot (draft)`,
      report: (prompt) => `# Report: ${prompt}\n\n## Executive summary\n${prompt}\n\n## Key findings\n- TBD\n\n## Recommendations\n- TBD\n\n— Draft generated by NexusOne Copilot`,
      'project-plan': (prompt) => `# Project Plan: ${prompt}\n\n## Goal\n${prompt}\n\n## Milestones\n1. Kickoff\n2. Design\n3. Build\n4. Launch\n\n## Risks\n- TBD\n\n— Draft generated by NexusOne Copilot`,
    };
    return {
      content: templates[dto.kind](dto.prompt),
      meta: { source: 'fallback', latencyMs: Date.now() - started },
    };
  }

  private fallbackAsk(dto: AskDto, started: number): CopilotResult {
    const context = dto.context ?? '';
    if (!context) {
      return {
        content: 'No context was provided, so I cannot give a grounded answer. Attach chat excerpts or documents to enable retrieval.',
        meta: { source: 'fallback', latencyMs: Date.now() - started },
      };
    }
    const terms = dto.question
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(' ')
      .filter((word) => word.length > 3);
    const sentences = this.splitSentences(context);
    const matches = sentences.filter((sentence) => {
      const lower = sentence.toLowerCase();
      return terms.filter((term) => lower.includes(term)).length >= Math.min(1, terms.length);
    });
    return {
      content: matches.length
        ? `Grounded answer (keyword retrieval over provided context):\n\n${matches.slice(0, 5).map((m) => `- ${m.trim()}`).join('\n')}`
        : 'I could not find relevant passages in the provided context. Try attaching more specific content.',
      meta: { source: 'fallback', latencyMs: Date.now() - started },
    };
  }

  // ── Text helpers ─────────────────────────────────────────────────────────

  private splitSentences(text: string): string[] {
    return text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+|\n+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 8);
  }

  private extractActionItems(content: string): string[] {
    const lines = content.split('\n').map((line) => line.trim());
    const idx = lines.findIndex((line) => /action items/i.test(line));
    if (idx < 0) return [];
    return lines
      .slice(idx + 1)
      .filter((line) => line.startsWith('-') || line.startsWith('*'))
      .slice(0, 8);
  }

  private parseTaskJson(
    raw: string,
  ): { title: string; description?: string; priority?: 'low' | 'medium' | 'high' }[] {
    try {
      const cleaned = raw.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (item): item is { title: string; description?: string; priority?: string } =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as { title?: unknown }).title === 'string',
        )
        .map((item) => ({
          title: item.title,
          description: item.description,
          priority: (item.priority ?? undefined) as 'low' | 'medium' | 'high' | undefined,
        }))
        .slice(0, 12);
    } catch {
      return [];
    }
  }
}
