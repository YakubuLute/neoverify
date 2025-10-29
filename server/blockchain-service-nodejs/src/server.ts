import { config, database, redisClient } from './config';
import logger from './utils/logger';
import app from './app';
import { gracefulShutdown } from './middleware';

async function startServer(): Promise<void> {
    try {
        logger.info(`Server configuration loaded for environment: ${config.env}`);

        // Try to connect to database with timeout in development
        if (config.env === 'development') {
            try {
                // Set a timeout for database connection in development
                const connectPromise = database.connect();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database connection timeout')), 5000)
                );

                await Promise.race([connectPromise, timeoutPromise]);
                logger.info(`Database connected successfully`);
            } catch (error) {
                logger.warn('Database connection failed in development mode:', error instanceof Error ? error.message : error);
                logger.warn('Continuing without database - some features may be limited');
            }
        } else {
            try {
                await database.connect();
                logger.info(`Database connected successfully`);
            } catch (error) {
                logger.error('Database connection failed in production:', error);
                process.exit(1);
            }
        }

        // Try to connect to Redis with timeout in development
        if (config.env === 'development') {
            try {
                // Set a timeout for Redis connection in development
                const connectPromise = redisClient.connect();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
                );

                await Promise.race([connectPromise, timeoutPromise]);
                logger.info(`Redis connected successfully`);
            } catch (error) {
                logger.warn('Redis connection failed in development mode:', error instanceof Error ? error.message : error);
                logger.warn('Continuing without Redis - some features may be limited');
            }
        } else {
            try {
                await redisClient.connect();
                logger.info(`Redis connected successfully`);
            } catch (error) {
                logger.error('Redis connection failed in production:', error);
                process.exit(1);
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