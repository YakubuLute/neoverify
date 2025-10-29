import { config, database, redisClient } from './config';
import logger from './utils/logger';
import app from './app';
import { gracefulShutdown } from './middleware';

async function startServer(): Promise<void> {
    try {
        logger.info(`Server configuration loaded for environment: ${config.env}`);

        // Try to connect to database
        try {
            await database.connect();
            logger.info(`Database connected successfully`);
        } catch (error) {
            logger.warn('Database connection failed:', error);
            if (config.env === 'production') {
                logger.error('Database is required in production');
                process.exit(1);
            } else {
                logger.warn('Continuing without database in development mode');
            }
        }

        // Try to connect to Redis
        try {
            await redisClient.connect();
            logger.info(`Redis connected successfully`);
        } catch (error) {
            logger.warn('Redis connection failed:', error);
            if (config.env === 'production') {
                logger.error('Redis is required in production');
                process.exit(1);
            } else {
                logger.warn('Continuing without Redis in development mode');
            }
        }

        // Start Express server
        const server = app.listen(config.port, () => {
            logger.info(`Server is running on port ${config.port}`);
            logger.info(`Environment: ${config.env}`);
            logger.info(`Health check available at: http://localhost:${config.port}/health`);
            logger.info(`API documentation will be available at: http://localhost:${config.port}/api-docs`);
        });

        // Setup graceful shutdown
        gracefulShutdown(server);

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    try {
        await database.disconnect();
    } catch (error) {
        logger.warn('Error disconnecting from database:', error);
    }
    try {
        await redisClient.disconnect();
    } catch (error) {
        logger.warn('Error disconnecting from Redis:', error);
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    try {
        await database.disconnect();
    } catch (error) {
        logger.warn('Error disconnecting from database:', error);
    }
    try {
        await redisClient.disconnect();
    } catch (error) {
        logger.warn('Error disconnecting from Redis:', error);
    }
    process.exit(0);
});

// Start the server
if (require.main === module) {
    startServer();
}

export { startServer };