import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../middleware/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected', { uri: config.mongoUri.split('@')[1] }); // log host, not credentials
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
