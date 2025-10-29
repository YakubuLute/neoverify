import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { Request } from 'express';
import logger from '../utils/logger';

// File type validation
const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',

    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Text files
    'text/plain',
    'text/csv',
    'text/html',
    'text/xml',
    'application/json',
    'application/xml',

    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
];

// File extension validation
const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.html', '.xml', '.json',
    '.zip', '.rar', '.7z',
];

// File size limits (in bytes)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES_PER_REQUEST = 10;

// Upload directory configuration
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || 'uploads';
const TEMP_DIR = path.join(UPLOAD_BASE_DIR, 'temp');
const DOCUMENTS_DIR = path.join(UPLOAD_BASE_DIR, 'documents');

/**
 * Ensure upload directories exist
 */
export async function ensureUploadDirectories(): Promise<void> {
    try {
        await fs.mkdir(UPLOAD_BASE_DIR, { recursive: true });
        await fs.mkdir(TEMP_DIR, { recursive: true });
        await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
        logger.info('Upload directories initialized', {
            baseDir: UPLOAD_BASE_DIR,
            tempDir: TEMP_DIR,
            documentsDir: DOCUMENTS_DIR,
        });
    } catch (error) {
        logger.error('Failed to create upload directories', { error });
        throw error;
    }
}

/**
 * Generate unique filename with timestamp and random suffix
 */
function generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${randomSuffix}${ext}`;
}

/**
 * Validate file type based on MIME type and extension
 */
function validateFileType(file: Express.Multer.File): boolean {
    const mimeTypeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const extension = path.extname(file.originalname).toLowerCase();
    const extensionValid = ALLOWED_EXTENSIONS.includes(extension);

    return mimeTypeValid && extensionValid;
}

/**
 * Security scan for malicious files (basic implementation)
 */
async function performSecurityScan(filePath: string): Promise<boolean> {
    try {
        // Read first few bytes to check for malicious signatures
        const fileHandle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(1024);
        await fileHandle.read(buffer, 0, 1024, 0);
        await fileHandle.close();

        // Check for common malicious signatures
        const maliciousSignatures = [
            Buffer.from('MZ'), // PE executable
            Buffer.from('PK'), // ZIP-based files (could contain executables)
        ];

        // For now, just check if it's not an executable
        const fileContent = buffer.toString('hex');
        const isSuspicious = maliciousSignatures.some(sig =>
            buffer.indexOf(sig) === 0
        );

        // Additional checks can be added here (virus scanning, etc.)
        return !isSuspicious;
    } catch (error) {
        logger.warn('Security scan failed', { filePath, error });
        return false; // Fail safe - reject if scan fails
    }
}

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
    destination: async (req: Request, file: Express.Multer.File, cb) => {
        try {
            await ensureUploadDirectories();
            cb(null, TEMP_DIR);
        } catch (error) {
            cb(error, '');
        }
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        const uniqueName = generateUniqueFilename(file.originalname);
        cb(null, uniqueName);
    },
});

/**
 * File filter for validation
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Validate file type
    if (!validateFileType(file)) {
        const error = new Error(`File type not allowed: ${file.mimetype}`);
        error.name = 'INVALID_FILE_TYPE';
        return cb(error);
    }

    // Additional validation can be added here
    cb(null, true);
};

/**
 * Multer configuration for single file upload
 */
export const uploadSingle = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
}).single('document');

/**
 * Multer configuration for multiple file upload
 */
export const uploadMultiple = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES_PER_REQUEST,
    },
}).array('documents', MAX_FILES_PER_REQUEST);

/**
 * Enhanced upload middleware with security scanning
 */
export const secureUploadSingle = (req: any, res: any, next: any) => {
    uploadSingle(req, res, async (err) => {
        if (err) {
            logger.warn('File upload validation failed', {
                error: err.message,
                userId: req.user?.id,
            });

            if (err.name === 'INVALID_FILE_TYPE') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_FILE_TYPE',
                        message: 'File type not allowed',
                        details: {
                            allowedTypes: ALLOWED_MIME_TYPES,
                            allowedExtensions: ALLOWED_EXTENSIONS,
                        },
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'FILE_TOO_LARGE',
                        message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            return res.status(400).json({
                success: false,
                error: {
                    code: 'UPLOAD_ERROR',
                    message: 'File upload failed',
                    details: err.message,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Perform security scan if file was uploaded
        if (req.file) {
            try {
                const isSecure = await performSecurityScan(req.file.path);
                if (!isSecure) {
                    // Clean up the uploaded file
                    await fs.unlink(req.file.path);

                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'SECURITY_SCAN_FAILED',
                            message: 'File failed security scan',
                            timestamp: new Date().toISOString(),
                        },
                    });
                }
            } catch (scanError) {
                logger.error('Security scan error', {
                    filePath: req.file.path,
                    error: scanError
                });

                // Clean up the uploaded file
                try {
                    await fs.unlink(req.file.path);
                } catch (cleanupError) {
                    logger.warn('Failed to cleanup file after security scan failure', {
                        filePath: req.file.path,
                        error: cleanupError,
                    });
                }

                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'SECURITY_SCAN_ERROR',
                        message: 'Unable to verify file security',
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        next();
    });
};

/**
 * Enhanced upload middleware for multiple files
 */
export const secureUploadMultiple = (req: any, res: any, next: any) => {
    uploadMultiple(req, res, async (err) => {
        if (err) {
            logger.warn('Multiple file upload validation failed', {
                error: err.message,
                userId: req.user?.id,
            });

            // Handle various multer errors
            if (err.name === 'INVALID_FILE_TYPE') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_FILE_TYPE',
                        message: 'One or more files have invalid type',
                        details: {
                            allowedTypes: ALLOWED_MIME_TYPES,
                            allowedExtensions: ALLOWED_EXTENSIONS,
                        },
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'FILE_TOO_LARGE',
                        message: `One or more files exceed maximum size limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'TOO_MANY_FILES',
                        message: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request`,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            return res.status(400).json({
                success: false,
                error: {
                    code: 'UPLOAD_ERROR',
                    message: 'File upload failed',
                    details: err.message,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Perform security scan on all uploaded files
        if (req.files && Array.isArray(req.files)) {
            try {
                const securityResults = await Promise.all(
                    req.files.map(file => performSecurityScan(file.path))
                );

                const failedFiles = req.files.filter((_, index) => !securityResults[index]);

                if (failedFiles.length > 0) {
                    // Clean up all uploaded files
                    await Promise.all(
                        req.files.map((file: Express.Multer.File) =>
                            fs.unlink(file.path).catch(err =>
                                logger.warn('Failed to cleanup file', { path: file.path, error: err })
                            )
                        )
                    );

                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'SECURITY_SCAN_FAILED',
                            message: `${failedFiles.length} file(s) failed security scan`,
                            timestamp: new Date().toISOString(),
                        },
                    });
                }
            } catch (scanError) {
                logger.error('Security scan error for multiple files', { error: scanError });

                // Clean up all uploaded files
                if (req.files) {
                    await Promise.all(
                        req.files.map((file: Express.Multer.File) =>
                            fs.unlink(file.path).catch(err =>
                                logger.warn('Failed to cleanup file', { path: file.path, error: err })
                            )
                        )
                    );
                }

                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'SECURITY_SCAN_ERROR',
                        message: 'Unable to verify file security',
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        next();
    });
};

/**
 * Cleanup temporary files older than 24 hours
 */
export async function cleanupTempFiles(): Promise<void> {
    try {
        const files = await fs.readdir(TEMP_DIR);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const file of files) {
            const filePath = path.join(TEMP_DIR, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
                await fs.unlink(filePath);
                logger.info('Cleaned up old temp file', { filePath });
            }
        }
    } catch (error) {
        logger.error('Failed to cleanup temp files', { error });
    }
}

// Export configuration constants
export const uploadConfig = {
    maxFileSize: MAX_FILE_SIZE,
    maxFilesPerRequest: MAX_FILES_PER_REQUEST,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS,
    uploadDir: UPLOAD_BASE_DIR,
    tempDir: TEMP_DIR,
    documentsDir: DOCUMENTS_DIR,
};