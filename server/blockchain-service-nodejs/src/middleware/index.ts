// Authentication middleware
export {
    authenticateToken,
    authenticateToken as authenticate, // Alias for backward compatibility
    optionalAuth,
    requireRole,
    requirePermission,
    JwtUtils,
    type JwtPayload,
    type TokenPair,
    type AuthenticatedRequest,
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
    validate,
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

// API versioning middleware
export {
    apiVersioning,
    versionDeprecation,
    backwardCompatibility,
    versionedHandler,
    type VersionedRequest,
} from './versioning';

// API monitoring middleware
export {
    apiMonitoring,
    getApiMetrics,
    getRealTimeStats,
    getMonitoringHealth,
} from './monitoring';