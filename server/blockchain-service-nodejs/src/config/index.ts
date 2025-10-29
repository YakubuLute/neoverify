import config from './env';
import database from './database';
import redisClient from './redis';

export { config, database, redisClient };

export default {
  config,
  database,
  redisClient,
};
