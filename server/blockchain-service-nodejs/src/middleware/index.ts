// Authentication middleware
export {
    authenticateToken,
    optionalAuth,
    requireRole,
    requirePermission,
    JwtUtils,
    type JwtPayload,
    type TokenPair,
} from './auth';

// Error handling middleware
export {
    globalErrorHandler,
    requestId,
    requestLogger,
    formatValidationErrors,
    asyncHandler,
    notFoundHandler,
    gracefulShutdown,
    setupProcessHandlers,
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ExternalServiceError,
} from './errorHandler';

// File upload middleware
export {
    uploadSingle,
    uploadMultiple,
    secureUploadSingle,
    secureUploadMultiple,
    ensureUploadDirectories,
    cleanupTempFiles,
    uploadConfig,
} from './upload';

// Validation middleware
export {
    validateDocumentUpload,
    validateDocumentUpdate,
    validateDocumentListing,
    validateDocumentId,
    validateBulkOperations,
    validateDocumentSharing,
    validateDocumentSearch,
    validateDocumentVerification,
    validateFileSize,
    validateFileType,
} from './validation';