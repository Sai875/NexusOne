import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { CreateFolderDto, CreateShareLinkDto, UpdateFileDto } from './dto/files.dto';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  listFiles(@CurrentUser() user: AuthUser, @Query('folderId') folderId?: string) {
    return this.files.listFiles(user.orgId, folderId || null);
  }

  @Get('folders')
  listFolders(@CurrentUser() user: AuthUser, @Query('parentId') parentId?: string) {
    return this.files.listFolders(user.orgId, parentId || null);
  }

  @Post('folders')
  createFolder(@CurrentUser() user: AuthUser, @Body() dto: CreateFolderDto) {
    return this.files.createFolder(dto, user);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string,
  ) {
    return this.files.saveUpload(user.orgId, {
      originalName: file?.originalname ?? '',
      mimeType: file?.mimetype ?? '',
      size: file?.size ?? 0,
      path: file?.path ?? '',
    }, user, folderId || null);
  }

  @Get(':id/download')
  async download(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const { stream, file } = await this.files.getFileStream(user.orgId, id);
    res.setHeader('Content-Type', file.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    stream.pipe(res);
  }

  @Patch(':id')
  updateFile(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFileDto) {
    return this.files.updateFile(user.orgId, id, dto);
  }

  @Delete(':id')
  async deleteFile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.files.deleteFile(user.orgId, id);
    return { ok: true };
  }

  @Post(':id/share-link')
  createShareLink(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateShareLinkDto) {
    return this.files.createShareLink(user.orgId, id, user, dto.permission ?? 'view', dto.expiresInHours);
  }

  @Public()
  @Get('share/:token')
  resolveShare(@Param('token') token: string) {
    return this.files.resolveShare(token);
  }

  @Public()
  @Get('share/:token/download')
  async downloadShared(@Param('token') token: string, @Res() res: Response) {
    const { stream, file } = await this.files.getSharedStream(token);
    res.setHeader('Content-Type', file.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    stream.pipe(res);
  }

}
