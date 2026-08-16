import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../entities/task.entity';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateProjectDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  key?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class CreateTaskDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: (typeof TASK_STATUSES)[number];

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: (typeof TASK_PRIORITIES)[number];

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: (typeof TASK_STATUSES)[number];

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: (typeof TASK_PRIORITIES)[number];

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class CreateSprintDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['planned', 'active', 'completed'])
  status?: 'planned' | 'active' | 'completed';
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string;
}
