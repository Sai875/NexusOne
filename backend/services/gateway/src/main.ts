import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureProxy } from './proxy/proxy.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({ origin: config.get('CLIENT_ORIGIN', '*'), credentials: true });
  app.use(helmet());

  configureProxy(app, config);

  // Aggregated gateway documentation (per-service docs live at /docs on each service).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NexusOne API Gateway')
    .setDescription(
      'Single entry point for all clients. Routes /api/* to the owning microservice; ' +
        '/graphql aggregates data across services for dashboard-style screens.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(config.get('PORT', 8080));
  await app.listen(port);
  Logger.log(`Gateway listening on http://localhost:${port} (docs: /docs, GraphQL: /graphql)`, 'Bootstrap');
}

void bootstrap();
