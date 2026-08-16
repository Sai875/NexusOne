import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SummarizeDto {
  @IsIn(['chat', 'meeting'])
  kind: 'chat' | 'meeting';

  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  text: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class GenerateTasksDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  text: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export class DraftDto {
  @IsIn(['announcement', 'email', 'report', 'project-plan'])
  kind: 'announcement' | 'email' | 'report' | 'project-plan';

  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  prompt: string;
}

export class AskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  question: string;

  /** Optional retrieved context (documents, chat excerpts) for grounded answers. */
  @IsOptional()
  @IsString()
  context?: string;
}
