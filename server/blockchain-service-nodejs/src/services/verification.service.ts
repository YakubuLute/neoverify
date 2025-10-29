import  logger  from '../utils/logger';
import Document, { VerificationStatus, VerificationResults } from '../models/Document';
import Verification, {
    VerificationType,
    VerificationPriority,
    VerificationResultsData,
    VerificationMetadata
} from '../models/Verification';
import { aiForensicsService } from './ai-forensics.service';
import { blockchainService } from './blockchain.service';
import { ipfsService } from './ipfs.service';
import cacheService from './cache.service';
import { EventEmitter } from 'events';

// Verification request interface
export interface VerificationRequest {
    documentId: string;
    userId: string;
    organizationId?: string;
    type: VerificationType;
    priority?: VerificationPriority;
    webhookUrl?: string;
    callbackData?: any;
    options?: {
        aiAnalysisType?: 'full' | 'quick' | 'signature' | 'text' | 'image';
        blockchainNetwork?: string;
        ipfsPinning?: boolean;
        skipExisting?: boolean;
    };
}

// Verification status update interface
export interface VerificationStatusUpdate {
    verificationId: string;
    status: VerificationStatus;
    progress?: number;
    results?: Partial<VerificationResultsData>;
    error?: string;
}

class VerificationService extends EventEmitter {
    private readonly CACHE_TTL = 3600; // 1 hour
    private readonly MAX_CONCURRENT_VERIFICATIONS = 10;
    private activeVerifications = new Map<string, Promise<Verification>>();

    constructor() {
        super();
        this.setupEventHandlers();
    }

    /**
     * Start a new verification process
     */
    async startVerification(request: VerificationRequest): Promise<Verification> {
        try {
            logger.info('Starting verification process', {
                documentId: request.documentId,
                userId: request.userId,
                type: request.type,
                priority: request.priority,
            });

            // Get the document
            const document = await Document.findByPk(request.documentId);
            if (!document) {
                throw new Error(`Document not found: ${request.documentId}`);
            }

            // Check if verification already exists and is in progress
            if (request.options?.skipExisting) {
                const existingVerification = await this.getActiveVerification(request.documentId, request.type);
                if (existingVerification) {
                    logger.info('Returning existing verification', {
                        verificationId: existingVerification.id,
                        status: existingVerification.status,
                    });
                    return existingVerification;
                }
            }

            // Create verification record
            const verification = await Verification.create({
                documentId: request.documentId,
                userId: request.userId,
                organizationId: request.organizationId,
                type: request.type,
                priority: request.priority || VerificationPriority.NORMAL,
                status: VerificationStatus.PENDING,
                results: {},
                metadata: Verification.getDefaultMetadata(request.userId, request.priority),
                webhookUrl: request.webhookUrl,
                callbackData: request.callbackData,
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            });

            // Update document status
            document.updateVerificationStatus(VerificationStatus.PENDING);
            await document.save();

            // Start verification process asynchronously
            const verificationPromise = this.processVerification(verification, document, request.options);
            this.activeVerifications.set(verification.id, verificationPromise);

            // Clean up after completion
            verificationPromise.finally(() => {
                this.activeVerifications.delete(verification.id);
            });

            // Emit verification started event
            this.emit('verificationStarted', {
                verificationId: verification.id,
                documentId: request.documentId,
                type: request.type,
            });

            logger.info('Verification process started successfully', {
                verificationId: verification.id,
                documentId: request.documentId,
                type: request.type,
            });

            return verification;
        } catch (error: any) {
            logger.error('Failed to start verification process', {
                error: error.message,
                documentId: request.documentId,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Process verification based on type
     */
    private async processVerification(
        verification: Verification,
        document: Document,
        options?: VerificationRequest['options']
    ): Promise<Verification> {
        try {
            // Update status to in progress
            await this.updateVerificationStatus({
                verificationId: verification.id,
                status: VerificationStatus.IN_PROGRESS,
                progress: 10,
            });

            let results: Partial<VerificationResultsData> = {};

            switch (verification.type) {
                case VerificationType.AI_FORENSICS:
                    results = await this.processAIForensics(verification, document, options);
                    break;

                case VerificationType.BLOCKCHAIN:
                    results = await this.processBlockchain(verification, document, options);
                    break;

                case VerificationType.IPFS:
                    results = await this.processIPFS(verification, document, options);
                    break;

                case VerificationType.HYBRID:
                    results = await this.processHybridVerification(verification, document, options);
                    break;

                case VerificationType.MANUAL:
                    // Manual verification requires human intervention
                    await this.updateVerificationStatus({
                        verificationId: verification.id,
                        status: VerificationStatus.PENDING,
                        progress: 50,
                    });
                    return verification;

                default:
                    throw new Error(`Unsupported verification type: ${verification.type}`);
            }

            // Update verification with results
            await this.updateVerificationStatus({
                verificationId: verification.id,
                status: VerificationStatus.COMPLETED,
                progress: 100,
                results,
            });

            // Update document verification results
            document.updateVerificationStatus(VerificationStatus.COMPLETED, results);
            await document.save();

            logger.info('Verification process completed successfully', {
                verificationId: verification.id,
                documentId: document.id,
                type: verification.type,
            });

            return verification;
        } catch (error: any) {
            logger.error('Verification process failed', {
                error: error.message,
                verificationId: verification.id,
                documentId: document.id,
                stack: error.stack,
            });

            // Update verification with error
            await this.updateVerificationStatus({
                verificationId: verification.id,
                status: VerificationStatus.FAILED,
                error: error.message,
            });

            // Update document status
            document.updateVerificationStatus(VerificationStatus.FAILED);
            await document.save();

            throw error;
        }
    }

    /**
     * Process AI forensics verification
     */
    private async processAIForensics(
        verification: Verification,
        document: Document,
        options?: VerificationRequest['options']
    ): Promise<Partial<VerificationResultsData>> {
        try {
            logger.info('Processing AI forensics verification', {
                verificationId: verification.id,
                documentId: document.id,
            });

            // Submit document for AI analysis
            const jobResponse = await aiForensicsService.submitDocument({
                documentPath: document.filePath,
                documentType: document.documentType,
                analysisType: options?.aiAnalysisType || 'full',
                priority: verification.priority,
                webhookUrl: verification.webhookUrl,
                metadata: {
                    userId: verification.userId,
                    documentId: document.id,
                    organizationId: verification.organizationId,
                },
            });

            // Update verification with job ID
            verification.externalJobId = jobResponse.jobId;
            await verification.save();

            await this.updateVerificationStatus({
                verificationId: verification.id,
                status: VerificationStatus.IN_PROGRESS,
                progress: 30,
            });

            // Poll for results (in production, this would be handled by webhooks)
            const results = await this.pollForAIResults(jobResponse.jobId);

            return {
                aiForensics: results,
            };
        } catch (error: any) {
            logger.error('AI forensics verification failed', {
                error: error.message,
                verificationId: verification.id,
                documentId: document.id,
            });
            throw error;
        }
    }

    /**
     * Process blockchain verification
     */
    private async processBlockchain(
        verification: Verification,
        document: Document,
        options?: VerificationRequest['options']
    ): Promise<Partial<VerificationResultsData>> {
        try {
            logger.info('Processing blockchain verification', {
                verificationId: verification.id,
                documentId: document.id,
            });

            // Register document on blockchain
            const registrationResponse = await blockchainService.registerDocument({
                documentHash: document.hash,
                documentId: document.id,
                userId: verification.userId,
                organizationId: verification.organizationId,
                metadata: {
                    filename: document.originalName,
                    mimeType: document.mimeType,
                    size: document.size,
                    timestamp: document.createdAt,
                },
                webhookUrl: verification.webhookUrl,
            });

            await this.updateVerificationStatus({
                verificationId: verification.id,
                status: VerificationStatus.IN_PROGRESS,
                progress: 50,
            });

            // Wait for transaction confirmation
            const statusResponse = await this.pollForBlockchainConfirmation(
                registrationResponse.transactionHash
            );

            const blockchainResults = blockchainService.convertToVerificationResults(
                registrationResponse,
                statusResponse
            );

            return {
                blockchain: blockchainResults,
            };
        } catch (error: any) {
            logger.error('Blockchain verification failed', {
                error: error.message,
                verificationId: verification.id,
                documentId: document.id,
            });
            throw error;
        }
    }

    /**
     * Process IPFS verification
     */
    private async processIPFS(
        verification: Verification,
        document: Document,
        options?: VerificationRequest['options']
    ): Promise<Partial<VerificationResultsData>> {
        try {
            logger.info('Processing IPFS verification', {
                verificationId: verification.id,
                documentId: document.id,
            });

            // Upload document to IPFS
            const uploadResponse = await ipfsService.uploadFile({
                filePath: document.filePath,
                filename: document.originalName,
                pin: options?.ipfsPinning || true,
                metadata: {
                    documentId: document.id,
                    userId: verification.userId,
                    organizationId: verification.organizationId,
                    mimeType: document.mimeType,
                    size: document.size,
                },
            });

            // Update document with IPFS hash
            document.ipfsHash = uploadResponse.hash;
            await document.save();

            await this.updateVerificationStatus({
                verificationId: verification.id,
                status: VerificationStatus.IN_PROGRESS,
                progress: 80,
            });

            const ipfsResults = ipfsService.convertToVerificationResults(uploadResponse);

            return {
                ipfs: ipfsResults,
            };
        } catch (error: any) {
            logger.error('IPFS verification failed', {
                error: error.message,
                verificationId: verification.id,
                documentId: document.id,
            });
            throw error;
        }
    }

    /**
     * Process hybrid verification (AI + Blockchain + IPFS)
     */
    private async processHybridVerification(
        verification: Verification,
        document: Document,
        options?: VerificationRequest['options']
    ): Promise<Partial<VerificationResultsData>> {
        try {
            logger.info('Processing hybrid verification', {
                verificationId: verification.id,
                documentId: document.id,
            });

            const results: Partial<VerificationResultsData> = {};

            // Step 1: IPFS upload (20% progress)
            try {
                const ipfsResults = await this.processIPFS(verification, document, options);
                results.ipfs = ipfsResults.ipfs;
                await this.updateVerificationStatus({
                    verificationId: verification.id,
                    status: VerificationStatus.IN_PROGRESS,
                    progress: 20,
                });
            } catch (error) {
                logger.warn('IPFS step failed in hybrid verification', { error });
            }

            // Step 2: Blockchain registration (50% progress)
            try {
                const blockchainResults = await this.processBlockchain(verification, document, options);
                results.blockchain = blockchainResults.blockchain;
                await this.updateVerificationStatus({
                    verificationId: verification.id,
                    status: VerificationStatus.IN_PROGRESS,
                    progress: 50,
                });
            } catch (error) {
                logger.warn('Blockchain step failed in hybrid verification', { error });
            }

            // Step 3: AI forensics analysis (90% progress)
            try {
                const aiResults = await this.processAIForensics(verification, document, options);
                results.aiForensics = aiResults.aiForensics;
                await this.updateVerificationStatus({
                    verificationId: verification.id,
                    status: VerificationStatus.IN_PROGRESS,
                    progress: 90,
                });
            } catch (error) {
                logger.warn('AI forensics step failed in hybrid verification', { error });
            }

            return results;
        } catch (error: any) {
            logger.error('Hybrid verification failed', {
                error: error.message,
                verificationId: verification.id,
                documentId: document.id,
            });
            throw error;
        }
    }

    /**
     * Update verification status and emit events
     */
    async updateVerificationStatus(update: VerificationStatusUpdate): Promise<void> {
        try {
            const verification = await Verification.findByPk(update.verificationId);
            if (!verification) {
                throw new Error(`Verification not found: ${update.verificationId}`);
            }

            // Update verification
            verification.updateStatus(update.status, update.results);

            if (update.error) {
                verification.addError(update.error);
            }

            await verification.save();

            // Cache the status update
            await cacheService.set(
                `verification:${update.verificationId}:status`,
                {
                    status: update.status,
                    progress: update.progress,
                    updatedAt: new Date(),
                },
                this.CACHE_TTL
            );

            // Emit status update event
            this.emit('statusUpdate', {
                verificationId: update.verificationId,
                status: update.status,
                progress: update.progress,
                results: update.results,
                error: update.error,
            });

            logger.info('Verification status updated', {
                verificationId: update.verificationId,
                status: update.status,
                progress: update.progress,
            });
        } catch (error: any) {
            logger.error('Failed to update verification status', {
                error: error.message,
                verificationId: update.verificationId,
            });
            throw error;
        }
    }

    /**
     * Get verification status
     */
    async getVerificationStatus(verificationId: string): Promise<{
        status: VerificationStatus;
        progress: number;
        results?: VerificationResultsData;
        error?: string;
    }> {
        try {
            // Try cache first
            const cached = await cacheService.get(`verification:${verificationId}:status`);
            if (cached) {
                return cached;
            }

            // Get from database
            const verification = await Verification.findByPk(verificationId);
            if (!verification) {
                throw new Error(`Verification not found: ${verificationId}`);
            }

            const result = {
                status: verification.status,
                progress: this.calculateProgress(verification),
                results: verification.results,
                error: verification.metadata.errorMessages.join('; ') || undefined,
            };

            // Cache the result
            await cacheService.set(
                `verification:${verificationId}:status`,
                result,
                this.CACHE_TTL
            );

            return result;
        } catch (error: any) {
            logger.error('Failed to get verification status', {
                error: error.message,
                verificationId,
            });
            throw error;
        }
    }

    /**
     * Get active verification for a document and type
     */
    private async getActiveVerification(
        documentId: string,
        type: VerificationType
    ): Promise<Verification | null> {
        return Verification.findOne({
            where: {
                documentId,
                type,
                status: [VerificationStatus.PENDING, VerificationStatus.IN_PROGRESS],
            },
            order: [['created_at', 'DESC']],
        });
    }

    /**
     * Poll for AI forensics results
     */
    private async pollForAIResults(jobId: string, maxAttempts: number = 60): Promise<any> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const status = await aiForensicsService.getJobStatus(jobId);

                if (status.status === 'completed') {
                    return await aiForensicsService.getJobResults(jobId);
                } else if (status.status === 'failed') {
                    throw new Error(`AI forensics job failed: ${status.error}`);
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
            } catch (error: any) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                logger.warn(`AI forensics polling attempt ${attempt} failed`, { error: error.message });
            }
        }

        throw new Error('AI forensics job timed out');
    }

    /**
     * Poll for blockchain confirmation
     */
    private async pollForBlockchainConfirmation(
        transactionHash: string,
        maxAttempts: number = 30
    ): Promise<any> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const status = await blockchainService.getTransactionStatus(transactionHash);

                if (status.status === 'confirmed') {
                    return status;
                } else if (status.status === 'failed') {
                    throw new Error(`Blockchain transaction failed: ${status.error}`);
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
            } catch (error: any) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                logger.warn(`Blockchain polling attempt ${attempt} failed`, { error: error.message });
            }
        }

        throw new Error('Blockchain transaction timed out');
    }

    /**
     * Calculate verification progress
     */
    private calculateProgress(verification: Verification): number {
        switch (verification.status) {
            case VerificationStatus.PENDING:
                return 0;
            case VerificationStatus.IN_PROGRESS:
                return 50; // Default progress for in-progress
            case VerificationStatus.COMPLETED:
                return 100;
            case VerificationStatus.FAILED:
            case VerificationStatus.CANCELLED:
                return 0;
            default:
                return 0;
        }
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(): void {
        this.on('verificationStarted', (data) => {
            logger.info('Verification started event', data);
        });

        this.on('statusUpdate', (data) => {
            logger.info('Verification status update event', data);
        });

        this.on('verificationCompleted', (data) => {
            logger.info('Verification completed event', data);
        });

        this.on('verificationFailed', (data) => {
            logger.error('Verification failed event', data);
        });
    }

    /**
     * Process webhook callbacks
     */
    async processWebhookCallback(payload: any, source: 'ai-forensics' | 'blockchain'): Promise<void> {
        try {
            logger.info('Processing webhook callback', { source, payload });

            let verificationId: string;
            let status: VerificationStatus;
            let results: Partial<VerificationResultsData> = {};
            let error: string | undefined;

            if (source === 'ai-forensics') {
                const callback = aiForensicsService.processWebhookCallback(payload);

                // Find verification by external job ID
                const verification = await Verification.findByExternalJobId(callback.jobId);
                if (!verification) {
                    throw new Error(`Verification not found for job ID: ${callback.jobId}`);
                }

                verificationId = verification.id;
                status = callback.status === 'completed' ? VerificationStatus.COMPLETED :
                    callback.status === 'failed' ? VerificationStatus.FAILED :
                        VerificationStatus.IN_PROGRESS;

                if (callback.results) {
                    results.aiForensics = callback.results;
                }

                error = callback.error;
            } else if (source === 'blockchain') {
                const callback = blockchainService.processWebhookCallback(payload);

                // Find verification by transaction hash (stored in external job ID for blockchain)
                const verification = await Verification.findByExternalJobId(callback.transactionHash);
                if (!verification) {
                    throw new Error(`Verification not found for transaction: ${callback.transactionHash}`);
                }

                verificationId = verification.id;
                status = callback.status === 'confirmed' ? VerificationStatus.COMPLETED :
                    callback.status === 'failed' ? VerificationStatus.FAILED :
                        VerificationStatus.IN_PROGRESS;

                if (callback.status === 'confirmed') {
                    results.blockchain = {
                        transactionHash: callback.transactionHash,
                        blockNumber: callback.blockNumber,
                        confirmations: callback.confirmations || 0,
                        timestamp: new Date(),
                        status: 'confirmed',
                        network: process.env.BLOCKCHAIN_NETWORK || 'ethereum',
                    };
                }

                error = callback.error;
            } else {
                throw new Error(`Unknown webhook source: ${source}`);
            }

            // Update verification status
            await this.updateVerificationStatus({
                verificationId,
                status,
                results,
                error,
            });

            logger.info('Webhook callback processed successfully', {
                source,
                verificationId,
                status,
            });
        } catch (error: any) {
            logger.error('Failed to process webhook callback', {
                error: error.message,
                source,
                payload,
            });
            throw error;
        }
    }
}

// Export singleton instance
export const verificationService = new VerificationService();
export default verificationService;