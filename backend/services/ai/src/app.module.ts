import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CopilotModule } from './copilot/copilot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '../../.env'],
      expandVariables: true,
    }),
    CopilotModule,
  ],
})
export class AppModule {}
