import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/public.decorator';

@Controller('health')
export class HealthController {
  private readonly serviceUrls: [string, string][];

  constructor(config: ConfigService) {
    this.serviceUrls = [
      ['auth', config.get('SERVICE_AUTH_URL', 'http://localhost:3001')],
      ['org', config.get('SERVICE_ORG_URL', 'http://localhost:3002')],
      ['chat', config.get('SERVICE_CHAT_URL', 'http://localhost:3003')],
      ['projects', config.get('SERVICE_PROJECTS_URL', 'http://localhost:3004')],
      ['files', config.get('SERVICE_FILES_URL', 'http://localhost:3005')],
      ['calendar', config.get('SERVICE_CALENDAR_URL', 'http://localhost:3006')],
      ['notifications', config.get('SERVICE_NOTIFICATIONS_URL', 'http://localhost:3007')],
      ['ai', config.get('SERVICE_AI_URL', 'http://localhost:3008')],
    ];
  }

  @Public()
  @Get()
  async check() {
    const checks = await Promise.all(
      this.serviceUrls.map(async ([name, url]) => {
        try {
          const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
          return { name, status: response.ok ? 'up' : 'degraded', http: response.status };
        } catch {
          return { name, status: 'down' };
        }
      }),
    );
    const allUp = checks.every((check) => check.status === 'up');
    return { status: allUp ? 'ok' : 'degraded', services: checks, timestamp: new Date().toISOString() };
  }
}
