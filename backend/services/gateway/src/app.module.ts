import { HttpModule } from '@nestjs/axios';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import type { Request } from 'express';
import { join } from 'path';
import { HealthController } from './health/health.controller';
import { GraphQLResolvers } from './graphql/graphql.resolvers';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '../../.env'],
      expandVariables: true,
    }),
    HttpModule.register({ timeout: 15_000 }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req }: { req: Request }) => ({ req }),
    }),
  ],
  controllers: [HealthController],
  providers: [GraphQLResolvers],
})
export class AppModule {}
