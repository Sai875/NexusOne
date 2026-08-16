import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId: string | null;

  @Column()
  name: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'mime_type', type: 'text', nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', default: 0 })
  size: string;

  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ type: 'text', nullable: true })
  checksum: string | null;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'uploader_id', type: 'uuid', nullable: true })
  uploaderId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
