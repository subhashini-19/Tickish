import { createApp } from './app';
import { connectDatabase } from './config/database';
import { config } from './config/env';
import { logger } from './middleware/logger';

async function start() {
  await connectDatabase();

  const app = await createApp();

  app.listen(config.port, () => {
    logger.info(`Tickish API running on port ${config.port}`, { env: config.nodeEnv });
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
