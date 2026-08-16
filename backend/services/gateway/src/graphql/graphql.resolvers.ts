import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { lastValueFrom } from 'rxjs';
import {
  Channel,
  CopilotSummary,
  DashboardSummary,
  Notification,
  Project,
  Task,
} from './graphql.types';

interface GqlContext {
  req: { headers: { authorization?: string } };
}

/**
 * GraphQL is the client-facing aggregation layer (SRS Section 8): screens
 * that combine data from several services use one GraphQL round trip, while
 * the same data stays available per-resource over REST.
 */
@Resolver()
@Injectable()
export class GraphQLResolvers {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private authHeaders(ctx: GqlContext): Record<string, string> {
    const token = ctx.req.headers.authorization;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    return { Authorization: token };
  }

  private async get<T>(ctx: GqlContext, path: string): Promise<T> {
    const base = this.config.get<string>('GATEWAY_INTERNAL_BASE_URL', '');
    const url = base ? `${base}${path}` : path;
    const { data } = await lastValueFrom(
      this.http.get<T>(url, { headers: this.authHeaders(ctx) }),
    );
    return data;
  }

  private async send<T>(ctx: GqlContext, method: 'post' | 'patch', path: string, body: unknown): Promise<T> {
    const { data } = await lastValueFrom(
      this.http[method]<T>(path, body, { headers: this.authHeaders(ctx) }),
    );
    return data;
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  @Query(() => DashboardSummary)
  dashboard(@Context() ctx: GqlContext): Promise<DashboardSummary> {
    return this.get<DashboardSummary>(ctx, this.config.get('SERVICE_ORG_URL', '') + '/admin/analytics');
  }

  @Query(() => [Project])
  projects(@Context() ctx: GqlContext): Promise<Project[]> {
    return this.get<Project[]>(ctx, this.config.get('SERVICE_PROJECTS_URL', '') + '/projects');
  }

  @Query(() => [Task])
  tasksByProject(
    @Context() ctx: GqlContext,
    @Args('projectId') projectId: string,
  ): Promise<Task[]> {
    return this.get<Task[]>(ctx, this.config.get('SERVICE_PROJECTS_URL', '') + `/projects/${projectId}/tasks`);
  }

  @Query(() => [Channel])
  channels(@Context() ctx: GqlContext): Promise<Channel[]> {
    return this.get<Channel[]>(ctx, this.config.get('SERVICE_CHAT_URL', '') + '/channels');
  }

  @Query(() => [Notification])
  notifications(
    @Context() ctx: GqlContext,
    @Args('limit', { nullable: true }) limit?: number,
  ): Promise<Notification[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.get<Notification[]>(ctx, this.config.get('SERVICE_NOTIFICATIONS_URL', '') + `/notifications${query}`);
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  @Mutation(() => Task)
  createTask(
    @Context() ctx: GqlContext,
    @Args('projectId') projectId: string,
    @Args('title') title: string,
    @Args('description', { nullable: true }) description?: string,
  ): Promise<Task> {
    return this.send<Task>(ctx, 'post', this.config.get('SERVICE_PROJECTS_URL', '') + '/tasks', {
      projectId,
      title,
      description,
    });
  }

  @Mutation(() => Boolean)
  async markAllNotificationsRead(@Context() ctx: GqlContext): Promise<boolean> {
    await this.send(ctx, 'patch', this.config.get('SERVICE_NOTIFICATIONS_URL', '') + '/notifications/read-all', {});
    return true;
  }

  @Mutation(() => CopilotSummary)
  summarizeChat(
    @Context() ctx: GqlContext,
    @Args('text') text: string,
  ): Promise<CopilotSummary> {
    return this.send<CopilotSummary>(ctx, 'post', this.config.get('SERVICE_AI_URL', '') + '/copilot/summarize', {
      kind: 'chat',
      text,
    });
  }
}
