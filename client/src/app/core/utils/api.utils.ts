/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, timer, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ApiError, ErrorType, ValidationError } from '../types/api.types';

export class ApiUtils {
    /**
     * Transform HTTP error to standardized API error
     */
    static transformError(error: HttpErrorResponse, requestId?: string): ApiError {
        const timestamp = new Date().toISOString();

        // Network/Client errors
        if (error.error instanceof ErrorEvent) {
            return {
                type: ErrorType.NETWORK_ERROR,
                code: 'NETWORK_ERROR',
                message: 'Network connection failed. Please check your internet connection.',
                timestamp,
                requestId,
                statusCode: 0,
                originalError: error
            };
        }

        // Server errors
        const statusCode = error.status;
        let apiError: ApiError;
        const retryAfter = this.extractRetryAfter(error);

        switch (statusCode) {
            case 400:
                apiError = {
                    type: ErrorType.VALIDATION_ERROR,
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: this.extractValidationErrors(error.error),
                    timestamp,
                    requestId,
                    statusCode,
                    originalError: error
                };
                break;

            case 401:
                apiError = {
                    type: ErrorType.AUTHENTICATION_ERROR,
                    code: 'AUTHENTICATION_ERROR',
                    message: 'Authentication required. Please log in.',
                    timestamp,
                    requestId,
                    statusCode,
                    originalError: error
                };
                break;

            case 403:
                apiError = {
                    type: ErrorType.AUTHORIZATION_ERROR,
                    code: 'AUTHORIZATION_ERROR',
                    message: 'Access denied. You do not have permission to perform this action.',
                    timestamp,
                    requestId,
                    statusCode,
                    originalError: error
                };
                break;

            case 408:
                apiError = {
                    type: ErrorType.TIMEOUT_ERROR,
                    code: 'TIMEOUT_ERROR',
                    message: 'Request timeout. Please try again.',
                    timestamp,
                    requestId,
                    statusCode,
                    originalError: error
                };
                break;

            case 429:

                apiError = {
                    type: ErrorType.RATE_LIMIT_ERROR,
                    code: 'RATE_LIMIT_ERROR',
                    message: `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
                    retryAfter,
                    timestamp,
                    requestId,
                    statusCode,
                    originalError: error
                };
                break;

            case 500:
            case 502:
            case 503:
            case 504:
                apiError = {
                    type: ErrorType.SERVER_ERROR,
                    code: 'SERVER_ERROR',
                    message: 'Server error occurred. Please try again later.',
                    timestamp,
                    requestId,
                    statusCode,
                    originalError: error
                };
                break;

            default:
                apiError = {
                    type: ErrorType.UNKNOWN_ERROR,
                    code: 'UNKNOWN_ERROR',
                    message: error.error?.message || 'An unexpected error occurred',
                    timestamp,
                    requestId,
                    statusCode,
                    originalError: error
                };
        }

        return apiError;
    }

    /**
     * Extract validation errors from error response
     */
    private static extractValidationErrors(errorBody: any): ValidationError[] | undefined {
        if (!errorBody) return undefined;

        // Handle different error response formats
        if (errorBody.errors && Array.isArray(errorBody.errors)) {
            return errorBody.errors.map((err: any) => ({
                field: err.field || err.path || 'unknown',
                message: err.message || err.msg || 'Validation error',
                value: err.value,
                code: err.code
            }));
        }

        if (errorBody.details && Array.isArray(errorBody.details)) {
            return errorBody.details;
        }

        return undefined;
    }

    /**
     * Extract retry-after header value
     */
    private static extractRetryAfter(error: HttpErrorResponse): number {
        const retryAfterHeader = error.headers.get('Retry-After');
        if (retryAfterHeader) {
            const retryAfter = parseInt(retryAfterHeader, 10);
            return isNaN(retryAfter) ? 60 : retryAfter;
        }
        return 60; // Default to 60 seconds
    }

    /**
     * Implement exponential backoff retry logic
     */
    static retryWithExponentialBackoff<T>(
        source: Observable<T>,
        // maxRetries: number = 3,
        initialDelay: number = 1000,
        maxDelay: number = 30000
    ): Observable<T> {
        return source.pipe(
            mergeMap((value, index) => {
                if (index === 0) {
                    return [value];
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(initialDelay * Math.pow(2, index - 1), maxDelay);

                return timer(delay).pipe(
                    mergeMap(() => [value])
                );
            })
        );
    }

    /**
     * Check if error is retryable
     */
    static isRetryableError(error: ApiError): boolean {
        const retryableTypes = [
            ErrorType.NETWORK_ERROR,
            ErrorType.TIMEOUT_ERROR,
            ErrorType.SERVER_ERROR
        ];

        const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

        return retryableTypes.includes(error.type) ||
            (error.statusCode !== undefined && retryableStatusCodes.includes(error.statusCode));
    }

    /**
     * Generate unique request ID
     */
    static generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create timeout observable
     */
    static createTimeoutObservable(timeoutMs: number): Observable<never> {
        return timer(timeoutMs).pipe(
            mergeMap(() => throwError(() => ({
                type: ErrorType.TIMEOUT_ERROR,
                code: 'TIMEOUT_ERROR',
                message: `Request timeout after ${timeoutMs}ms`,
                timestamp: new Date().toISOString()
            } as ApiError)))
        );
    }

    /**
     * Sanitize URL parameters
     */
    static sanitizeParams(params: Record<string, any>): Record<string, string> {
        const sanitized: Record<string, string> = {};

        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                sanitized[key] = String(value);
            }
        });

        return sanitized;
    }

    /**
     * Build query string from parameters
     */
    static buildQueryString(params: Record<string, any>): string {
        const sanitized = this.sanitizeParams(params);
        const searchParams = new URLSearchParams(sanitized);
        return searchParams.toString();
    }

    /**
     * Validate response data against schema
     */
    static validateResponse<T>(data: unknown, schema: any): T {
        try {
            return schema.parse(data);
        } catch (error: any) {
            throw {
                type: ErrorType.VALIDATION_ERROR,
                code: 'RESPONSE_VALIDATION_ERROR',
                message: 'Invalid response format from server',
                details: error.errors?.map((err: any) => ({
                    field: err.path?.join('.') || 'unknown',
                    message: err.message,
                    value: err.received
                })),
                timestamp: new Date().toISOString()
            } as ApiError;
        }
    }
}
