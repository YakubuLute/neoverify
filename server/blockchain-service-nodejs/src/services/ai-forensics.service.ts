import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import  logger  from '../utils/logger';
import { AIForensicsResults } from '../models/Verification';

// AI Forensics API configuration
interface AIForensicsConfig {
    baseUrl: string;
    apiKey: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
}

// AI Forensics job submission request
interface AIForensicsJobRequest {
    documentPath: string;
    documentType: string;
    analysisType: 'full' | 'quick' | 'signature' | 'text' | 'image';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    webhookUrl?: string;
    metadata?: {
        userId: string;
        documentId: string;
        organizationId?: string;
    };
}

// AI Forensics job response
interface AIForensicsJobResponse {
    jobId: string;
    status: 'submitted' | 'processing' | 'completed' | 'failed';
    estimatedCompletionTime?: string;
    message?: string;
}

// AI Forensics status response
interface AIForensicsStatusResponse {
    jobId: string;
    status: 'submitted' | 'processing' | 'completed' | 'failed';
    progress: number; // 0-100
    results?: AIForensicsResults;
    error?: string;
    completedAt?: string;
}

class AIForensicsService {
    private client: AxiosInstance;
    private config: AIForensicsConfig;

    constructor() {
        this.config = {
            baseUrl: process.env.AI_FORENSICS_API_URL || 'http://localhost:8000',
            apiKey: process.env.AI_FORENSICS_API_KEY || '',
            timeout: parseInt(process.env.AI_FORENSICS_TIMEOUT || '300000'), // 5 minutes
            maxRetries: parseInt(process.env.AI_FORENSICS_MAX_RETRIES || '3'),
            retryDelay: parseInt(process.env.AI_FORENSICS_RETRY_DELAY || '5000'), // 5 seconds
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
                logger.info('AI Forensics API Request', {
                    method: config.method,
                    url: config.url,
                    headers: config.headers,
                });
                return config;
            },
            (error) => {
                logger.error('AI Forensics API Request Error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging and error handling
        this.client.interceptors.response.use(
            (response) => {
                logger.info('AI Forensics API Response', {
                    status: response.status,
                    url: response.config.url,
                    data: response.data,
                });
                return response;
            },
            (error) => {
                logger.error('AI Forensics API Response Error', {
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
     * Submit a document for AI forensics analysis
     */
    async submitDocument(request: AIForensicsJobRequest): Promise<AIForensicsJobResponse> {
        try {
            logger.info('Submitting document for AI forensics analysis', {
                documentPath: request.documentPath,
                documentType: request.documentType,
                analysisType: request.analysisType,
                priority: request.priority,
            });

            // Check if file exists
            if (!fs.existsSync(request.documentPath)) {
                throw new Error(`Document file not found: ${request.documentPath}`);
            }

            // Create form data for file upload
            const formData = new FormData();
            formData.append('file', fs.createReadStream(request.documentPath));
            formData.append('document_type', request.documentType);
            formData.append('analysis_type', request.analysisType);
            formData.append('priority', request.priority);

            if (request.webhookUrl) {
                formData.append('webhook_url', request.webhookUrl);
            }

            if (request.metadata) {
                formData.append('metadata', JSON.stringify(request.metadata));
            }

            const response: AxiosResponse<AIForensicsJobResponse> = await this.client.post(
                '/api/v1/analyze',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${this.config.apiKey}`,
                    },
                }
            );

            logger.info('Document submitted successfully for AI forensics analysis', {
                jobId: response.data.jobId,
                status: response.data.status,
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to submit document for AI forensics analysis', {
                error: error.message,
                documentPath: request.documentPath,
                stack: error.stack,
            });
            throw new Error(`AI Forensics submission failed: ${error.message}`);
        }
    }

    /**
     * Get the status of an AI forensics job
     */
    async getJobStatus(jobId: string): Promise<AIForensicsStatusResponse> {
        try {
            logger.info('Getting AI forensics job status', { jobId });

            const response: AxiosResponse<AIForensicsStatusResponse> = await this.client.get(
                `/api/v1/jobs/${jobId}/status`
            );

            logger.info('AI forensics job status retrieved', {
                jobId,
                status: response.data.status,
                progress: response.data.progress,
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to get AI forensics job status', {
                error: error.message,
                jobId,
                stack: error.stack,
            });
            throw new Error(`Failed to get job status: ${error.message}`);
        }
    }

    /**
     * Get the results of a completed AI forensics job
     */
    async getJobResults(jobId: string): Promise<AIForensicsResults> {
        try {
            logger.info('Getting AI forensics job results', { jobId });

            const response: AxiosResponse<{ results: AIForensicsResults }> = await this.client.get(
                `/api/v1/jobs/${jobId}/results`
            );

            logger.info('AI forensics job results retrieved', {
                jobId,
                authenticity: response.data.results.authenticity,
                tampering: response.data.results.tampering,
                confidence: response.data.results.confidence,
            });

            return response.data.results;
        } catch (error: any) {
            logger.error('Failed to get AI forensics job results', {
                error: error.message,
                jobId,
                stack: error.stack,
            });
            throw new Error(`Failed to get job results: ${error.message}`);
        }
    }

    /**
     * Cancel an AI forensics job
     */
    async cancelJob(jobId: string): Promise<boolean> {
        try {
            logger.info('Cancelling AI forensics job', { jobId });

            await this.client.delete(`/api/v1/jobs/${jobId}`);

            logger.info('AI forensics job cancelled successfully', { jobId });
            return true;
        } catch (error: any) {
            logger.error('Failed to cancel AI forensics job', {
                error: error.message,
                jobId,
                stack: error.stack,
            });
            return false;
        }
    }

    /**
     * Retry a failed AI forensics job with exponential backoff
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
                logger.warn(`AI Forensics operation failed, retrying in ${backoffDelay}ms`, {
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
     * Health check for AI forensics service
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/api/v1/health');
            return response.status === 200;
        } catch (error) {
            logger.error('AI Forensics service health check failed', { error });
            return false;
        }
    }

    /**
     * Get service information and capabilities
     */
    async getServiceInfo(): Promise<any> {
        try {
            const response = await this.client.get('/api/v1/info');
            return response.data;
        } catch (error: any) {
            logger.error('Failed to get AI Forensics service info', { error: error.message });
            throw new Error(`Failed to get service info: ${error.message}`);
        }
    }

    /**
     * Process webhook callback from AI forensics service
     */
    processWebhookCallback(payload: any): {
        jobId: string;
        status: string;
        results?: AIForensicsResults;
        error?: string;
    } {
        try {
            logger.info('Processing AI forensics webhook callback', { payload });

            const { job_id, status, results, error } = payload;

            if (!job_id) {
                throw new Error('Missing job_id in webhook payload');
            }

            return {
                jobId: job_id,
                status,
                results,
                error,
            };
        } catch (error: any) {
            logger.error('Failed to process AI forensics webhook callback', {
                error: error.message,
                payload,
            });
            throw error;
        }
    }

    /**
     * Validate AI forensics results
     */
    validateResults(results: AIForensicsResults): boolean {
        try {
            // Check required fields
            if (!results.jobId || typeof results.authenticity !== 'number' ||
                typeof results.tampering !== 'number' || typeof results.confidence !== 'number') {
                return false;
            }

            // Check score ranges
            if (results.authenticity < 0 || results.authenticity > 100 ||
                results.tampering < 0 || results.tampering > 100 ||
                results.confidence < 0 || results.confidence > 100) {
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Failed to validate AI forensics results', { error, results });
            return false;
        }
    }
}

// Export singleton instance
export const aiForensicsService = new AIForensicsService();
export default aiForensicsService;