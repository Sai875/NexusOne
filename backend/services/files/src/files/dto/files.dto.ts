import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}

export class CreateShareLinkDto {
  @IsOptional()
  @IsIn(['view', 'download'])
  permission?: 'view' | 'download';

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInHours?: number;
}
