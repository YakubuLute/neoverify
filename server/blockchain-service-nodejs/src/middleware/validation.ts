import { body, param, query } from 'express-validator';

/**
 * Validation rules for document upload
 */
export const validateDocumentUpload = [
    body('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Description must be a string with maximum 1000 characters'),

    body('tags')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                const tags = value.split(',').map(tag => tag.trim());
                if (tags.length > 20) {
                    throw new Error('Maximum 20 tags allowed');
                }
                if (tags.some(tag => tag.length > 50)) {
                    throw new Error('Each tag must be maximum 50 characters');
                }
                return true;
            }
            if (Array.isArray(value)) {
                if (value.length > 20) {
                    throw new Error('Maximum 20 tags allowed');
                }
                if (value.some(tag => typeof tag !== 'string' || tag.length > 50)) {
                    throw new Error('Each tag must be a string with maximum 50 characters');
                }
                return true;
            }
            throw new Error('Tags must be a string or array of strings');
        }),

    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean value'),
];

/**
 * Validation rules for document update
 */
export const validateDocumentUpdate = [
    param('id')
        .isUUID()
        .withMessage('Document ID must be a valid UUID'),

    body('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Description must be a string with maximum 1000 characters'),

    body('tags')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                const tags = value.split(',').map(tag => tag.trim());
                if (tags.length > 20) {
                    throw new Error('Maximum 20 tags allowed');
                }
                if (tags.some(tag => tag.length > 50)) {
                    throw new Error('Each tag must be maximum 50 characters');
                }
                return true;
            }
            if (Array.isArray(value)) {
                if (value.length > 20) {
                    throw new Error('Maximum 20 tags allowed');
                }
                if (value.some(tag => typeof tag !== 'string' || tag.length > 50)) {
                    throw new Error('Each tag must be a string with maximum 50 characters');
                }
                return true;
            }
            throw new Error('Tags must be a string or array of strings');
        }),

    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean value'),

    body('sharingSettings')
        .optional()
        .isObject()
        .withMessage('sharingSettings must be an object'),

    body('sharingSettings.isPublic')
        .optional()
        .isBoolean()
        .withMessage('sharingSettings.isPublic must be a boolean'),

    body('sharingSettings.allowDownload')
        .optional()
        .isBoolean()
        .withMessage('sharingSettings.allowDownload must be a boolean'),

    body('sharingSettings.expiresAt')
        .optional()
        .isISO8601()
        .withMessage('sharingSettings.expiresAt must be a valid ISO 8601 date'),

    body('sharingSettings.allowedEmails')
        .optional()
        .isArray()
        .withMessage('sharingSettings.allowedEmails must be an array'),

    body('sharingSettings.allowedEmails.*')
        .optional()
        .isEmail()
        .withMessage('Each email in allowedEmails must be valid'),
];

/**
 * Validation rules for document listing
 */
export const validateDocumentListing = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'originalName', 'size', 'verificationStatus'])
        .withMessage('sortBy must be one of: createdAt, updatedAt, originalName, size, verificationStatus'),

    query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('sortOrder must be ASC or DESC'),

    query('search')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Search query must be a string with maximum 100 characters'),

    query('documentType')
        .optional()
        .isIn(['pdf', 'image', 'word', 'excel', 'powerpoint', 'text', 'other'])
        .withMessage('documentType must be one of: pdf, image, word, excel, powerpoint, text, other'),

    query('verificationStatus')
        .optional()
        .isIn(['pending', 'in_progress', 'completed', 'failed', 'cancelled'])
        .withMessage('verificationStatus must be one of: pending, in_progress, completed, failed, cancelled'),

    query('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean value'),

    query('tags')
        .optional()
        .isString()
        .withMessage('tags must be a comma-separated string'),

    query('dateFrom')
        .optional()
        .isISO8601()
        .withMessage('dateFrom must be a valid ISO 8601 date'),

    query('dateTo')
        .optional()
        .isISO8601()
        .withMessage('dateTo must be a valid ISO 8601 date'),
];

/**
 * Validation rules for document ID parameter
 */
export const validateDocumentId = [
    param('id')
        .isUUID()
        .withMessage('Document ID must be a valid UUID'),
];

/**
 * Validation rules for bulk operations
 */
export const validateBulkOperations = [
    body('operation')
        .isIn(['delete', 'update'])
        .withMessage('operation must be one of: delete, update'),

    body('documentIds')
        .isArray({ min: 1, max: 50 })
        .withMessage('documentIds must be an array with 1-50 items'),

    body('documentIds.*')
        .isUUID()
        .withMessage('Each document ID must be a valid UUID'),

    body('data')
        .if(body('operation').equals('update'))
        .isObject()
        .withMessage('data is required for update operations and must be an object'),

    body('data.tags')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                const tags = value.split(',').map(tag => tag.trim());
                if (tags.length > 20) {
                    throw new Error('Maximum 20 tags allowed');
                }
                if (tags.some(tag => tag.length > 50)) {
                    throw new Error('Each tag must be maximum 50 characters');
                }
                return true;
            }
            if (Array.isArray(value)) {
                if (value.length > 20) {
                    throw new Error('Maximum 20 tags allowed');
                }
                if (value.some(tag => typeof tag !== 'string' || tag.length > 50)) {
                    throw new Error('Each tag must be a string with maximum 50 characters');
                }
                return true;
            }
            throw new Error('Tags must be a string or array of strings');
        }),

    body('data.isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean value'),
];

/**
 * Validation rules for document sharing
 */
export const validateDocumentSharing = [
    param('id')
        .isUUID()
        .withMessage('Document ID must be a valid UUID'),

    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean value'),

    body('allowDownload')
        .optional()
        .isBoolean()
        .withMessage('allowDownload must be a boolean value'),

    body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('expiresAt must be a valid ISO 8601 date')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('expiresAt must be in the future');
            }
            return true;
        }),

    body('password')
        .optional()
        .isString()
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters'),

    body('allowedEmails')
        .optional()
        .isArray({ max: 50 })
        .withMessage('allowedEmails must be an array with maximum 50 emails'),

    body('allowedEmails.*')
        .isEmail()
        .withMessage('Each email must be valid'),
];

/**
 * Validation rules for document search
 */
export const validateDocumentSearch = [
    query('q')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query (q) is required and must be 1-100 characters'),

    query('type')
        .optional()
        .isIn(['content', 'filename', 'tags', 'metadata'])
        .withMessage('Search type must be one of: content, filename, tags, metadata'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
];

/**
 * Validation rules for document verification
 */
export const validateDocumentVerification = [
    param('id')
        .isUUID()
        .withMessage('Document ID must be a valid UUID'),

    body('verificationType')
        .optional()
        .isIn(['ai_forensics', 'blockchain', 'manual', 'all'])
        .withMessage('verificationType must be one of: ai_forensics, blockchain, manual, all'),

    body('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('priority must be one of: low, normal, high, urgent'),

    body('options')
        .optional()
        .isObject()
        .withMessage('options must be an object'),
];

/**
 * Custom validation for file size in multipart requests
 */
export const validateFileSize = (maxSizeInMB: number) => {
    return (req: any, res: any, next: any) => {
        if (req.file && req.file.size > maxSizeInMB * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: `File size exceeds maximum limit of ${maxSizeInMB}MB`,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        next();
    };
};

/**
 * Custom validation for file type
 */
export const validateFileType = (allowedTypes: string[]) => {
    return (req: any, res: any, next: any) => {
        if (req.file && !allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_FILE_TYPE',
                    message: 'File type not allowed',
                    details: {
                        allowedTypes,
                        receivedType: req.file.mimetype,
                    },
                    timestamp: new Date().toISOString(),
                },
            });
        }
        next();
    };
};