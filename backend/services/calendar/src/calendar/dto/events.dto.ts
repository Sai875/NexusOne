import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attendeeIds?: string[];

  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reminderMinutes?: number;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reminderMinutes?: number;
}

export class AvailabilityQueryDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @Type(() => String)
  userIds: string[];

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
