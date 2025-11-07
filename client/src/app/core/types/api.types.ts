import { z } from 'zod';

// Error Types
export enum ErrorType {
    NETWORK_ERROR = 'NETWORK_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    SERVER_ERROR = 'SERVER_ERROR',
    RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Validation Error Interface
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
    code?: string;
}

// Enhanced API Error Interface
export interface ApiError {
    type: ErrorType;
    code: string;
    message: string;
    details?: ValidationError[];
    timestamp: string;
    requestId?: string;
    retryAfter?: number;
    statusCode?: number;
    originalError?: any;
}

// API Response Interface
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: ApiError;
    timestamp: string;
    requestId: string;
}

// Request Options Interface
export interface RequestOptions {
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    priority?: RequestPriority;
    skipAuth?: boolean;
    skipErrorHandling?: boolean;
    signal?: AbortSignal;
    headers?: Record<string, string>;
    params?: Record<string, any>;
}

// Request Priority Enum
export enum RequestPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}

// Batch Request Interface
export interface BatchRequest {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    endpoint: string;
    data?: any;
    options?: RequestOptions;
}

// Batch Response Interface
export interface BatchResponse<T> {
    results: Array<{
        id: string;
        success: boolean;
        data?: T;
        error?: ApiError;
    }>;
    timestamp: string;
    requestId: string;
}

// Upload Progress Interface
export interface UploadProgress<T> {
    loaded: number;
    total: number;
    percentage: number;
    data?: T;
    completed: boolean;
}

// Request Configuration Interface
export interface ApiServiceConfig {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    maxConcurrentRequests: number;
    enableRequestDeduplication: boolean;
    enableOfflineQueue: boolean;
}

// Zod Schemas for Runtime Validation
export const ApiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    error: z.object({
        type: z.nativeEnum(ErrorType),
        code: z.string(),
        message: z.string(),
        details: z.array(z.object({
            field: z.string(),
            message: z.string(),
            value: z.any().optional(),
            code: z.string().optional()
        })).optional(),
        timestamp: z.string(),
        requestId: z.string().optional(),
        retryAfter: z.number().optional(),
        statusCode: z.number().optional()
    }).optional(),
    timestamp: z.string(),
    requestId: z.string()
});

export const ValidationErrorSchema = z.object({
    field: z.string(),
    message: z.string(),
    value: z.any().optional(),
    code: z.string().optional()
});

export const ApiErrorSchema = z.object({
    type: z.nativeEnum(ErrorType),
    code: z.string(),
    message: z.string(),
    details: z.array(ValidationErrorSchema).optional(),
    timestamp: z.string(),
    requestId: z.string().optional(),
    retryAfter: z.number().optional(),
    statusCode: z.number().optional(),
    originalError: z.any().optional()
});