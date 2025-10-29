import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config';
import logger from '../utils/logger';

interface ApiMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    requestsByMethod: Record<string, number>;
    requestsByStatusCode: Record<string, number>;
    requestsByVersion: Record<string, number>;
    errorsByType: Record<string, number>;
}

interface RequestMetrics extends Request {
    startTime?: number;
    apiVersion?: string;
}

/**
 * API monitoring middleware
 * Tracks request metrics and performance
 */
export const apiMonitoring = (req: RequestMetrics, res: Response, next: NextFunction) => {
    // Record start time
    req.startTime = Date.now();

    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, cb?: () => void) {
        const responseTime = Date.now() - (req.startTime || Date.now());

        // Record metrics asynchronously
        recordMetrics(req, res, responseTime).catch(error => {
            logger.error('Failed to record API metrics', { error });
        });

        // Call original end method
        return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
};

/**
 * Records API metrics to Redis
 */
async function recordMetrics(req: RequestMetrics, res: Response, responseTime: number) {
    try {
        const client = redisClient.getClient();
        const timestamp = new Date();
        const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        const hourKey = timestamp.getHours();

        // Basic metrics
        const endpoint = `${req.method} ${req.route?.path || req.path}`;
        const statusCode = res.statusCode.toString();
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        const version = req.apiVersion || 'unknown';

        // Increment counters
        const pipeline = client.pipeline();

        // Daily metrics
        pipeline.hincrby(`api:metrics:daily:${dateKey}`, 'total_requests', 1);
        pipeline.hincrby(`api:metrics:daily:${dateKey}`, isSuccess ? 'successful_requests' : 'failed_requests', 1);
        pipeline.hincrby(`api:metrics:daily:${dateKey}`, `endpoint:${endpoint}`, 1);
        pipeline.hincrby(`api:metrics:daily:${dateKey}`, `method:${req.method}`, 1);
        pipeline.hincrby(`api:metrics:daily:${dateKey}`, `status:${statusCode}`, 1);
        pipeline.hincrby(`api:metrics:daily:${dateKey}`, `version:${version}`, 1);

        // Hourly metrics
        pipeline.hincrby(`api:metrics:hourly:${dateKey}:${hourKey}`, 'total_requests', 1);
        pipeline.hincrby(`api:metrics:hourly:${dateKey}:${hourKey}`, isSuccess ? 'successful_requests' : 'failed_requests', 1);

        // Response time tracking
        pipeline.lpush(`api:response_times:${dateKey}`, responseTime);
        pipeline.ltrim(`api:response_times:${dateKey}`, 0, 999); // Keep last 1000 response times

        // Error tracking
        if (!isSuccess) {
            const errorType = getErrorType(res.statusCode);
            pipeline.hincrby(`api:errors:daily:${dateKey}`, errorType, 1);
        }

        // Set expiration for daily keys (30 days)
        pipeline.expire(`api:metrics:daily:${dateKey}`, 30 * 24 * 60 * 60);
        pipeline.expire(`api:metrics:hourly:${dateKey}:${hourKey}`, 7 * 24 * 60 * 60);
        pipeline.expire(`api:response_times:${dateKey}`, 7 * 24 * 60 * 60);
        pipeline.expire(`api:errors:daily:${dateKey}`, 30 * 24 * 60 * 60);

        await pipeline.exec();

        // Log slow requests
        if (responseTime > 1000) {
            logger.warn('Slow API request detected', {
                endpoint,
                method: req.method,
                responseTime,
                statusCode,
                version,
                userAgent: req.headers['user-agent'],
                requestId: req.headers['x-request-id'],
            });
        }

    } catch (error) {
        logger.error('Failed to record API metrics', { error });
    }
}

/**
 * Get error type from status code
 */
function getErrorType(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
        return 'client_error';
    } else if (statusCode >= 500) {
        return 'server_error';
    }
    return 'unknown_error';
}

/**
 * Get API metrics for a specific date range
 */
export async function getApiMetrics(startDate: string, endDate?: string): Promise<ApiMetrics> {
    try {
        const client = redisClient.getClient();
        const end = endDate || startDate;

        const metrics: ApiMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            requestsByEndpoint: {},
            requestsByMethod: {},
            requestsByStatusCode: {},
            requestsByVersion: {},
            errorsByType: {},
        };

        // Get metrics for date range
        const dates = getDateRange(startDate, end);
        const responseTimes: number[] = [];

        for (const date of dates) {
            const dailyMetrics = await client.hgetall(`api:metrics:daily:${date}`);
            const dailyResponseTimes = await client.lrange(`api:response_times:${date}`, 0, -1);
            const dailyErrors = await client.hgetall(`api:errors:daily:${date}`);

            // Aggregate metrics
            metrics.totalRequests += parseInt(dailyMetrics.total_requests || '0');
            metrics.successfulRequests += parseInt(dailyMetrics.successful_requests || '0');
            metrics.failedRequests += parseInt(dailyMetrics.failed_requests || '0');

            // Aggregate response times
            responseTimes.push(...dailyResponseTimes.map(t => parseInt(t)));

            // Aggregate by category
            Object.keys(dailyMetrics).forEach(key => {
                const value = parseInt(dailyMetrics[key]);
                if (key.startsWith('endpoint:')) {
                    const endpoint = key.replace('endpoint:', '');
                    metrics.requestsByEndpoint[endpoint] = (metrics.requestsByEndpoint[endpoint] || 0) + value;
                } else if (key.startsWith('method:')) {
                    const method = key.replace('method:', '');
                    metrics.requestsByMethod[method] = (metrics.requestsByMethod[method] || 0) + value;
                } else if (key.startsWith('status:')) {
                    const status = key.replace('status:', '');
                    metrics.requestsByStatusCode[status] = (metrics.requestsByStatusCode[status] || 0) + value;
                } else if (key.startsWith('version:')) {
                    const version = key.replace('version:', '');
                    metrics.requestsByVersion[version] = (metrics.requestsByVersion[version] || 0) + value;
                }
            });

            // Aggregate errors
            Object.keys(dailyErrors).forEach(errorType => {
                const count = parseInt(dailyErrors[errorType]);
                metrics.errorsByType[errorType] = (metrics.errorsByType[errorType] || 0) + count;
            });
        }

        // Calculate average response time
        if (responseTimes.length > 0) {
            metrics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        }

        return metrics;
    } catch (error) {
        logger.error('Failed to get API metrics', { error });
        throw error;
    }
}

/**
 * Get real-time API statistics
 */
export async function getRealTimeStats() {
    try {
        const client = redisClient.getClient();
        const today = new Date().toISOString().split('T')[0];
        const currentHour = new Date().getHours();

        const [dailyMetrics, hourlyMetrics] = await Promise.all([
            client.hgetall(`api:metrics:daily:${today}`),
            client.hgetall(`api:metrics:hourly:${today}:${currentHour}`),
        ]);

        return {
            today: {
                totalRequests: parseInt(dailyMetrics.total_requests || '0'),
                successfulRequests: parseInt(dailyMetrics.successful_requests || '0'),
                failedRequests: parseInt(dailyMetrics.failed_requests || '0'),
            },
            currentHour: {
                totalRequests: parseInt(hourlyMetrics.total_requests || '0'),
                successfulRequests: parseInt(hourlyMetrics.successful_requests || '0'),
                failedRequests: parseInt(hourlyMetrics.failed_requests || '0'),
            },
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        logger.error('Failed to get real-time stats', { error });
        throw error;
    }
}

/**
 * Generate date range array
 */
function getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
}

/**
 * Health check for API monitoring
 */
export async function getMonitoringHealth() {
    try {
        const client = redisClient.getClient();
        const today = new Date().toISOString().split('T')[0];

        // Check if metrics are being recorded
        const todayMetrics = await client.hgetall(`api:metrics:daily:${today}`);
        const hasMetrics = Object.keys(todayMetrics).length > 0;

        return {
            status: hasMetrics ? 'healthy' : 'no_data',
            metricsRecorded: hasMetrics,
            lastUpdate: hasMetrics ? new Date().toISOString() : null,
        };
    } catch (error) {
        logger.error('Failed to check monitoring health', { error });
        return {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}