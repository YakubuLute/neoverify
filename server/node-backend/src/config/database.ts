import { Sequelize, Options } from 'sequelize';
import config from './env';
import logger from '../utils/logger';

class Database {
  public sequelize: Sequelize;

  constructor() {
    const dbConfig: Options = {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      username: config.database.user,
      password: config.database.password,
      dialect: 'postgres',
      dialectOptions: {
        ssl: config.database.ssl
          ? {
            require: true,
            rejectUnauthorized: false,
          }
          : false,
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      logging:
        config.env === 'development'
          ? (msg: string) => logger.debug(msg)
          : false,
      define: {
        timestamps: true,
        underscored: true,
        paranoid: true, // Enable soft deletes
      },
    };

    this.sequelize = new Sequelize(dbConfig);
  }

  async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.sequelize.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  async sync(
    options: { force?: boolean; alter?: boolean } = {}
  ): Promise<void> {
    try {
      // Import models to ensure they are registered
      await import('../models');
      await this.sequelize.sync(options);
      logger.info('Database synchronized successfully');
    } catch (error) {
      logger.error('Database synchronization failed:', error);
      throw error;
    }
  }

  getSequelize(): Sequelize {
    return this.sequelize;
  }
}

// Create singleton instance
const database = new Database();

export default database;
export { Database };
