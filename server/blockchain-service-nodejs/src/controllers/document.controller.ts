import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { Op } from 'sequelize';
import Document, { DocumentType, VerificationStatus } from '../models/Document';
import User from '../models/User';
import logger from '../utils/logger';

// Extend Request interface for file uploads
interface MulterRequest extends Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
}

// Extend Document interface to include associations
interface DocumentWithUser extends Document {
    user?: User;
}

/**
 * Document Controller
 * Handles all document-related operations including upload, retrieval, management
 */
export class DocumentController {
    /**
     * Upload a new document
     * POST /api/documents/upload
     */
    static async uploadDocument(req: MulterRequest, res: Response): Promise<void> {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: errors.array(),
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            if (!req.file) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'NO_FILE_UPLOADED',
                        message: 'No file was uploaded',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const { description, tags, isPublic = false } = req.body;
            const file = req.file;
            const userId = req.user!.id;
            const organizationId = req.user!.organizationId;

            // Generate file hash for deduplication and integrity
            const fileBuffer = await fs.readFile(file.path);
            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            // Check if document with same hash already exists for this user
            const existingDocument = await Document.findOne({
                where: {
                    hash: fileHash,
                    userId,
                },
            });

            if (existingDocument) {
                // Clean up uploaded file
                await fs.unlink(file.path);

                res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_DOCUMENT',
                        message: 'A document with identical content already exists',
                        details: {
                            existingDocumentId: existingDocument.id,
                        },
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Generate unique filename
            const fileExtension = path.extname(file.originalname);
            const uniqueFilename = `${crypto.randomUUID()}${fileExtension}`;
            const finalPath = path.join(path.dirname(file.path), uniqueFilename);

            // Move file to final location
            await fs.rename(file.path, finalPath);

            // Determine document type from MIME type
            const documentType = Document.getDocumentTypeFromMimeType(file.mimetype);

            // Extract basic metadata
            const metadata = {
                fileSize: file.size,
                mimeType: file.mimetype,
                checksum: fileHash,
                uploadedFrom: req.headers['user-agent'] || 'unknown',
                clientInfo: {
                    userAgent: req.headers['user-agent'],
                    ipAddress: req.ip || req.connection.remoteAddress,
                },
            };

            // Create document record
            const document = await Document.create({
                userId,
                organizationId,
                filename: uniqueFilename,
                originalName: file.originalname,
                filePath: finalPath,
                mimeType: file.mimetype,
                size: file.size,
                hash: fileHash,
                documentType,
                metadata,
                verificationStatus: VerificationStatus.PENDING,
                description: description || null,
                tags: tags ? tags.split(',').map((tag: string) => tag.trim().toLowerCase()) : [],
                isPublic: Boolean(isPublic),
                sharingSettings: {
                    isPublic: Boolean(isPublic),
                    allowDownload: true,
                },
            });

            logger.info('Document uploaded successfully', {
                documentId: document.id,
                userId,
                filename: file.originalname,
                size: file.size,
            });

            res.status(201).json({
                success: true,
                data: {
                    document: {
                        id: document.id,
                        filename: document.originalName,
                        size: document.size,
                        mimeType: document.mimeType,
                        documentType: document.documentType,
                        verificationStatus: document.verificationStatus,
                        description: document.description,
                        tags: document.tags,
                        isPublic: document.isPublic,
                        createdAt: document.createdAt,
                    },
                },
                message: 'Document uploaded successfully',
            });

        } catch (error) {
            logger.error('Document upload failed', {
                error: error instanceof Error ? error.message : error,
                userId: req.user?.id,
            });

            // Clean up file if it exists
            if (req.file?.path) {
                try {
                    await fs.unlink(req.file.path);
                } catch (cleanupError) {
                    logger.warn('Failed to cleanup uploaded file', { path: req.file.path });
                }
            }

            res.status(500).json({
                success: false,
                error: {
                    code: 'UPLOAD_FAILED',
                    message: 'Failed to upload document',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    /**
     * Get paginated list of documents with filtering and sorting
     * GET /api/documents
     */
    static async getDocuments(req: Request, res: Response): Promise<void> {
        try {
            const {
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                search,
                documentType,
                verificationStatus,
                isPublic,
                tags,
                dateFrom,
                dateTo,
            } = req.query;

            const userId = req.user!.id;
            const organizationId = req.user!.organizationId;

            // Build where clause
            const whereClause: any = {
                [Op.or]: [
                    { userId },
                    ...(organizationId ? [{ organizationId }] : []),
                ],
            };

            // Add filters
            if (search) {
                whereClause[Op.and] = whereClause[Op.and] || [];
                whereClause[Op.and].push({
                    [Op.or]: [
                        { originalName: { [Op.iLike]: `%${search}%` } },
                        { description: { [Op.iLike]: `%${search}%` } },
                        { tags: { [Op.contains]: [search.toString().toLowerCase()] } },
                    ],
                });
            }

            if (documentType) {
                whereClause.documentType = documentType;
            }

            if (verificationStatus) {
                whereClause.verificationStatus = verificationStatus;
            }

            if (isPublic !== undefined) {
                whereClause.isPublic = isPublic === 'true';
            }

            if (tags) {
                const tagArray = tags.toString().split(',').map(tag => tag.trim().toLowerCase());
                whereClause.tags = { [Op.overlap]: tagArray };
            }

            if (dateFrom || dateTo) {
                whereClause.createdAt = {};
                if (dateFrom) {
                    whereClause.createdAt[Op.gte] = new Date(dateFrom.toString());
                }
                if (dateTo) {
                    whereClause.createdAt[Op.lte] = new Date(dateTo.toString());
                }
            }

            // Calculate pagination
            const pageNum = Math.max(1, parseInt(page.toString()));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit.toString())));
            const offset = (pageNum - 1) * limitNum;

            // Validate sort parameters
            const allowedSortFields = ['createdAt', 'updatedAt', 'originalName', 'size', 'verificationStatus'];
            const sortField = allowedSortFields.includes(sortBy.toString()) ? sortBy.toString() : 'createdAt';
            const sortDirection = sortOrder.toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Execute query
            const { count, rows: documents } = await Document.findAndCountAll({
                where: whereClause,
                order: [[sortField, sortDirection]],
                limit: limitNum,
                offset,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    },
                ],
            });

            // Calculate pagination metadata
            const totalPages = Math.ceil(count / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            res.json({
                success: true,
                data: {
                    documents: documents.map((doc: DocumentWithUser) => ({
                        id: doc.id,
                        filename: doc.originalName,
                        size: doc.size,
                        mimeType: doc.mimeType,
                        documentType: doc.documentType,
                        verificationStatus: doc.verificationStatus,
                        description: doc.description,
                        tags: doc.tags,
                        isPublic: doc.isPublic,
                        downloadCount: doc.downloadCount,
                        viewCount: doc.viewCount,
                        createdAt: doc.createdAt,
                        updatedAt: doc.updatedAt,
                        user: doc.user ? {
                            id: doc.user.id,
                            name: `${doc.user.firstName} ${doc.user.lastName}`,
                            email: doc.user.email,
                        } : null,
                    })),
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: count,
                        itemsPerPage: limitNum,
                        hasNextPage,
                        hasPrevPage,
                    },
                    filters: {
                        search,
                        documentType,
                        verificationStatus,
                        isPublic,
                        tags,
                        dateFrom,
                        dateTo,
                    },
                    sorting: {
                        sortBy: sortField,
                        sortOrder: sortDirection,
                    },
                },
            });

        } catch (error) {
            logger.error('Failed to fetch documents', {
                error: error instanceof Error ? error.message : error,
                userId: req.user?.id,
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'FETCH_FAILED',
                    message: 'Failed to fetch documents',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    /**
      * Get a specific document by ID
      * GET /api/documents/:id
      */
    static async getDocumentById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.id;
            const organizationId = req.user!.organizationId;

            const document = await Document.findOne({
                where: {
                    id,
                    [Op.or]: [
                        { userId },
                        ...(organizationId ? [{ organizationId }] : []),
                        { isPublic: true },
                    ],
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    },
                ],
            }) as DocumentWithUser;

            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'DOCUMENT_NOT_FOUND',
                        message: 'Document not found or access denied',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Increment view count
            await document.incrementViewCount();

            res.json({
                success: true,
                data: {
                    document: {
                        id: document.id,
                        filename: document.originalName,
                        size: document.size,
                        mimeType: document.mimeType,
                        documentType: document.documentType,
                        verificationStatus: document.verificationStatus,
                        verificationResults: document.verificationResults,
                        description: document.description,
                        tags: document.tags,
                        isPublic: document.isPublic,
                        downloadCount: document.downloadCount,
                        viewCount: document.viewCount,
                        metadata: document.metadata,
                        sharingSettings: document.sharingSettings,
                        createdAt: document.createdAt,
                        updatedAt: document.updatedAt,
                        user: document.user ? {
                            id: document.user.id,
                            name: `${document.user.firstName} ${document.user.lastName}`,
                            email: document.user.email,
                        } : null,
                    },
                },
            });

        } catch (error) {
            logger.error('Failed to fetch document', {
                error: error instanceof Error ? error.message : error,
                documentId: req.params.id,
                userId: req.user?.id,
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'FETCH_FAILED',
                    message: 'Failed to fetch document',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    /**
     * Download a document
     * GET /api/documents/:id/download
     */
    static async downloadDocument(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const organizationId = req.user?.organizationId;

            // Find document with access control
            const document = await Document.findOne({
                where: {
                    id,
                    [Op.or]: [
                        ...(userId ? [{ userId }] : []),
                        ...(organizationId ? [{ organizationId }] : []),
                        { isPublic: true },
                        {
                            sharingSettings: {
                                isPublic: true,
                            },
                        },
                    ],
                },
            });

            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'DOCUMENT_NOT_FOUND',
                        message: 'Document not found or access denied',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Check if document allows downloads
            if (!document.sharingSettings.allowDownload && document.userId !== userId) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'DOWNLOAD_NOT_ALLOWED',
                        message: 'Document download is not allowed',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Check if file exists
            try {
                await fs.access(document.filePath);
            } catch {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'FILE_NOT_FOUND',
                        message: 'Document file not found on server',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Increment download count
            await document.incrementDownloadCount();

            // Set appropriate headers
            res.setHeader('Content-Type', document.mimeType);
            res.setHeader('Content-Length', document.size);
            res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
            res.setHeader('Cache-Control', 'private, no-cache');

            // Stream the file
            const fileBuffer = await fs.readFile(document.filePath);
            res.send(fileBuffer);

            logger.info('Document downloaded', {
                documentId: document.id,
                userId,
                filename: document.originalName,
            });

        } catch (error) {
            logger.error('Document download failed', {
                error: error instanceof Error ? error.message : error,
                documentId: req.params.id,
                userId: req.user?.id,
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'DOWNLOAD_FAILED',
                    message: 'Failed to download document',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    /**
     * Update document metadata
     * PUT /api/documents/:id
     */
    static async updateDocument(req: Request, res: Response): Promise<void> {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: errors.array(),
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const { id } = req.params;
            const { description, tags, isPublic, sharingSettings } = req.body;
            const userId = req.user!.id;
            const organizationId = req.user!.organizationId;

            // Find document with ownership check
            const document = await Document.findOne({
                where: {
                    id,
                    [Op.or]: [
                        { userId },
                        ...(organizationId ? [{ organizationId }] : []),
                    ],
                },
            });

            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'DOCUMENT_NOT_FOUND',
                        message: 'Document not found or access denied',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Update fields
            const updateData: any = {};

            if (description !== undefined) {
                updateData.description = description;
            }

            if (tags !== undefined) {
                updateData.tags = Array.isArray(tags)
                    ? tags.map((tag: string) => tag.trim().toLowerCase())
                    : tags.split(',').map((tag: string) => tag.trim().toLowerCase());
            }

            if (isPublic !== undefined) {
                updateData.isPublic = Boolean(isPublic);
            }

            if (sharingSettings !== undefined) {
                updateData.sharingSettings = {
                    ...document.sharingSettings,
                    ...sharingSettings,
                };
            }

            // Update document
            await document.update(updateData);

            logger.info('Document updated', {
                documentId: document.id,
                userId,
                updatedFields: Object.keys(updateData),
            });

            res.json({
                success: true,
                data: {
                    document: {
                        id: document.id,
                        filename: document.originalName,
                        description: document.description,
                        tags: document.tags,
                        isPublic: document.isPublic,
                        sharingSettings: document.sharingSettings,
                        updatedAt: document.updatedAt,
                    },
                },
                message: 'Document updated successfully',
            });

        } catch (error) {
            logger.error('Document update failed', {
                error: error instanceof Error ? error.message : error,
                documentId: req.params.id,
                userId: req.user?.id,
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'UPDATE_FAILED',
                    message: 'Failed to update document',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    /**
     * Soft delete a document
     * DELETE /api/documents/:id
     */
    static async deleteDocument(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.id;
            const organizationId = req.user!.organizationId;

            // Find document with ownership check
            const document = await Document.findOne({
                where: {
                    id,
                    [Op.or]: [
                        { userId },
                        ...(organizationId ? [{ organizationId }] : []),
                    ],
                },
            });

            if (!document) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'DOCUMENT_NOT_FOUND',
                        message: 'Document not found or access denied',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Perform soft delete
            await document.destroy();

            logger.info('Document deleted', {
                documentId: document.id,
                userId,
                filename: document.originalName,
            });

            res.json({
                success: true,
                message: 'Document deleted successfully',
            });

        } catch (error) {
            logger.error('Document deletion failed', {
                error: error instanceof Error ? error.message : error,
                documentId: req.params.id,
                userId: req.user?.id,
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'DELETE_FAILED',
                    message: 'Failed to delete document',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    /**
     * Bulk operations on multiple documents
     * POST /api/documents/bulk
     */
    static async bulkOperations(req: Request, res: Response): Promise<void> {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: errors.array(),
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const { operation, documentIds, data } = req.body;
            const userId = req.user!.id;
            const organizationId = req.user!.organizationId;

            if (!Array.isArray(documentIds) || documentIds.length === 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_DOCUMENT_IDS',
                        message: 'Document IDs must be a non-empty array',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Find documents with ownership check
            const documents = await Document.findAll({
                where: {
                    id: { [Op.in]: documentIds },
                    [Op.or]: [
                        { userId },
                        ...(organizationId ? [{ organizationId }] : []),
                    ],
                },
            });

            if (documents.length === 0) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NO_DOCUMENTS_FOUND',
                        message: 'No accessible documents found with provided IDs',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            let results: any = {};

            switch (operation) {
                case 'delete':
                    await Promise.all(documents.map((doc: Document) => doc.destroy()));
                    results = {
                        deletedCount: documents.length,
                        deletedIds: documents.map((doc: Document) => doc.id),
                    };
                    break;

                case 'update':
                    if (!data) {
                        res.status(400).json({
                            success: false,
                            error: {
                                code: 'MISSING_UPDATE_DATA',
                                message: 'Update data is required for bulk update operation',
                                timestamp: new Date().toISOString(),
                            },
                        });
                        return;
                    }

                    const updateData: any = {};
                    if (data.tags !== undefined) {
                        updateData.tags = Array.isArray(data.tags)
                            ? data.tags.map((tag: string) => tag.trim().toLowerCase())
                            : data.tags.split(',').map((tag: string) => tag.trim().toLowerCase());
                    }
                    if (data.isPublic !== undefined) {
                        updateData.isPublic = Boolean(data.isPublic);
                    }

                    await Promise.all(documents.map((doc: Document) => doc.update(updateData)));
                    results = {
                        updatedCount: documents.length,
                        updatedIds: documents.map((doc: Document) => doc.id),
                    };
                    break;

                default:
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'INVALID_OPERATION',
                            message: 'Invalid bulk operation. Supported operations: delete, update',
                            timestamp: new Date().toISOString(),
                        },
                    });
                    return;
            }

            logger.info('Bulk operation completed', {
                operation,
                userId,
                documentCount: documents.length,
                results,
            });

            res.json({
                success: true,
                data: results,
                message: `Bulk ${operation} operation completed successfully`,
            });

        } catch (error) {
            logger.error('Bulk operation failed', {
                error: error instanceof Error ? error.message : error,
                userId: req.user?.id,
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'BULK_OPERATION_FAILED',
                    message: 'Failed to perform bulk operation',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
}