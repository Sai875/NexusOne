import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { rateLimitMiddleware } from './rate-limit.middleware';

/**
 * The gateway is the single entry point for clients: it validates nothing
 * itself (each service verifies JWTs) but provides rate limiting, centralized
 * CORS/helmet, aggregated Swagger and the GraphQL aggregation layer, and
 * routes every /api/* request to the owning microservice.
 */
export function configureProxy(app: NestExpressApplication, config: ConfigService): void {
  app.use(rateLimitMiddleware(config));

  const proxy = (mount: string | string[], serviceUrl: string, rewrite: Record<string, string>): void => {
    const options: Options = {
      target: serviceUrl,
      changeOrigin: true,
      pathRewrite: rewrite,
      proxyTimeout: 30_000,
      timeout: 30_000,
    };
    app.use(mount, createProxyMiddleware(options));
  };

  // Identity & org
  proxy('/api/auth', config.get('SERVICE_AUTH_URL', 'http://localhost:3001'), { '^/api/auth': '/auth' });
  proxy('/api/orgs', config.get('SERVICE_ORG_URL', 'http://localhost:3002'), { '^/api/orgs': '/orgs' });
  proxy('/api/admin', config.get('SERVICE_ORG_URL', 'http://localhost:3002'), { '^/api/admin': '/admin' });

  // Chat (REST surface)
  proxy('/api/channels', config.get('SERVICE_CHAT_URL', 'http://localhost:3003'), { '^/api/channels': '/channels' });
  proxy('/api/messages', config.get('SERVICE_CHAT_URL', 'http://localhost:3003'), { '^/api/messages': '/messages' });
  proxy('/api/search', config.get('SERVICE_CHAT_URL', 'http://localhost:3003'), { '^/api/search': '/search' });
  proxy('/api/presence', config.get('SERVICE_CHAT_URL', 'http://localhost:3003'), { '^/api/presence': '/presence' });

  // Projects & tasks
  proxy('/api/workspaces', config.get('SERVICE_PROJECTS_URL', 'http://localhost:3004'), { '^/api/workspaces': '/workspaces' });
  proxy('/api/projects', config.get('SERVICE_PROJECTS_URL', 'http://localhost:3004'), { '^/api/projects': '/projects' });
  proxy('/api/tasks', config.get('SERVICE_PROJECTS_URL', 'http://localhost:3004'), { '^/api/tasks': '/tasks' });
  proxy('/api/sprints', config.get('SERVICE_PROJECTS_URL', 'http://localhost:3004'), { '^/api/sprints': '/sprints' });

  // Files
  proxy('/api/files', config.get('SERVICE_FILES_URL', 'http://localhost:3005'), { '^/api/files': '/files' });

  // Calendar
  proxy('/api/events', config.get('SERVICE_CALENDAR_URL', 'http://localhost:3006'), { '^/api/events': '/events' });

  // Notifications
  proxy('/api/notifications', config.get('SERVICE_NOTIFICATIONS_URL', 'http://localhost:3007'), {
    '^/api/notifications': '/notifications',
  });

  // AI Copilot
  proxy('/api/copilot', config.get('SERVICE_AI_URL', 'http://localhost:3008'), { '^/api/copilot': '/copilot' });
}
