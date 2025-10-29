import { Router, Request, Response } from 'express';
import { config, database, redisClient } from '../config';
import { getApiMetrics, getRealTimeStats, getMonitoringHealth } from '../middleware/monitoring';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Basic health check
 *     description: Returns basic application health status
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "healthy"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       example: 3600.123
 *                     environment:
 *                       type: string
 *                       example: "production"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 */
router.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config.env,
            version: process.env.npm_package_version || '1.0.0',
        },
    });
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     tags: [System]
 *     summary: Detailed health check
 *     description: Returns detailed health status including database and Redis connectivity
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                     environment:
 *                       type: string
 *                     version:
 *                       type: string
 *                     services:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                             responseTime:
 *                               type: number
 *                         redis:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                             responseTime:
 *                               type: number
 *                         monitoring:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                             metricsRecorded:
 *                               type: boolean
 *                     system:
 *                       type: object
 *                       properties:
 *                         memory:
 *                           type: object
 *                           properties:
 *                             used:
 *                               type: number
 *                             total:
 *                               type: number
 *                             percentage:
 *                               type: number
 *                         cpu:
 *                           type: object
 *                           properties:
 *                             usage:
 *                               type: number
 *       503:
 *         description: Service unavailable
 */
router.get('/detailed', authenticateToken, async (req: Request, res: Response) => {
    try {
        const startTime = Date.now();

        // Check database connectivity
        const dbHealth = await checkDatabaseHealth();

        // Check Redis connectivity
        const redisHealth = await checkRedisHealth();

        // Check monitoring health
        const monitoringHealth = await getMonitoringHealth();

        // Get system metrics
        const systemMetrics = getSystemMetrics();

        // Determine overall status
        const services = { database: dbHealth, redis: redisHealth, monitoring: monitoringHealth };
        const overallStatus = determineOverallStatus(services);

        const responseTime = Date.now() - startTime;

        const healthData = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config.env,
            version: process.env.npm_package_version || '1.0.0',
            responseTime,
            services,
            system: systemMetrics,
        };

        const statusCode = overallStatus === 'healthy' ? 200 : 503;

        res.status(statusCode).json({
            success: overallStatus === 'healthy',
            data: healthData,
        });

    } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({
            success: false,
            error: {
                code: 'HEALTH_CHECK_FAILED',
                message: 'Health check failed',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     tags: [System]
 *     summary: Get API metrics
 *     description: Returns API usage metrics and statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: API metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: number
 *                     successfulRequests:
 *                       type: number
 *                     failedRequests:
 *                       type: number
 *                     averageResponseTime:
 *                       type: number
 *                     requestsByEndpoint:
 *                       type: object
 *                     requestsByMethod:
 *                       type: object
 *                     requestsByStatusCode:
 *                       type: object
 *                     requestsByVersion:
 *                       type: object
 *                     errorsByType:
 *                       type: object
 */
router.get('/metrics', authenticateToken, async (req: Request, res: Response) => {
    try {
        const startDate = req.query.startDate as string || new Date().toISOString().split('T')[0];
        const endDate = req.query.endDate as string;

        const metrics = await getApiMetrics(startDate, endDate);

        res.json({
            success: true,
            data: metrics,
        });

    } catch (error) {
        logger.error('Failed to get API metrics', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'METRICS_FETCH_FAILED',
                message: 'Failed to retrieve API metrics',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @swagger
 * /health/stats/realtime:
 *   get:
 *     tags: [System]
 *     summary: Get real-time statistics
 *     description: Returns real-time API usage statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     today:
 *                       type: object
 *                       properties:
 *                         totalRequests:
 *                           type: number
 *                         successfulRequests:
 *                           type: number
 *                         failedRequests:
 *                           type: number
 *                     currentHour:
 *                       type: object
 *                       properties:
 *                         totalRequests:
 *                           type: number
 *                         successfulRequests:
 *                           type: number
 *                         failedRequests:
 *                           type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/stats/realtime', authenticateToken, async (req: Request, res: Response) => {
    try {
        const stats = await getRealTimeStats();

        res.json({
            success: true,
            data: stats,
        });

    } catch (error) {
        logger.error('Failed to get real-time stats', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'STATS_FETCH_FAILED',
                message: 'Failed to retrieve real-time statistics',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth() {
    try {
        const startTime = Date.now();
        await database.authenticate();
        const responseTime = Date.now() - startTime;

        return {
            status: 'healthy',
            responseTime,
            connected: true,
        };
    } catch (error) {
        logger.error('Database health check failed', { error });
        return {
            status: 'unhealthy',
            responseTime: null,
            connected: false,
            error: error.message,
        };
    }
}

/**
 * Check Redis connectivity and performance
 */
async function checkRedisHealth() {
    try {
        const startTime = Date.now();
        const client = redisClient.getClient();
        await client.ping();
        const responseTime = Date.now() - startTime;

        return {
            status: 'healthy',
            responseTime,
            connected: redisClient.isClientConnected(),
        };
    } catch (error) {
        logger.error('Redis health check failed', { error });
        return {
            status: 'unhealthy',
            responseTime: null,
            connected: false,
            error: error.message,
        };
    }
}

/**
 * Get system metrics
 */
function getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;

    return {
        memory: {
            used: usedMemory,
            total: totalMemory,
            percentage: Math.round((usedMemory / totalMemory) * 100),
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
        },
        uptime: process.uptime(),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
    };
}

/**
 * Determine overall system status
 */
function determineOverallStatus(services: Record<string, any>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map(service => service.status);

    if (statuses.every(status => status === 'healthy')) {
        return 'healthy';
    } else if (statuses.some(status => status === 'healthy')) {
        return 'degraded';
    } else {
        return 'unhealthy';
    }
}

export default router;