import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { Folder } from './entities/folder.entity';
import { ShareLink } from './entities/share-link.entity';
import { LocalStorageProvider, STORAGE_PROVIDER } from './storage/storage.provider';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { HealthController } from '../health.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'nexusone-dev-secret-change-me'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '8h') },
      }),
    }),
    TypeOrmModule.forFeature([FileEntity, Folder, ShareLink]),
  ],
  controllers: [FilesController, HealthController],
  providers: [
    FilesService,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new LocalStorageProvider(config),
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class FilesModule {}
