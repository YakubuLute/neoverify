import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
    startVerification,
    getVerificationStatus,
    getVerificationResults,
    getDocumentVerificationHistory,
    cancelVerification,
    handleAIForensicsWebhook,
    handleBlockchainWebhook,
    getServiceHealth,
    getVerificationAnalytics,
    generateVerificationReport,
    getRealTimeStats,
} from '../controllers/verification.controller';
import { VerificationType, VerificationPriority } from '../models/Verification';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     VerificationRequest:
 *       type: object
 *       required:
 *         - type
 *       properties:
 *         type:
 *           type: string
 *           enum: [ai_forensics, blockchain, ipfs, manual, hybrid]
 *           description: Type of verification to perform
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           description: Priority of the verification
 *         webhookUrl:
 *           type: string
 *           format: uri
 *           description: URL to receive webhook notifications
 *         callbackData:
 *           type: object
 *           description: Additional data to include in webhook callbacks
 *         options:
 *           type: object
 *           properties:
 *             aiAnalysisType:
 *               type: string
 *               enum: [full, quick, signature, text, image]
 *             blockchainNetwork:
 *               type: string
 *             ipfsPinning:
 *               type: boolean
 *             skipExisting:
 *               type: boolean
 *     
 *     VerificationResponse:
 *       type: object
 *       properties:
 *         verificationId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, failed, cancelled]
 *         type:
 *           type: string
 *         priority:
 *           type: string
 *         startedAt:
 *           type: string
 *           format: date-time
 *         estimatedCompletionTime:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/verification/documents/{documentId}/verify:
 *   post:
 *     summary: Start verification process for a document
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID to verify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerificationRequest'
 *     responses:
 *       201:
 *         description: Verification started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VerificationResponse'
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document not found
 */
router.post(
    '/documents/:documentId/verify',
    authenticate,
    [
        param('documentId')
            .isUUID()
            .withMessage('Document ID must be a valid UUID'),
        body('type')
            .isIn(Object.values(VerificationType))
            .withMessage('Invalid verification type'),
        body('priority')
            .optional()
            .isIn(Object.values(VerificationPriority))
            .withMessage('Invalid verification priority'),
        body('webhookUrl')
            .optional()
            .isURL()
            .withMessage('Webhook URL must be a valid URL'),
        body('options.aiAnalysisType')
            .optional()
            .isIn(['full', 'quick', 'signature', 'text', 'image'])
            .withMessage('Invalid AI analysis type'),
        body('options.ipfsPinning')
            .optional()
            .isBoolean()
            .withMessage('IPFS pinning must be a boolean'),
        body('options.skipExisting')
            .optional()
            .isBoolean()
            .withMessage('Skip existing must be a boolean'),
    ],
    validate,
    startVerification
);

/**
 * @swagger
 * /api/verification/{verificationId}/status:
 *   get:
 *     summary: Get verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification ID
 *     responses:
 *       200:
 *         description: Verification status retrieved successfully
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
 *                     verificationId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     progress:
 *                       type: number
 *                     results:
 *                       type: object
 *                     error:
 *                       type: string
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Access denied
 *       404:
 *         description: Verification not found
 */
router.get(
    '/:verificationId/status',
    authenticate,
    [
        param('verificationId')
            .isUUID()
            .withMessage('Verification ID must be a valid UUID'),
    ],
    validate,
    getVerificationStatus
);

/**
 * @swagger
 * /api/verification/{verificationId}/results:
 *   get:
 *     summary: Get verification results
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification ID
 *     responses:
 *       200:
 *         description: Verification results retrieved successfully
 *       400:
 *         description: Verification not completed
 *       403:
 *         description: Access denied
 *       404:
 *         description: Verification not found
 */
router.get(
    '/:verificationId/results',
    authenticate,
    [
        param('verificationId')
            .isUUID()
            .withMessage('Verification ID must be a valid UUID'),
    ],
    validate,
    getVerificationResults
);

/**
 * @swagger
 * /api/verification/documents/{documentId}/history:
 *   get:
 *     summary: Get document verification history
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ai_forensics, blockchain, ipfs, manual, hybrid]
 *         description: Filter by verification type
 *     responses:
 *       200:
 *         description: Verification history retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document not found
 */
router.get(
    '/documents/:documentId/history',
    authenticate,
    [
        param('documentId')
            .isUUID()
            .withMessage('Document ID must be a valid UUID'),
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        query('type')
            .optional()
            .isIn(Object.values(VerificationType))
            .withMessage('Invalid verification type'),
    ],
    validate,
    getDocumentVerificationHistory
);

/**
 * @swagger
 * /api/verification/{verificationId}/cancel:
 *   post:
 *     summary: Cancel verification
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification ID
 *     responses:
 *       200:
 *         description: Verification cancelled successfully
 *       400:
 *         description: Verification cannot be cancelled
 *       403:
 *         description: Access denied
 *       404:
 *         description: Verification not found
 */
router.post(
    '/:verificationId/cancel',
    authenticate,
    [
        param('verificationId')
            .isUUID()
            .withMessage('Verification ID must be a valid UUID'),
    ],
    validate,
    cancelVerification
);

/**
 * @swagger
 * /api/verification/webhooks/ai-forensics:
 *   post:
 *     summary: Handle AI forensics webhook
 *     tags: [Verification]
 *     description: Webhook endpoint for AI forensics service callbacks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook payload
 */
router.post('/webhooks/ai-forensics', handleAIForensicsWebhook);

/**
 * @swagger
 * /api/verification/webhooks/blockchain:
 *   post:
 *     summary: Handle blockchain webhook
 *     tags: [Verification]
 *     description: Webhook endpoint for blockchain service callbacks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook payload
 */
router.post('/webhooks/blockchain', handleBlockchainWebhook);

/**
 * @swagger
 * /api/verification/analytics:
 *   get:
 *     summary: Get verification analytics and metrics
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for analytics period
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID (optional, defaults to user's organization)
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *       400:
 *         description: Invalid date parameters
 */
router.get(
    '/analytics',
    authenticate,
    [
        query('startDate')
            .isISO8601()
            .withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate')
            .isISO8601()
            .withMessage('End date must be a valid ISO 8601 date'),
        query('organizationId')
            .optional()
            .isUUID()
            .withMessage('Organization ID must be a valid UUID'),
    ],
    validate,
    getVerificationAnalytics
);

/**
 * @swagger
 * /api/verification/reports/generate:
 *   post:
 *     summary: Generate comprehensive verification report
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Report generated successfully
 *       400:
 *         description: Invalid request parameters
 */
router.post(
    '/reports/generate',
    authenticate,
    [
        body('startDate')
            .isISO8601()
            .withMessage('Start date must be a valid ISO 8601 date'),
        body('endDate')
            .isISO8601()
            .withMessage('End date must be a valid ISO 8601 date'),
        body('organizationId')
            .optional()
            .isUUID()
            .withMessage('Organization ID must be a valid UUID'),
    ],
    validate,
    generateVerificationReport
);

/**
 * @swagger
 * /api/verification/stats/realtime:
 *   get:
 *     summary: Get real-time verification statistics
 *     tags: [Verification]
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
 *                     activeVerifications:
 *                       type: number
 *                     queuedVerifications:
 *                       type: number
 *                     completedToday:
 *                       type: number
 *                     failedToday:
 *                       type: number
 *                     averageWaitTime:
 *                       type: number
 */
router.get('/stats/realtime', authenticate, getRealTimeStats);

/**
 * @swagger
 * /api/verification/health:
 *   get:
 *     summary: Get verification service health status
 *     tags: [Verification]
 *     description: Check health status of all verification services
 *     responses:
 *       200:
 *         description: All services are healthy
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
 *                       enum: [healthy, degraded]
 *                     services:
 *                       type: object
 *                       properties:
 *                         aiForensics:
 *                           type: boolean
 *                         blockchain:
 *                           type: boolean
 *                         ipfs:
 *                           type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       503:
 *         description: One or more services are unhealthy
 */
router.get('/health', getServiceHealth);

export default router;