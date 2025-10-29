import { config, database, redisClient } from './config';
import logger from './utils/logger';
import app from './app';
import { gracefulShutdown } from './middleware';

async function startServer(): Promise<void> {
    try {
        // Connect to database
        await database.connect();

        // Connect to Redis
        await redisClient.connect();

        logger.info(`Server configuration loaded for environment: ${config.env}`);
        logger.info(`Database connected successfully`);
        logger.info(`Redis connected successfully`);

        // Start Express server
        const server = app.listen(config.port, () => {
            logger.info(`Server is running on port ${config.port}`);
            logger.info(`Environment: ${config.env}`);
            logger.info(`Health check available at: http://localhost:${config.port}/health`);
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
    await database.disconnect();
    await redisClient.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await database.disconnect();
    await redisClient.disconnect();
    process.exit(0);
});

// Start the server
if (require.main === module) {
    startServer();
}

export { startServer };