import { ConfigService } from '@nestjs/config';
import { CopilotService } from '../src/copilot/copilot.service';

function makeService(): CopilotService {
  const config = { get: jest.fn((_k: string, d?: unknown) => d) } as unknown as ConfigService;
  return new CopilotService(config);
}

describe('CopilotService (fallback engine)', () => {
  it('summarizes chat text and extracts action items', async () => {
    const service = makeService();
    const result = await service.summarize({
      kind: 'chat',
      text: 'We need to ship the auth module by Friday. Carol will fix the refresh token bug. Dave should review the PR. Also schedule a demo for the stakeholders.',
    });
    expect(result.meta.source).toBe('fallback');
    expect(result.content).toContain('Action items');
    expect(result.actionItems?.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts tasks from a prompt', async () => {
    const service = makeService();
    const result = await service.generateTasks({
      text: 'Create the login page. Build the kanban board. Also fix the upload bug asap.',
    });
    expect(result.tasks?.length).toBe(3);
    expect(result.tasks?.[2].priority).toBe('high');
  });

  it('grounds answers in provided context', async () => {
    const service = makeService();
    const result = await service.ask({
      question: 'What is the password policy?',
      context: 'Password policy: minimum 8 characters with one letter and one digit. Passwords expire every 90 days.',
    });
    expect(result.content).toContain('8 characters');
  });

  it('refuses to answer without context', async () => {
    const service = makeService();
    const result = await service.ask({ question: 'Anything?' });
    expect(result.content).toContain('No context');
  });

  it('drafts a report with a template', async () => {
    const service = makeService();
    const result = await service.draft({ kind: 'report', prompt: 'Q3 performance' });
    expect(result.content).toContain('Q3 performance');
    expect(result.content).toContain('Executive summary');
  });
});
