import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { verificationService, VerificationRequest } from '../services/verification.service';
import Document from '../models/Document';
import Verification, { VerificationType, VerificationPriority } from '../models/Verification';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Start a new verification process
 */
export const startVerification = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { documentId } = req.params;
        const {
            type,
            priority,
            webhookUrl,
            callbackData,
            options,
        } = req.body;

        // Validate required fields
        if (!documentId) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_DOCUMENT_ID',
                    message: 'Document ID is required',
                },
            });
            return;
        }

        if (!type || !Object.values(VerificationType).includes(type)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_VERIFICATION_TYPE',
                    message: 'Valid verification type is required',
                },
            });
            return;
        }

        // Check if document exists and user has access
        const document = await Document.findByPk(documentId);
        if (!document) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'DOCUMENT_NOT_FOUND',
                    message: 'Document not found',
                },
            });
            return;
        }

        // Check document access permissions
        if (document.userId !== req.user!.id &&
            (!document.organizationId || document.organizationId !== req.user!.organizationId)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'You do not have permission to verify this document',
                },
            });
            return;
        }

        // Create verification request
        const verificationRequest: VerificationRequest = {
            documentId,
            userId: req.user!.id,
            organizationId: req.user!.organizationId,
            type,
            priority: priority || VerificationPriority.NORMAL,
            webhookUrl,
            callbackData,
            options,
        };

        // Start verification
        const verification = await verificationService.startVerification(verificationRequest);

        logger.info('Verification started successfully', {
            verificationId: verification.id,
            documentId,
            userId: req.user!.id,
            type,
        });

        res.status(201).json({
            success: true,
            data: {
                verificationId: verification.id,
                status: verification.status,
                type: verification.type,
                priority: verification.priority,
                startedAt: verification.startedAt,
                estimatedCompletionTime: verification.expiresAt,
            },
        });
    } catch (error: any) {
        logger.error('Failed to start verification', {
            error: error.message,
            documentId: req.params.documentId,
            userId: req.user?.id,
            stack: error.stack,
        });
        next(error);
    }
};

/**
 * Get verification status
 */
export const getVerificationStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { verificationId } = req.params;

        // Get verification record to check permissions
        const verification = await Verification.findByPk(verificationId);
        if (!verification) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'VERIFICATION_NOT_FOUND',
                    message: 'Verification not found',
                },
            });
            return;
        }

        // Check access permissions
        if (verification.userId !== req.user!.id &&
            (!verification.organizationId || verification.organizationId !== req.user!.organizationId)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'You do not have permission to view this verification',
                },
            });
            return;
        }

        // Get status from service
        const status = await verificationService.getVerificationStatus(verificationId);

        res.json({
            success: true,
            data: {
                verificationId,
                status: status.status,
                progress: status.progress,
                results: status.results,
                error: status.error,
                startedAt: verification.startedAt,
                completedAt: verification.completedAt,
            },
        });
    } catch (error: any) {
        logger.error('Failed to get verification status', {
            error: error.message,
            verificationId: req.params.verificationId,
            userId: req.user?.id,
            stack: error.stack,
        });
        next(error);
    }
};

/**
 * Get verification results
 */
export const getVerificationResults = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { verificationId } = req.params;

        // Get verification record
        const verification = await Verification.findByPk(verificationId, {
            include: [
                {
                    model: Document,
                    as: 'document',
                },
            ],
        });

        if (!verification) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'VERIFICATION_NOT_FOUND',
                    message: 'Verification not found',
                },
            });
            return;
        }

        // Check access permissions
        if (verification.userId !== req.user!.id &&
            (!verification.organizationId || verification.organizationId !== req.user!.organizationId)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'You do not have permission to view this verification',
                },
            });
            return;
        }

        // Check if verification is completed
        if (!verification.isCompleted()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VERIFICATION_NOT_COMPLETED',
                    message: 'Verification is not yet completed',
                },
            });
            return;
        }

        res.json({
            success: true,
            data: {
                verificationId,
                documentId: verification.documentId,
                type: verification.type,
                status: verification.status,
                results: verification.results,
                startedAt: verification.startedAt,
                completedAt: verification.completedAt,
                processingTime: verification.getProcessingTime(),
            },
        });
    } catch (error: any) {
        logger.error('Failed to get verification results', {
            error: error.message,
            verificationId: req.params.verificationId,
            userId: req.user?.id,
            stack: error.stack,
        });
        next(error);
    }
};

/**
 * Get document verification history
 */
export const getDocumentVerificationHistory = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { documentId } = req.params;
        const { page = 1, limit = 10, type } = req.query;

        // Check if document exists and user has access
        const document = await Document.findByPk(documentId);
        if (!document) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'DOCUMENT_NOT_FOUND',
                    message: 'Document not found',
                },
            });
            return;
        }

        // Check document access permissions
        if (document.userId !== req.user!.id &&
            (!document.organizationId || document.organizationId !== req.user!.organizationId)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'You do not have permission to view this document',
                },
            });
            return;
        }

        // Build query conditions
        const whereConditions: any = { documentId };
        if (type && Object.values(VerificationType).includes(type as VerificationType)) {
            whereConditions.type = type;
        }

        // Get verification history with pagination
        const offset = (Number(page) - 1) * Number(limit);
        const { count, rows: verifications } = await Verification.findAndCountAll({
            where: whereConditions,
            order: [['created_at', 'DESC']],
            limit: Number(limit),
            offset,
        });

        res.json({
            success: true,
            data: {
                verifications: verifications.map(v => ({
                    id: v.id,
                    type: v.type,
                    status: v.status,
                    priority: v.priority,
                    startedAt: v.startedAt,
                    completedAt: v.completedAt,
                    processingTime: v.getProcessingTime(),
                    results: v.results,
                })),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: count,
                    pages: Math.ceil(count / Number(limit)),
                },
            },
        });
    } catch (error: any) {
        logger.error('Failed to get document verification history', {
            error: error.message,
            documentId: req.params.documentId,
            userId: req.user?.id,
            stack: error.stack,
        });
        next(error);
    }
};

/**
 * Cancel verification
 */
export const cancelVerification = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { verificationId } = req.params;

        // Get verification record
        const verification = await Verification.findByPk(verificationId);
        if (!verification) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'VERIFICATION_NOT_FOUND',
                    message: 'Verification not found',
                },
            });
            return;
        }

        // Check access permissions
        if (verification.userId !== req.user!.id &&
            (!verification.organizationId || verification.organizationId !== req.user!.organizationId)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'You do not have permission to cancel this verification',
                },
            });
            return;
        }

        // Check if verification can be cancelled
        if (verification.isCompleted() || verification.isFailed()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VERIFICATION_CANNOT_BE_CANCELLED',
                    message: 'Verification cannot be cancelled in its current state',
                },
            });
            return;
        }

        // Update verification status
        await verificationService.updateVerificationStatus({
            verificationId,
            status: verification.status === 'cancelled' ? verification.status : 'cancelled',
        });

        logger.info('Verification cancelled successfully', {
            verificationId,
            userId: req.user!.id,
        });

        res.json({
            success: true,
            data: {
                verificationId,
                status: 'cancelled',
                cancelledAt: new Date(),
            },
        });
    } catch (error: any) {
        logger.error('Failed to cancel verification', {
            error: error.message,
            verificationId: req.params.verificationId,
            userId: req.user?.id,
            stack: error.stack,
        });
        next(error);
    }
};

/**
 * Handle AI forensics webhook
 */
export const handleAIForensicsWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const payload = req.body;

        logger.info('Received AI forensics webhook', { payload });

        // Process webhook callback
        await verificationService.processWebhookCallback(payload, 'ai-forensics');

        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
        });
    } catch (error: any) {
        logger.error('Failed to process AI forensics webhook', {
            error: error.message,
            payload: req.body,
            stack: error.stack,
        });
        next(error);
    }
};

/**
 * Handle blockchain webhook
 */
export const handleBlockchainWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const payload = req.body;

        logger.info('Received blockchain webhook', { payload });

        // Process webhook callback
        await verificationService.processWebhookCallback(payload, 'blockchain');

        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
        });
    } catch (error: any) {
        logger.error('Failed to process blockchain webhook', {
            error: error.message,
            payload: req.body,
            stack: error.stack,
        });
        next(error);
    }
};

/**
 * Get verification service health status
 */
export const getServiceHealth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { aiForensicsService, blockchainService, ipfsService } = require('../services');

        // Check health of all external services
        const [aiHealth, blockchainHealth, ipfsHealth] = await Promise.allSettled([
            aiForensicsService.healthCheck(),
            blockchainService.healthCheck(),
            ipfsService.healthCheck(),
        ]);

        const health = {
            aiForensics: aiHealth.status === 'fulfilled' ? aiHealth.value : false,
            blockchain: blockchainHealth.status === 'fulfilled' ? blockchainHealth.value : false,
            ipfs: ipfsHealth.status === 'fulfilled' ? ipfsHealth.value : false,
        };

        const allHealthy = Object.values(health).every(status => status === true);

        res.status(allHealthy ? 200 : 503).json({
            success: allHealthy,
            data: {
                status: allHealthy ? 'healthy' : 'degraded',
                services: health,
                timestamp: new Date(),
            },
        });
    } catch (error: any) {
        logger.error('Failed to check service health', {
            error: error.message,
            stack: error.stack,
        });
        next(error);
    }
};