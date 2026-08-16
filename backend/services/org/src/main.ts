import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({ origin: config.get('CLIENT_ORIGIN', '*'), credentials: true });
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NexusOne Organization Service')
    .setDescription('Organization structure, entitlements (modular licensing), audit and admin.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(config.get('PORT', 3002));
  await app.listen(port);
  Logger.log(`Org service listening on http://localhost:${port} (docs: /docs)`, 'Bootstrap');
}

void bootstrap();
