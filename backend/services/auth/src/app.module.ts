import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '../../.env'],
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        // Managed hosts (Railway/Render) expose a single connection string.
        // NOTE: config.get<T> needs the explicit type arg — @nestjs/config's
        // NoInfer typing otherwise widens the result and breaks TypeORM's
        // union option types.
        const url = config.get<string>('DATABASE_URL', '');
        const common = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          synchronize: config.get('NODE_ENV') !== 'production',
          logging: false,
        };
        if (url) {
          return { ...common, url };
        }
        return {
          ...common,
          host: config.get<string>('POSTGRES_HOST', 'localhost'),
          port: Number(config.get<string>('POSTGRES_PORT', '5432')),
          username: config.get<string>('POSTGRES_USER', 'nexusone'),
          password: config.get<string>('POSTGRES_PASSWORD', 'nexusone'),
          database: config.get<string>('POSTGRES_DB', 'nexusone'),
        };
      },
    }),
    AuthModule,
  ],
})
export class AppModule {}
