import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsIn(['public', 'private', 'dm', 'announcement'])
  type: 'public' | 'private' | 'dm' | 'announcement' = 'public';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  members?: string[];
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  text: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class AttachmentDto {
  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsOptional()
  size?: number;

  @IsOptional()
  mimeType?: string;
}

export class UpdateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  text: string;
}

export class ReactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  emoji: string;
}

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsOptional()
  limit?: number;
}
