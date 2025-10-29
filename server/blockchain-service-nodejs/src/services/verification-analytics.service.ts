import { Op, QueryTypes } from 'sequelize';
import { logger } from '../utils/logger';
import database from '../config/database';
import Verification, { VerificationType, VerificationPriority } from '../models/Verification';
import Document, { VerificationStatus } from '../models/Document';
import cacheService from './cache.service';

// Analytics interfaces
export interface VerificationMetrics {
    totalVerifications: number;
    completedVerifications: number;
    failedVerifications: number;
    pendingVerifications: number;
    averageProcessingTime: number;
    successRate: number;
    verificationsByType: Record<VerificationType, number>;
    verificationsByPriority: Record<VerificationPriority, number>;
    verificationsByStatus: Record<VerificationStatus, number>;
}

export interface VerificationTrends {
    daily: Array<{
        date: string;
        total: number;
        completed: number;
        failed: number;
        averageTime: number;
    }>;
    weekly: Array<{
        week: string;
        total: number;
        completed: number;
        failed: number;
        averageTime: number;
    }>;
    monthly: Array<{
        month: string;
        total: number;
        completed: number;
        failed: number;
        averageTime: number;
    }>;
}

export interface ServicePerformance {
    aiForensics: {
        totalJobs: number;
        completedJobs: number;
        failedJobs: number;
        averageProcessingTime: number;
        averageAccuracy: number;
        uptime: number;
    };
    blockchain: {
        totalTransactions: number;
        confirmedTransactions: number;
        failedTransactions: number;
        averageConfirmationTime: number;
        averageGasCost: number;
        uptime: number;
    };
    ipfs: {
        totalUploads: number;
        successfulUploads: number;
        failedUploads: number;
        averageUploadTime: number;
        totalStorageUsed: number;
        uptime: number;
    };
}

export interface OrganizationAnalytics {
    organizationId: string;
    totalDocuments: number;
    totalVerifications: number;
    verificationsByType: Record<VerificationType, number>;
    successRate: number;
    averageProcessingTime: number;
    monthlyUsage: Array<{
        month: string;
        documents: number;
        verifications: number;
        costs: number;
    }>;
    topUsers: Array<{
        userId: string;
        userName: string;
        documentCount: number;
        verificationCount: number;
    }>;
}

export interface VerificationReport {
    reportId: string;
    generatedAt: Date;
    period: {
        start: Date;
        end: Date;
    };
    metrics: VerificationMetrics;
    trends: VerificationTrends;
    servicePerformance: ServicePerformance;
    organizationAnalytics?: OrganizationAnalytics[];
    recommendations: string[];
}

class VerificationAnalyticsService {
    private readonly CACHE_TTL = 1800; // 30 minutes

    /**
     * Get verification metrics for a specific period
     */
    async getVerificationMetrics(
        startDate: Date,
        endDate: Date,
        organizationId?: string
    ): Promise<VerificationMetrics> {
        try {
            const cacheKey = `metrics:${startDate.toISOString()}:${endDate.toISOString()}:${organizationId || 'all'}`;
            const cached = await cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }

            logger.info('Calculating verification metrics', {
                startDate,
                endDate,
                organizationId,
            });

            const whereConditions: any = {
                createdAt: {
                    [Op.between]: [startDate, endDate],
                },
            };

            if (organizationId) {
                whereConditions.organizationId = organizationId;
            }

            // Get basic counts
            const [
                totalVerifications,
                completedVerifications,
                failedVerifications,
                pendingVerifications,
            ] = await Promise.all([
                Verification.count({ where: whereConditions }),
                Verification.count({
                    where: { ...whereConditions, status: VerificationStatus.COMPLETED },
                }),
                Verification.count({
                    where: { ...whereConditions, status: VerificationStatus.FAILED },
                }),
                Verification.count({
                    where: {
                        ...whereConditions,
                        status: [VerificationStatus.PENDING, VerificationStatus.IN_PROGRESS],
                    },
                }),
            ]);

            // Calculate average processing time
            const completedVerificationsWithTime = await Verification.findAll({
                where: {
                    ...whereConditions,
                    status: VerificationStatus.COMPLETED,
                    completedAt: { [Op.ne]: null },
                },
                attributes: ['startedAt', 'completedAt'],
            });

            const averageProcessingTime = completedVerificationsWithTime.length > 0
                ? completedVerificationsWithTime.reduce((sum, v) => {
                    const processingTime = v.completedAt!.getTime() - v.startedAt.getTime();
                    return sum + processingTime;
                }, 0) / completedVerificationsWithTime.length
                : 0;

            // Get verifications by type
            const verificationsByType = {} as Record<VerificationType, number>;
            for (const type of Object.values(VerificationType)) {
                verificationsByType[type] = await Verification.count({
                    where: { ...whereConditions, type },
                });
            }

            // Get verifications by priority
            const verificationsByPriority = {} as Record<VerificationPriority, number>;
            for (const priority of Object.values(VerificationPriority)) {
                verificationsByPriority[priority] = await Verification.count({
                    where: { ...whereConditions, priority },
                });
            }

            // Get verifications by status
            const verificationsByStatus = {} as Record<VerificationStatus, number>;
            for (const status of Object.values(VerificationStatus)) {
                verificationsByStatus[status] = await Verification.count({
                    where: { ...whereConditions, status },
                });
            }

            const successRate = totalVerifications > 0
                ? (completedVerifications / totalVerifications) * 100
                : 0;

            const metrics: VerificationMetrics = {
                totalVerifications,
                completedVerifications,
                failedVerifications,
                pendingVerifications,
                averageProcessingTime,
                successRate,
                verificationsByType,
                verificationsByPriority,
                verificationsByStatus,
            };

            // Cache the results
            await cacheService.set(cacheKey, metrics, this.CACHE_TTL);

            return metrics;
        } catch (error: any) {
            logger.error('Failed to get verification metrics', {
                error: error.message,
                startDate,
                endDate,
                organizationId,
            });
            throw error;
        }
    }

    /**
     * Get verification trends over time
     */
    async getVerificationTrends(
        startDate: Date,
        endDate: Date,
        organizationId?: string
    ): Promise<VerificationTrends> {
        try {
            const cacheKey = `trends:${startDate.toISOString()}:${endDate.toISOString()}:${organizationId || 'all'}`;
            const cached = await cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }

            logger.info('Calculating verification trends', {
                startDate,
                endDate,
                organizationId,
            });

            const orgCondition = organizationId ? `AND organization_id = '${organizationId}'` : '';

            // Daily trends
            const dailyQuery = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                    AVG(CASE 
                        WHEN status = 'completed' AND completed_at IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 
                    END) as average_time
                FROM verifications 
                WHERE created_at BETWEEN :startDate AND :endDate ${orgCondition}
                GROUP BY DATE(created_at)
                ORDER BY date
            `;

            // Weekly trends
            const weeklyQuery = `
                SELECT 
                    DATE_TRUNC('week', created_at) as week,
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                    AVG(CASE 
                        WHEN status = 'completed' AND completed_at IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 
                    END) as average_time
                FROM verifications 
                WHERE created_at BETWEEN :startDate AND :endDate ${orgCondition}
                GROUP BY DATE_TRUNC('week', created_at)
                ORDER BY week
            `;

            // Monthly trends
            const monthlyQuery = `
                SELEC