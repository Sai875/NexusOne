import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Project {
  @Field() id: string;
  @Field() key: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field() status: string;
  @Field({ nullable: true }) dueDate?: string;
}

@ObjectType()
export class Task {
  @Field() id: string;
  @Field() projectId: string;
  @Field() title: string;
  @Field({ nullable: true }) description?: string;
  @Field() status: string;
  @Field() priority: string;
  @Field({ nullable: true }) assigneeId?: string;
  @Field() createdAt: string;
  @Field() updatedAt: string;
}

@ObjectType()
export class Channel {
  @Field() id: string;
  @Field() name: string;
  @Field() slug: string;
  @Field() type: string;
  @Field({ nullable: true }) lastMessageAt?: string;
}

@ObjectType()
export class Notification {
  @Field() id: string;
  @Field() type: string;
  @Field() title: string;
  @Field() body: string;
  @Field({ nullable: true }) link?: string;
  @Field({ nullable: true }) readAt?: string;
  @Field() createdAt: string;
}

@ObjectType()
export class TasksByStatus {
  @Field() status: string;
  @Field(() => Int) count: number;
}

@ObjectType()
export class RecentActivity {
  @Field() action: string;
  @Field({ nullable: true }) entityType?: string;
  @Field({ nullable: true }) actorId?: string;
  @Field() createdAt: string;
}

@ObjectType()
export class DashboardSummary {
  @Field(() => Int) members: number;
  @Field(() => Int) projects: number;
  @Field(() => Int) tasks: number;
  @Field(() => Int) tasksDone: number;
  @Field(() => Int) completionRate: number;
  @Field(() => Int) files: number;
  @Field(() => Int) events: number;
  @Field(() => Int) activity7d: number;
  @Field(() => [TasksByStatus]) tasksByStatus: TasksByStatus[];
  @Field(() => [RecentActivity]) recentActivity: RecentActivity[];
}

@ObjectType()
export class CopilotSummary {
  @Field() content: string;
  @Field(() => [String], { nullable: 'itemsAndList' }) actionItems?: string[];
  @Field() source: string;
}
