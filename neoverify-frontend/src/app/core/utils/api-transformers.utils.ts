import { z } from 'zod';
import { ApiUtils } from './api.utils';
import { ApiError, ErrorType } from '../types/api.types';

/**
 * Generic request transformer
 */
export class RequestTransformer {
    /**
     * Transform request data before sending to API
     */
    static transform<T>(data: T, schema?: z.ZodSchema<T>): T {
        if (!data) return data;

        // Validate against schema if provided
        if (schema) {
            try {
                return schema.parse(data);
            } catch (error: any) {
                throw {
                    type: ErrorType.VALIDATION_ERROR,
                    code: 'REQUEST_VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: error.errors?.map((err: any) => ({
                        field: err.path?.join('.') || 'unknown',
                        message: err.message,
                        value: err.received
                    })),
                    timestamp: new Date().toISOString()
                } as ApiError;
            }
        }

        // Transform dates to ISO strings
        return this.transformDates(data);
    }

    /**
     * Transform Date objects to ISO strings recursively
     */
    private static transformDates<T>(obj: T): T {
        if (obj === null || obj === undefined) return obj;

        if (obj instanceof Date) {
            return obj.toISOString() as unknown as T;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.transformDates(item)) as unknown as T;
        }

        if (typeof obj === 'object') {
            const transformed: any = {};
            for (const [key, value] of Object.entries(obj)) {
                transformed[key] = this.transformDates(value);
            }
            return transformed;
        }

        return obj;
    }

    /**
     * Transform FormData for file uploads
     */
    static transformFormData(data: Record<string, any>): FormData {
        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
            if (value instanceof File) {
                formData.append(key, value);
            } else if (value instanceof FileList) {
                Array.from(value).forEach((file, index) => {
                    formData.append(`${key}[${index}]`, file);
                });
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        formData.append(`${key}[${index}]`, JSON.stringify(item));
                    } else {
                        formData.append(`${key}[${index}]`, String(item));
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                formData.append(key, JSON.stringify(value));
            } else if (value !== null && value !== undefined) {
                formData.append(key, String(value));
            }
        });

        return formData;
    }

    /**
     * Sanitize and validate query parameters
     */
    static transformQueryParams(params: Record<string, any>): Record<string, string> {
        const sanitized: Record<string, string> = {};

        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                if (value instanceof Date) {
                    sanitized[key] = value.toISOString();
                } else if (Array.isArray(value)) {
                    sanitized[key] = value.join(',');
                } else if (typeof value === 'object') {
                    sanitized[key] = JSON.stringify(value);
                } else {
                    sanitized[key] = String(value);
                }
            }
        });

        return sanitized;
    }
}

/**
 * Generic response transformer
 */
export class ResponseTransformer {
    /**
     * Transform API response data
     */
    static transform<T>(data: unknown, schema?: z.ZodSchema<T>): T {
        if (!data) return data as T;

        // Validate against schema if provided
        if (schema) {
            return ApiUtils.validateResponse(data, schema);
        }

        // Transform ISO strings to Date objects
        return this.transformDates(data) as T;
    }

    /**
     * Transform ISO date strings to Date objects recursively
     */
    private static transformDates(obj: unknown): unknown {
        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'string' && this.isISODateString(obj)) {
            return new Date(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.transformDates(item));
        }

        if (typeof obj === 'object') {
            const transformed: any = {};
            for (const [key, value] of Object.entries(obj)) {
                transformed[key] = this.transformDates(value);
            }
            return transformed;
        }

        return obj;
    }

    /**
     * Check if string is a valid ISO date string
     */
    private static isISODateString(value: string): boolean {
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        return isoDateRegex.test(value) && !isNaN(Date.parse(value));
    }

    /**
     * Transform paginated response
     */
    static transformPaginatedResponse<T>(
        data: unknown,
        itemSchema?: z.ZodSchema<T>
    ): { items: T[]; total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean } {
        const response = data as any;

        if (!response || typeof response !== 'object') {
            throw {
                type: ErrorType.VALIDATION_ERROR,
                code: 'INVALID_PAGINATED_RESPONSE',
                message: 'Invalid paginated response format',
                timestamp: new Date().toISOString()
            } as ApiError;
        }

        const items = Array.isArray(response.items) ? response.items : [];
        const transformedItems = itemSchema
            ? items.map(item => this.transform(item, itemSchema))
            : items.map(item => this.transformDates(item)) as T[];

        return {
            items: transformedItems,
            total: response.total || 0,
            page: response.page || 1,
            limit: response.limit || 10,
            totalPages: response.totalPages || 0,
            hasNext: response.hasNext || false,
            hasPrev: response.hasPrev || false
        };
    }

    /**
     * Transform file download response
     */
    static transformFileResponse(response: any): Blob {
        if (response instanceof Blob) {
            return response;
        }

        if (response instanceof ArrayBuffer) {
            return new Blob([response]);
        }

        if (typeof response === 'string') {
            return new Blob([response], { type: 'text/plain' });
        }

        throw {
            type: ErrorType.VALIDATION_ERROR,
            code: 'INVALID_FILE_RESPONSE',
            message: 'Invalid file response format',
            timestamp: new Date().toISOString()
        } as ApiError;
    }

    /**
     * Extract file information from response headers
     */
    static extractFileInfo(headers: Headers): {
        filename?: string;
        contentType?: string;
        size?: number;
    } {
        const contentDisposition = headers.get('content-disposition');
        const contentType = headers.get('content-type');
        const contentLength = headers.get('content-length');

        let filename: string | undefined;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }

        return {
            filename,
            contentType: contentType || undefined,
            size: contentLength ? parseInt(contentLength, 10) : undefined
        };
    }
}

/**
 * Endpoint-specific transformers
 */
export class EndpointTransformers {
    /**
     * Transform document upload request
     */
    static transformDocumentUpload(file: File, metadata?: any): FormData {
        const formData = new FormData();
        formData.append('file', file);

        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (typeof value === 'object') {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });
        }

        return formData;
    }

    /**
     * Transform user avatar upload request
     */
    static transformAvatarUpload(file: File): FormData {
        const formData = new FormData();
        formData.append('avatar', file);
        return formData;
    }

    /**
     * Transform search/filter parameters
     */
    static transformSearchParams(filters: Record<string, any>): Record<string, string> {
        const params: Record<string, string> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value) && value.length > 0) {
                    params[key] = value.join(',');
                } else if (value instanceof Date) {
                    params[key] = value.toISOString();
                } else if (typeof value === 'boolean') {
                    params[key] = value.toString();
                } else if (typeof value === 'number') {
                    params[key] = value.toString();
                } else if (typeof value === 'string' && value.trim() !== '') {
                    params[key] = value.trim();
                }
            }
        });

        return params;
    }

    /**
     * Transform pagination parameters
     */
    static transformPaginationParams(page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Record<string, string> {
        const params: Record<string, string> = {};

        if (page !== undefined && page > 0) {
            params.page = page.toString();
        }

        if (limit !== undefined && limit > 0) {
            params.limit = limit.toString();
        }

        if (sortBy) {
            params.sortBy = sortBy;
        }

        if (sortOrder) {
            params.sortOrder = sortOrder;
        }

        return params;
    }
}

/**
 * Type-safe transformer factory
 */
export class TypedTransformer {
    /**
     * Create a typed request transformer
     */
    static createRequestTransformer<T>(schema: z.ZodSchema<T>) {
        return (data: T): T => RequestTransformer.transform(data, schema);
    }

    /**
     * Create a typed response transformer
     */
    static createResponseTransformer<T>(schema: z.ZodSchema<T>) {
        return (data: unknown): T => ResponseTransformer.transform(data, schema);
    }

    /**
     * Create a typed paginated response transformer
     */
    static createPaginatedResponseTransformer<T>(itemSchema: z.ZodSchema<T>) {
        return (data: unknown) => ResponseTransformer.transformPaginatedResponse(data, itemSchema);
    }
}