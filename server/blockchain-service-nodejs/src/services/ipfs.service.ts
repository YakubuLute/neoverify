import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { IPFSResults } from '../models/Verification';

// IPFS service configuration
interface IPFSConfig {
    baseUrl: string;
    apiKey?: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
    gateway: string;
    pinningService?: string;
}

// IPFS upload request
interface IPFSUploadRequest {
    filePath: string;
    filename: string;
    pin?: boolean;
    metadata?: {
        documentId: string;
        userId: string;
        organizationId?: string;
        mimeType: string;
        size: number;
    };
}

// IPFS upload response
interface IPFSUploadResponse {
    hash: string;
    size: number;
    name: string;
    pinned: boolean;
    gateway: string;
}

// IPFS pin request
interface IPFSPinRequest {
    hash: string;
    name?: string;
    metadata?: any;
}

// IPFS pin response
interface IPFSPinResponse {
    hash: string;
    status: 'pinned' | 'pinning' | 'failed';
    name?: string;
    size?: number;
}

// IPFS file info
interface IPFSFileInfo {
    hash: string;
    size: number;
    type: 'file' | 'directory';
    links?: Array<{
        name: string;
        hash: string;
        size: number;
    }>;
}

class IPFSService {
    private client: AxiosInstance;
    private config: IPFSConfig;

    constructor() {
        this.config = {
            baseUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
            apiKey: process.env.IPFS_API_KEY,
            timeout: parseInt(process.env.IPFS_TIMEOUT || '120000'), // 2 minutes
            maxRetries: parseInt(process.env.IPFS_MAX_RETRIES || '3'),
            retryDelay: parseInt(process.env.IPFS_RETRY_DELAY || '3000'), // 3 seconds
            gateway: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs',
            pinningService: process.env.IPFS_PINNING_SERVICE, // e.g., 'pinata', 'infura'
        };

        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers,
        });

        // Add request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                logger.info('IPFS API Request', {
                    method: config.method,
                    url: config.url,
                    headers: config.headers,
                });
                return config;
            },
            (error) => {
                logger.error('IPFS API Request Error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging and error handling
        this.client.interceptors.response.use(
            (response) => {
                logger.info('IPFS API Response', {
                    status: response.status,
                    url: response.config.url,
                    data: response.data,
                });
                return response;
            },
            (error) => {
                logger.error('IPFS API Response Error', {
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
     * Upload a file to IPFS
     */
    async uploadFile(request: IPFSUploadRequest): Promise<IPFSUploadResponse> {
        try {
            logger.info('Uploading file to IPFS', {
                filePath: request.filePath,
                filename: request.filename,
                pin: request.pin,
            });

            // Check if file exists
            if (!fs.existsSync(request.filePath)) {
                throw new Error(`File not found: ${request.filePath}`);
            }

            // Create form data for file upload
            const formData = new FormData();
            formData.append('file', fs.createReadStream(request.filePath), {
                filename: request.filename,
            });

            if (request.pin) {
                formData.append('pin', 'true');
            }

            if (request.metadata) {
                formData.append('metadata', JSON.stringify(request.metadata));
            }

            const response: AxiosResponse<IPFSUploadResponse> = await this.client.post(
                '/api/v0/add',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
                    },
                    params: {
                        pin: request.pin || false,
                        'wrap-with-directory': false,
                        progress: false,
                    },
                }
            );

            const result: IPFSUploadResponse = {
                hash: response.data.hash || (response.data as any).Hash,
                size: response.data.size || (response.data as any).Size,
                name: response.data.name || (response.data as any).Name || request.filename,
                pinned: request.pin || false,
                gateway: this.config.gateway,
            };

            logger.info('File uploaded to IPFS successfully', {
                filename: request.filename,
                hash: result.hash,
                size: result.size,
                pinned: result.pinned,
            });

            return result;
        } catch (error: any) {
            logger.error('Failed to upload file to IPFS', {
                error: error.message,
                filePath: request.filePath,
                stack: error.stack,
            });
            throw new Error(`IPFS upload failed: ${error.message}`);
        }
    }

    /**
     * Pin a file to IPFS
     */
    async pinFile(request: IPFSPinRequest): Promise<IPFSPinResponse> {
        try {
            logger.info('Pinning file to IPFS', {
                hash: request.hash,
                name: request.name,
            });

            const payload: any = {
                arg: request.hash,
            };

            if (request.name) {
                payload.name = request.name;
            }

            if (request.metadata) {
                payload.metadata = JSON.stringify(request.metadata);
            }

            const response = await this.client.post('/api/v0/pin/add', null, {
                params: payload,
            });

            const result: IPFSPinResponse = {
                hash: request.hash,
                status: 'pinned',
                name: request.name,
            };

            logger.info('File pinned to IPFS successfully', {
                hash: request.hash,
                name: request.name,
            });

            return result;
        } catch (error: any) {
            logger.error('Failed to pin file to IPFS', {
                error: error.message,
                hash: request.hash,
                stack: error.stack,
            });
            throw new Error(`IPFS pinning failed: ${error.message}`);
        }
    }

    /**
     * Unpin a file from IPFS
     */
    async unpinFile(hash: string): Promise<boolean> {
        try {
            logger.info('Unpinning file from IPFS', { hash });

            await this.client.post('/api/v0/pin/rm', null, {
                params: {
                    arg: hash,
                },
            });

            logger.info('File unpinned from IPFS successfully', { hash });
            return true;
        } catch (error: any) {
            logger.error('Failed to unpin file from IPFS', {
                error: error.message,
                hash,
                stack: error.stack,
            });
            return false;
        }
    }

    /**
     * Get file information from IPFS
     */
    async getFileInfo(hash: string): Promise<IPFSFileInfo> {
        try {
            logger.info('Getting file info from IPFS', { hash });

            const response = await this.client.post('/api/v0/object/stat', null, {
                params: {
                    arg: hash,
                },
            });

            const result: IPFSFileInfo = {
                hash,
                size: response.data.CumulativeSize || response.data.DataSize,
                type: response.data.NumLinks > 0 ? 'directory' : 'file',
                links: response.data.Links?.map((link: any) => ({
                    name: link.Name,
                    hash: link.Hash,
                    size: link.Size,
                })),
            };

            logger.info('File info retrieved from IPFS', {
                hash,
                size: result.size,
                type: result.type,
            });

            return result;
        } catch (error: any) {
            logger.error('Failed to get file info from IPFS', {
                error: error.message,
                hash,
                stack: error.stack,
            });
            throw new Error(`Failed to get file info: ${error.message}`);
        }
    }

    /**
     * Download a file from IPFS
     */
    async downloadFile(hash: string, outputPath: string): Promise<boolean> {
        try {
            logger.info('Downloading file from IPFS', { hash, outputPath });

            const response = await this.client.post('/api/v0/cat', null, {
                params: {
                    arg: hash,
                },
                responseType: 'stream',
            });

            const writer = fs.createWriteStream(outputPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    logger.info('File downloaded from IPFS successfully', {
                        hash,
                        outputPath,
                    });
                    resolve(true);
                });

                writer.on('error', (error) => {
                    logger.error('Failed to write downloaded file', {
                        error: error.message,
                        hash,
                        outputPath,
                    });
                    reject(error);
                });
            });
        } catch (error: any) {
            logger.error('Failed to download file from IPFS', {
                error: error.message,
                hash,
                outputPath,
                stack: error.stack,
            });
            throw new Error(`IPFS download failed: ${error.message}`);
        }
    }

    /**
     * Check if a file exists on IPFS
     */
    async fileExists(hash: string): Promise<boolean> {
        try {
            await this.getFileInfo(hash);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get gateway URL for a file
     */
    getGatewayUrl(hash: string): string {
        return `${this.config.gateway}/${hash}`;
    }

    /**
     * List pinned files
     */
    async listPinnedFiles(): Promise<Array<{
        hash: string;
        type: string;
    }>> {
        try {
            logger.info('Listing pinned files from IPFS');

            const response = await this.client.post('/api/v0/pin/ls', null, {
                params: {
                    type: 'recursive',
                },
            });

            const pins = response.data.Keys || {};
            const result = Object.keys(pins).map(hash => ({
                hash,
                type: pins[hash].Type,
            }));

            logger.info('Pinned files listed successfully', {
                count: result.length,
            });

            return result;
        } catch (error: any) {
            logger.error('Failed to list pinned files', {
                error: error.message,
                stack: error.stack,
            });
            throw new Error(`Failed to list pinned files: ${error.message}`);
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
                logger.warn(`IPFS operation failed, retrying in ${backoffDelay}ms`, {
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
     * Health check for IPFS service
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.post('/api/v0/version');
            return response.status === 200;
        } catch (error) {
            logger.error('IPFS service health check failed', { error });
            return false;
        }
    }

    /**
     * Convert IPFS results to verification model format
     */
    convertToVerificationResults(uploadResponse: IPFSUploadResponse): IPFSResults {
        return {
            hash: uploadResponse.hash,
            size: uploadResponse.size,
            timestamp: new Date(),
            gateway: this.config.gateway,
            pinned: uploadResponse.pinned,
            replicationNodes: [], // This would be populated by the IPFS network
        };
    }
}

// Export singleton instance
export const ipfsService = new IPFSService();
export default ipfsService;