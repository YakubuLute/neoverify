import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../utils/logger';
import { BlockchainResults } from '../models/Verification';

// Blockchain service configuration
interface BlockchainConfig {
    baseUrl: string;
    apiKey: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
    network: string;
    contractAddress: string;
}

// Document registration request
interface DocumentRegistrationRequest {
    documentHash: string;
    documentId: string;
    userId: string;
    organizationId?: string;
    metadata: {
        filename: string;
        mimeType: string;
        size: number;
        timestamp: Date;
    };
    webhookUrl?: string;
}

// Document registration response
interface DocumentRegistrationResponse {
    transactionHash: string;
    status: 'pending' | 'confirmed' | 'failed';
    estimatedConfirmationTime?: number;
    gasEstimate?: string;
    message?: string;
}

// Transaction status response
interface TransactionStatusResponse {
    transactionHash: string;
    status: 'pending' | 'confirmed' | 'failed';
    blockNumber?: number;
    blockHash?: string;
    gasUsed?: number;
    gasPrice?: string;
    confirmations: number;
    timestamp?: Date;
    error?: string;
}

// Certificate generation request
interface CertificateRequest {
    documentId: string;
    transactionHash: string;
    verificationResults: {
        authenticity: number;
        tampering: number;
        confidence: number;
        overall: {
            score: number;
            status: string;
        };
    };
}

// Certificate response
interface CertificateResponse {
    certificateId: string;
    certificateHash: string;
    ipfsHash?: string;
    downloadUrl: string;
    expiresAt?: Date;
}

class BlockchainService {
    private client: AxiosInstance;
    private config: BlockchainConfig;

    constructor() {
        this.config = {
            baseUrl: process.env.BLOCKCHAIN_SERVICE_URL || 'http://localhost:3001',
            apiKey: process.env.BLOCKCHAIN_API_KEY || '',
            timeout: parseInt(process.env.BLOCKCHAIN_TIMEOUT || '60000'), // 1 minute
            maxRetries: parseInt(process.env.BLOCKCHAIN_MAX_RETRIES || '3'),
            retryDelay: parseInt(process.env.BLOCKCHAIN_RETRY_DELAY || '5000'), // 5 seconds
            network: process.env.BLOCKCHAIN_NETWORK || 'ethereum',
            contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '',
        };

        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                logger.info('Blockchain API Request', {
                    method: config.method,
                    url: config.url,
                    headers: config.headers,
                });
                return config;
            },
            (error) => {
                logger.error('Blockchain API Request Error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging and error handling
        this.client.interceptors.response.use(
            (response) => {
                logger.info('Blockchain API Response', {
                    status: response.status,
                    url: response.config.url,
                    data: response.data,
                });
                return response;
            },
            (error) => {
                logger.error('Blockchain API Response Error', {
                    status: error.response?.status,
                    url: error.config?.url,
                    message: error.message,
                    data: error.response?.data,
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Register a document on the blockchain
     */
    async registerDocument(request: DocumentRegistrationRequest): Promise<DocumentRegistrationResponse> {
        try {
            logger.info('Registering document on blockchain', {
                documentHash: request.documentHash,
                documentId: request.documentId,
                userId: request.userId,
            });

            const payload = {
                document_hash: request.documentHash,
                document_id: request.documentId,
                user_id: request.userId,
                organization_id: request.organizationId,
                metadata: request.metadata,
                webhook_url: request.webhookUrl,
                network: this.config.network,
                contract_address: this.config.contractAddress,
            };

            const response: AxiosResponse<DocumentRegistrationResponse> = await this.client.post(
                '/api/v1/documents/register',
                payload
            );

            logger.info('Document registered on blockchain successfully', {
                documentId: request.documentId,
                transactionHash: response.data.transactionHash,
                status: response.data.status,
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to register document on blockchain', {
                error: error.message,
                documentId: request.documentId,
                stack: error.stack,
            });
            throw new Error(`Blockchain registration failed: ${error.message}`);
        }
    }

    /**
     * Get transaction status
     */
    async getTransactionStatus(transactionHash: string): Promise<TransactionStatusResponse> {
        try {
            logger.info('Getting blockchain transaction status', { transactionHash });

            const response: AxiosResponse<TransactionStatusResponse> = await this.client.get(
                `/api/v1/transactions/${transactionHash}/status`
            );

            logger.info('Blockchain transaction status retrieved', {
                transactionHash,
                status: response.data.status,
                confirmations: response.data.confirmations,
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to get blockchain transaction status', {
                error: error.message,
                transactionHash,
                stack: error.stack,
            });
            throw new Error(`Failed to get transaction status: ${error.message}`);
        }
    }

    /**
     * Verify document on blockchain
     */
    async verifyDocument(documentHash: string): Promise<{
        exists: boolean;
        transactionHash?: string;
        blockNumber?: number;
        timestamp?: Date;
        metadata?: any;
    }> {
        try {
            logger.info('Verifying document on blockchain', { documentHash });

            const response = await this.client.get(
                `/api/v1/documents/${documentHash}/verify`
            );

            logger.info('Document verification completed', {
                documentHash,
                exists: response.data.exists,
                transactionHash: response.data.transactionHash,
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to verify document on blockchain', {
                error: error.message,
                documentHash,
                stack: error.stack,
            });
            throw new Error(`Document verification failed: ${error.message}`);
        }
    }

    /**
     * Generate verification certificate
     */
    async generateCertificate(request: CertificateRequest): Promise<CertificateResponse> {
        try {
            logger.info('Generating verification certificate', {
                documentId: request.documentId,
                transactionHash: request.transactionHash,
            });

            const payload = {
                document_id: request.documentId,
                transaction_hash: request.transactionHash,
                verification_results: request.verificationResults,
                network: this.config.network,
            };

            const response: AxiosResponse<CertificateResponse> = await this.client.post(
                '/api/v1/certificates/generate',
                payload
            );

            logger.info('Verification certificate generated successfully', {
                documentId: request.documentId,
                certificateId: response.data.certificateId,
                certificateHash: response.data.certificateHash,
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to generate verification certificate', {
                error: error.message,
                documentId: request.documentId,
                stack: error.stack,
            });
            throw new Error(`Certificate generation failed: ${error.message}`);
        }
    }

    /**
     * Get certificate by ID
     */
    async getCertificate(certificateId: string): Promise<any> {
        try {
            logger.info('Getting verification certificate', { certificateId });

            const response = await this.client.get(
                `/api/v1/certificates/${certificateId}`
            );

            return response.data;
        } catch (error: any) {
            logger.error('Failed to get verification certificate', {
                error: error.message,
                certificateId,
                stack: error.stack,
            });
            throw new Error(`Failed to get certificate: ${error.message}`);
        }
    }

    /**
     * Get blockchain network information
     */
    async getNetworkInfo(): Promise<{
        network: string;
        blockNumber: number;
        gasPrice: string;
        isConnected: boolean;
    }> {
        try {
            const response = await this.client.get('/api/v1/network/info');
            return response.data;
        } catch (error: any) {
            logger.error('Failed to get blockchain network info', { error: error.message });
            throw new Error(`Failed to get network info: ${error.message}`);
        }
    }

    /**
     * Process webhook callback from blockchain service
     */
    processWebhookCallback(payload: any): {
        transactionHash: string;
        status: string;
        blockNumber?: number;
        confirmations?: number;
        error?: string;
    } {
        try {
            logger.info('Processing blockchain webhook callback', { payload });

            const { transaction_hash, status, block_number, confirmations, error } = payload;

            if (!transaction_hash) {
                throw new Error('Missing transaction_hash in webhook payload');
            }

            return {
                transactionHash: transaction_hash,
                status,
                blockNumber: block_number,
                confirmations,
                error,
            };
        } catch (error: any) {
            logger.error('Failed to process blockchain webhook callback', {
                error: error.message,
                payload,
            });
            throw error;
        }
    }

    /**
     * Retry operation with exponential backoff
     */
    async retryWithBackoff<T>(
        operation: () => Promise<T>,
        maxRetries: number = this.config.maxRetries,
        delay: number = this.config.retryDelay
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;

                if (attempt === maxRetries) {
                    break;
                }

                const backoffDelay = delay * Math.pow(2, attempt - 1);
                logger.warn(`Blockchain operation failed, retrying in ${backoffDelay}ms`, {
                    attempt,
                    maxRetries,
                    error: error.message,
                });

                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }

        throw lastError!;
    }

    /**
     * Health check for blockchain service
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/api/v1/health');
            return response.status === 200;
        } catch (error) {
            logger.error('Blockchain service health check failed', { error });
            return false;
        }
    }

    /**
     * Convert blockchain results to verification model format
     */
    convertToVerificationResults(
        registrationResponse: DocumentRegistrationResponse,
        statusResponse?: TransactionStatusResponse
    ): BlockchainResults {
        return {
            transactionHash: registrationResponse.transactionHash,
            blockNumber: statusResponse?.blockNumber,
            blockHash: statusResponse?.blockHash,
            gasUsed: statusResponse?.gasUsed,
            gasPrice: statusResponse?.gasPrice,
            timestamp: statusResponse?.timestamp || new Date(),
            confirmations: statusResponse?.confirmations || 0,
            status: statusResponse?.status || registrationResponse.status,
            network: this.config.network,
            contractAddress: this.config.contractAddress,
        };
    }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService;