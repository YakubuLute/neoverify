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
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                    AVG(CASE 
                        WHEN status = 'completed' AND completed_at IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 
                    END) as average_time
                FROM verifications 
                WHERE created_at BETWEEN :startDate AND :endDate ${orgCondition}
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month
            `;

            const [dailyResults, weeklyResults, monthlyResults] = await Promise.all([
                database.getSequelize().query(dailyQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { startDate, endDate },
                }),
                database.getSequelize().query(weeklyQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { startDate, endDate },
                }),
                database.getSequelize().query(monthlyQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { startDate, endDate },
                }),
            ]);

            const trends: VerificationTrends = {
                daily: (dailyResults as any[]).map(row => ({
                    date: row.date,
                    total: parseInt(row.total),
                    completed: parseInt(row.completed),
                    failed: parseInt(row.failed),
                    averageTime: parseFloat(row.average_time) || 0,
                })),
                weekly: (weeklyResults as any[]).map(row => ({
                    week: row.week,
                    total: parseInt(row.total),
                    completed: parseInt(row.completed),
                    failed: parseInt(row.failed),
                    averageTime: parseFloat(row.average_time) || 0,
                })),
                monthly: (monthlyResults as any[]).map(row => ({
                    month: row.month,
                    total: parseInt(row.total),
                    completed: parseInt(row.completed),
                    failed: parseInt(row.failed),
                    averageTime: parseFloat(row.average_time) || 0,
                })),
            };

            // Cache the results
            await cacheService.set(cacheKey, trends, this.CACHE_TTL);

            return trends;
        } catch (error: any) {
            logger.error('Failed to get verification trends', {
                error: error.message,
                startDate,
                endDate,
                organizationId,
            });
            throw error;
        }
    }

    /**
     * Get service performance metrics
     */
    async getServicePerformance(
        startDate: Date,
        endDate: Date
    ): Promise<ServicePerformance> {
        try {
            const cacheKey = `service-performance:${startDate.toISOString()}:${endDate.toISOString()}`;
            const cached = await cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }

            logger.info('Calculating service performance metrics', {
                startDate,
                endDate,
            });

            const whereConditions = {
                createdAt: {
                    [Op.between]: [startDate, endDate],
                },
            };

            // AI Forensics performance
            const aiForensicsVerifications = await Verification.findAll({
                where: {
                    ...whereConditions,
                    type: VerificationType.AI_FORENSICS,
                },
            });

            const aiForensicsMetrics = this.calculateServiceMetrics(
                aiForensicsVerifications,
                'aiForensics'
            );

            // Blockchain performance
            const blockchainVerifications = await Verification.findAll({
                where: {
                    ...whereConditions,
                    type: VerificationType.BLOCKCHAIN,
                },
            });

            const blockchainMetrics = this.calculateServiceMetrics(
                blockchainVerifications,
                'blockchain'
            );

            // IPFS performance
            const ipfsVerifications = await Verification.findAll({
                where: {
                    ...whereConditions,
                    type: VerificationType.IPFS,
                },
            });

            const ipfsMetrics = this.calculateServiceMetrics(
                ipfsVerifications,
                'ipfs'
            );

            const performance: ServicePerformance = {
                aiForensics: aiForensicsMetrics,
                blockchain: blockchainMetrics,
                ipfs: ipfsMetrics,
            };

            // Cache the results
            await cacheService.set(cacheKey, performance, this.CACHE_TTL);

            return performance;
        } catch (error: any) {
            logger.error('Failed to get service performance', {
                error: error.message,
                startDate,
                endDate,
            });
            throw error;
        }
    }

    /**
     * Generate comprehensive verification report
     */
    async generateVerificationReport(
        startDate: Date,
        endDate: Date,
        organizationId?: string
    ): Promise<VerificationReport> {
        try {
            logger.info('Generating verification report', {
                startDate,
                endDate,
                organizationId,
            });

            const [metrics, trends, servicePerformance] = await Promise.all([
                this.getVerificationMetrics(startDate, endDate, organizationId),
                this.getVerificationTrends(startDate, endDate, organizationId),
                this.getServicePerformance(startDate, endDate),
            ]);

            // Generate recommendations based on metrics
            const recommendations = this.generateRecommendations(metrics, servicePerformance);

            const report: VerificationReport = {
                reportId: `report-${Date.now()}`,
                generatedAt: new Date(),
                period: { start: startDate, end: endDate },
                metrics,
                trends,
                servicePerformance,
                recommendations,
            };

            logger.info('Verification report generated successfully', {
                reportId: report.reportId,
                totalVerifications: metrics.totalVerifications,
                successRate: metrics.successRate,
            });

            return report;
        } catch (error: any) {
            logger.error('Failed to generate verification report', {
                error: error.message,
                startDate,
                endDate,
                organizationId,
            });
            throw error;
        }
    }

    /**
     * Calculate service-specific metrics
     */
    private calculateServiceMetrics(verifications: Verification[], serviceType: string): any {
        const totalJobs = verifications.length;
        const completedJobs = verifications.filter(v => v.isCompleted()).length;
        const failedJobs = verifications.filter(v => v.isFailed()).length;

        const completedVerifications = verifications.filter(v => v.isCompleted());
        const averageProcessingTime = completedVerifications.length > 0
            ? completedVerifications.reduce((sum, v) => sum + (v.getProcessingTime() || 0), 0) / completedVerifications.length
            : 0;

        let serviceSpecificMetrics = {};

        if (serviceType === 'aiForensics') {
            const accuracyScores = completedVerifications
                .map(v => v.results.aiForensics?.confidence)
                .filter(score => score !== undefined);

            const averageAccuracy = accuracyScores.length > 0
                ? accuracyScores.reduce((sum, score) => sum + score!, 0) / accuracyScores.length
                : 0;

            serviceSpecificMetrics = {
                averageAccuracy,
            };
        } else if (serviceType === 'blockchain') {
            const gasCosts = completedVerifications
                .map(v => parseFloat(v.results.blockchain?.gasPrice || '0'))
                .filter(cost => cost > 0);

            const averageGasCost = gasCosts.length > 0
                ? gasCosts.reduce((sum, cost) => sum + cost, 0) / gasCosts.length
                : 0;

            serviceSpecificMetrics = {
                averageGasCost,
                averageConfirmationTime: averageProcessingTime,
            };
        } else if (serviceType === 'ipfs') {
            const uploadSizes = completedVerifications
                .map(v => v.results.ipfs?.size || 0)
                .filter(size => size > 0);

            const totalStorageUsed = uploadSizes.reduce((sum, size) => sum + size, 0);

            serviceSpecificMetrics = {
                totalStorageUsed,
                averageUploadTime: averageProcessingTime,
            };
        }

        return {
            totalJobs,
            completedJobs,
            failedJobs,
            averageProcessingTime,
            uptime: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 100,
            ...serviceSpecificMetrics,
        };
    }

    /**
     * Generate recommendations based on metrics
     */
    private generateRecommendations(
        metrics: VerificationMetrics,
        servicePerformance: ServicePerformance
    ): string[] {
        const recommendations: string[] = [];

        // Success rate recommendations
        if (metrics.successRate < 90) {
            recommendations.push(
                `Success rate is ${metrics.successRate.toFixed(1)}%. Consider investigating failed verifications and improving error handling.`
            );
        }

        // Processing time recommendations
        if (metrics.averageProcessingTime > 300000) { // 5 minutes
            recommendations.push(
                'Average processing time is high. Consider optimizing verification workflows or scaling resources.'
            );
        }

        // Service-specific recommendations
        if (servicePerformance.aiForensics.uptime < 95) {
            recommendations.push(
                'AI Forensics service uptime is below 95%. Check service health and consider implementing redundancy.'
            );
        }

        if (servicePerformance.blockchain.uptime < 95) {
            recommendations.push(
                'Blockchain service uptime is below 95%. Monitor network conditions and gas prices.'
            );
        }

        if (servicePerformance.ipfs.uptime < 95) {
            recommendations.push(
                'IPFS service uptime is below 95%. Check IPFS node connectivity and pinning services.'
            );
        }

        // Volume recommendations
        if (metrics.pendingVerifications > metrics.completedVerifications * 0.1) {
            recommendations.push(
                'High number of pending verifications. Consider scaling processing capacity.'
            );
        }

        return recommendations;
    }

    /**
     * Get real-time verification statistics
     */
    async getRealTimeStats(): Promise<{
        activeVerifications: number;
        queuedVerifications: number;
        completedToday: number;
        failedToday: number;
        averageWaitTime: number;
    }> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [
                activeVerifications,
                queuedVerifications,
                completedToday,
                failedToday,
            ] = await Promise.all([
                Verification.count({
                    where: { status: VerificationStatus.IN_PROGRESS },
                }),
                Verification.count({
                    where: { status: VerificationStatus.PENDING },
                }),
                Verification.count({
                    where: {
                        status: VerificationStatus.COMPLETED,
                        completedAt: { [Op.gte]: today },
                    },
                }),
                Verification.count({
                    where: {
                        status: VerificationStatus.FAILED,
                        updatedAt: { [Op.gte]: today },
                    },
                }),
            ]);

            // Calculate average wait time for pending verifications
            const pendingVerifications = await Verification.findAll({
                where: { status: VerificationStatus.PENDING },
                attributes: ['startedAt'],
            });

            const averageWaitTime = pendingVerifications.length > 0
                ? pendingVerifications.reduce((sum, v) => {
                    return sum + (Date.now() - v.startedAt.getTime());
                }, 0) / pendingVerifications.length
                : 0;

            return {
                activeVerifications,
                queuedVerifications,
                completedToday,
                failedToday,
                averageWaitTime,
            };
        } catch (error: any) {
            logger.error('Failed to get real-time stats', { error: error.message });
            throw error;
        }
    }
}

// Export singleton instance
export const verificationAnalyticsService = new VerificationAnalyticsService();
export default verificationAnalyticsService;