import config from './env';
import database from './database';
import redisClient from './redis';
import { swaggerSpec } from './swagger';

export { config, database, redisClient, swaggerSpec };

export default {
  config,
  database,
  redisClient,
  swaggerSpec,
};
