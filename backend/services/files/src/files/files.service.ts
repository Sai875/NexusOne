import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { IsNull, Repository } from 'typeorm';
import { AuthUser } from '../common/auth-user';
import { FileEntity } from './entities/file.entity';
import { Folder } from './entities/folder.entity';
import { ShareLink } from './entities/share-link.entity';
import { STORAGE_PROVIDER, StorageProvider } from './storage/storage.provider';

export interface UploadedFileData {
  originalName: string;
  mimeType: string;
  size: number;
  path: string; // multer temp path inside the uploads root
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(Folder) private readonly folders: Repository<Folder>,
    @InjectRepository(ShareLink) private readonly shareLinks: Repository<ShareLink>,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly config: ConfigService,
  ) {}

  // ── Folders ──────────────────────────────────────────────────────────────

  listFolders(orgId: string, parentId?: string | null): Promise<Folder[]> {
    return this.folders.find({
      where: parentId ? { orgId, parentId } : { orgId, parentId: IsNull() },
      order: { name: 'ASC' },
    });
  }

  async createFolder(dto: { name: string; parentId?: string }, user: AuthUser): Promise<Folder> {
    if (dto.parentId) {
      const parent = await this.folders.findOneBy({ id: dto.parentId, orgId: user.orgId });
      if (!parent) throw new BadRequestException('Parent folder not found');
    }
    return this.folders.save(
      this.folders.create({
        orgId: user.orgId,
        name: dto.name.trim(),
        parentId: dto.parentId ?? null,
        createdBy: user.sub,
      }),
    );
  }

  // ── Files ────────────────────────────────────────────────────────────────

  async listFiles(orgId: string, folderId?: string | null): Promise<FileEntity[]> {
    return this.files.find({
      where: folderId ? { orgId, folderId } : { orgId, folderId: IsNull() },
      order: { updatedAt: 'DESC' },
    });
  }

  async saveUpload(
    orgId: string,
    uploaded: UploadedFileData,
    user: AuthUser,
    folderId?: string | null,
  ): Promise<FileEntity> {
    if (!uploaded || !uploaded.originalName) throw new BadRequestException('No file uploaded');

    const storageKey = `${orgId}/${this.safeFileName(uploaded.path)}`;
    // Multer already wrote the file to disk; register metadata and, for
    // consistency with the provider interface, treat the on-disk copy as the
    // canonical object.
    await this.storage.put(storageKey, createReadStream(uploaded.path));

    return this.files.save(
      this.files.create({
        orgId,
        folderId: folderId ?? null,
        name: uploaded.originalName,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType ?? null,
        size: String(uploaded.size),
        storageKey,
        uploaderId: user.sub,
      }),
    );
  }

  async updateFile(orgId: string, fileId: string, changes: { name?: string; folderId?: string }): Promise<FileEntity> {
    const file = await this.files.findOneBy({ id: fileId, orgId });
    if (!file) throw new NotFoundException('File not found');
    if (changes.name) file.name = changes.name.trim();
    if (changes.folderId !== undefined) file.folderId = changes.folderId;
    await this.files.save(file);
    return file;
  }

  async deleteFile(orgId: string, fileId: string): Promise<void> {
    const file = await this.files.findOneBy({ id: fileId, orgId });
    if (!file) throw new NotFoundException('File not found');
    await this.files.delete(fileId);
    await this.shareLinks.delete({ fileId });
    await this.storage.remove(file.storageKey);
  }

  async getFileStream(orgId: string, fileId: string): Promise<{ stream: Readable; file: FileEntity }> {
    const file = await this.files.findOneBy({ id: fileId, orgId });
    if (!file) throw new NotFoundException('File not found');
    return { stream: await this.storage.get(file.storageKey), file };
  }

  // ── Share links ──────────────────────────────────────────────────────────

  async createShareLink(
    orgId: string,
    fileId: string,
    user: AuthUser,
    permission: 'view' | 'download' = 'view',
    expiresInHours?: number,
  ): Promise<{ link: string; token: string; expiresAt: Date | null }> {
    const file = await this.files.findOneBy({ id: fileId, orgId });
    if (!file) throw new NotFoundException('File not found');
    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3_600_000) : null;
    const share = await this.shareLinks.save(
      this.shareLinks.create({
        orgId,
        fileId,
        token: randomBytes(24).toString('hex'),
        permission,
        expiresAt,
        createdBy: user.sub,
      }),
    );
    const base = this.config.get('FILES_PUBLIC_BASE_URL', '');
    return {
      link: `${base}/api/files/share/${share.token}`,
      token: share.token,
      expiresAt,
    };
  }

  async resolveShare(token: string): Promise<{ file: FileEntity; permission: string; expiresAt: Date | null }> {
    const share = await this.shareLinks.findOneBy({ token });
    if (!share) throw new NotFoundException('Share link not found');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new NotFoundException('Share link has expired');
    }
    const file = await this.files.findOneBy({ id: share.fileId });
    if (!file) throw new NotFoundException('Shared file not found');
    return { file, permission: share.permission, expiresAt: share.expiresAt };
  }

  async getSharedStream(token: string): Promise<{ stream: Readable; file: FileEntity }> {
    const { file } = await this.resolveShare(token);
    return { stream: await this.storage.get(file.storageKey), file };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private safeFileName(path: string): string {
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] ?? 'file';
  }
}
