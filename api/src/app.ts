import 'express-async-errors';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { todoRoutes } from './modules/todos/todo.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { authenticate } from './middleware/auth';
import { correlationIdMiddleware } from './middleware/correlationId';
import { typeDefs } from './graphql/schema';
import { resolvers, GraphQLContext } from './graphql/resolvers';

export async function createApp(): Promise<Application> {
  const app = express();

  // correlationId must be first — every subsequent middleware and log will read from it
  app.use(correlationIdMiddleware);

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'tickish-api' });
  });

  // REST routes
  app.use('/api/todos', authenticate, todoRoutes);

  // Apollo Server v4 requires start() before attaching to Express
  const apolloServer = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
  await apolloServer.start();

  // Apollo Server v4 bundles its own @types/express internally, which causes a type
  // conflict with the project's @types/express. Casting to any is the standard
  // workaround — the runtime behaviour is correct.
  // See: https://github.com/apollographql/apollo-server/issues/7442
  app.use(
    '/graphql',
    authenticate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressMiddleware(apolloServer as any, {
      context: async ({ req }: any): Promise<GraphQLContext> => ({
        userId: (req as express.Request).user!.oid,
      }),
    }) as any
  );

  // Error handler — must be LAST
  app.use(errorHandler);

  return app;
}
