import { Request, Response, NextFunction } from 'express';
import { ValidationError as ExpressValidationError } from 'express-validator';
import { ValidationError as SequelizeValidationError, DatabaseError } from 'sequelize';
import { config } from '../config';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Custom error classes
export class AppError extends Error {
    public statusCode: number;
    public code: string;
    public isOperational: boolean;
    public details?: any;

    constructor(message: string, statusCode: number, code: string, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 409, 'CONFLICT_ERROR', details);
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

export class ExternalServiceError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 503, 'EXTERNAL_SERVICE_ERROR', details);
    }
}

// Error response interface
interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
        requestId: string;
        stack?: string;
    };
}

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
    const id = uuidv4();
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-ID', id);
    next();
};

/**
 * Enhanced request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    // Log request start
    logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
    });

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function (body: any) {
        const duration = Date.now() - startTime;

        logger.info('Request completed', {
            requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            userId: req.user?.id,
            success: body?.success !== false,
        });

        return originalJson.call(this, body);
    };

    next();
};

/**
 * Validation error formatter middleware
 */
export const formatValidationErrors = (errors: ExpressValidationError[]): any => {
    const formattedErrors: Record<string, string[]> = {};

    errors.forEach((error) => {
        const field = error.type === 'field' ? error.path : 'general';
        if (!formattedErrors[field]) {
            formattedErrors[field] = [];
        }
        formattedErrors[field].push(error.msg);
    });

    return formattedErrors;
};

/**
 * Database error handler
 */
const handleDatabaseError = (error: DatabaseError): AppError => {
    logger.error('Database error:', {
        name: error.name,
        message: error.message,
        sql: error.sql,
        parameters: error.parameters,
    });

    // Handle specific database errors
    switch (error.name) {
        case 'SequelizeUniqueConstraintError':
            return new ConflictError('Resource already exists', {
                fields: (error as any).fields,
            });

        case 'SequelizeForeignKeyConstraintError':
            return new ValidationError('Invalid reference to related resource');

        case 'SequelizeValidationError':
            const validationError = error as SequelizeValidationError;
            const details = validationError.errors.reduce((acc, err) => {
                acc[err.path || 'general'] = err.message;
                return acc;
            }, {} as Record<string, string>);

            return new ValidationError('Validation failed', details);

        case 'SequelizeConnectionError':
        case 'SequelizeConnectionRefusedError':
        case 'SequelizeHostNotFoundError':
        case 'SequelizeHostNotReachableError':
            return new AppError(
                'Database connection failed',
                503,
                'DATABASE_CONNECTION_ERROR'
            );

        case 'SequelizeTimeoutError':
            return new AppError(
                'Database operation timed out',
                504,
                'DATABASE_TIMEOUT_ERROR'
            );

        default:
            return new AppError(
                'Database operation failed',
                500,
                'DATABASE_ERROR'
            );
    }
};

/**
 * JWT error handler
 */
const handleJWTError = (error: Error): AppError => {
    if (error.name === 'JsonWebTokenError') {
        return new AuthenticationError('Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
        return new AuthenticationError('Token expired');
    }

    if (error.name === 'NotBeforeError') {
        return new AuthenticationError('Token not active');
    }

    return new AuthenticationError('Token validation failed');
};

/**
 * Multer error handler
 */
const handleMulterError = (error: any): AppError => {
    switch (error.code) {
        case 'LIMIT_FILE_SIZE':
            return new ValidationError('File size exceeds limit');

        case 'LIMIT_FILE_COUNT':
            return new ValidationError('Too many files uploaded');

        case 'LIMIT_UNEXPECTED_FILE':
            return new ValidationError('Unexpected file field');

        case 'LIMIT_PART_COUNT':
            return new ValidationError('Too many parts in multipart data');

        default:
            return new ValidationError('File upload failed');
    }
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    let appError: AppError;

    // Handle different error types
    if (error instanceof AppError) {
        appError = error;
    } else if (error instanceof DatabaseError) {
        appError = handleDatabaseError(error);
    } else if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
        appError = handleJWTError(error);
    } else if (error.name === 'MulterError') {
        appError = handleMulterError(error);
    } else if (error.name === 'SyntaxError' && 'body' in error) {
        appError = new ValidationError('Invalid JSON in request body');
    } else {
        // Unknown error
        appError = new AppError(
            config.env === 'production' ? 'Internal server error' : error.message,
            500,
            'INTERNAL_SERVER_ERROR'
        );
    }

    // Log error
    logger.error('Error occurred:', {
        requestId,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: appError.code,
            statusCode: appError.statusCode,
        },
        request: {
            method: req.method,
            url: req.originalUrl,
            userId: req.user?.id,
            ip: req.ip,
        },
    });

    // Prepare error response
    const errorResponse: ErrorResponse = {
        success: false,
        error: {
            code: appError.code,
            message: appError.message,
            details: appError.details,
            timestamp: new Date().toISOString(),
            requestId,
        },
    };

    // Include stack trace in development
    if (config.env === 'development') {
        errorResponse.error.stack = error.stack;
    }

    res.status(appError.statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';

    res.status(404).json({
        success: false,
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            timestamp: new Date().toISOString(),
            requestId,
        },
    });
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = (server: any) => {
    const shutdown = (signal: string) => {
        logger.info(`${signal} received, shutting down gracefully`);

        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });

        // Force close after 30 seconds
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Unhandled rejection and exception handlers
 */
export const setupProcessHandlers = (): void => {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        logger.error('Unhandled Rejection at:', {
            promise,
            reason: reason?.stack || reason,
        });

        // Don't exit in production, just log
        if (config.env !== 'production') {
            process.exit(1);
        }
    });

    process.on('uncaughtException', (error: Error) => {
        logger.error('Uncaught Exception:', {
            error: error.message,
            stack: error.stack,
        });

        // Always exit on uncaught exception
        process.exit(1);
    });
};