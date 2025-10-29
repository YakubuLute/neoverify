import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { secureUploadSingle } from '../middleware/upload';
import {
    validateDocumentUpload,
    validateDocumentUpdate,
    validateDocumentListing,
    validateDocumentId,
    validateBulkOperations,
} from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a document
 *     description: Uploads a document file with metadata
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload
 *               metadata:
 *                 type: string
 *                 description: JSON string containing document metadata
 *                 example: '{"description": "Contract document", "tags": ["contract", "legal"]}'
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Document'
 *       400:
 *         description: Invalid file or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/documents:
 *   get:
 *     tags: [Documents]
 *     summary: Get documents list
 *     description: Retrieves paginated list of documents with filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of documents per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for document names and metadata
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, verified, failed, rejected]
 *         description: Filter by verification status
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *         description: Filter by MIME type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, filename, size]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         documents:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Document'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get document by ID
 *     description: Retrieves a specific document by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Document'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Documents]
 *     summary: Update document metadata
 *     description: Updates document metadata and properties
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metadata:
 *                 type: object
 *                 properties:
 *                   description:
 *                     type: string
 *                     example: "Updated contract document"
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["contract", "legal", "updated"]
 *     responses:
 *       200:
 *         description: Document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Document'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Documents]
 *     summary: Delete document
 *     description: Soft deletes a document (maintains audit trail)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     tags: [Documents]
 *     summary: Download document file
 *     description: Downloads the actual document file
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document file
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             description: Attachment filename
 *           Content-Type:
 *             schema:
 *               type: string
 *             description: File MIME type
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/documents/bulk:
 *   post:
 *     tags: [Documents]
 *     summary: Bulk operations on documents
 *     description: Performs bulk operations on multiple documents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operation, documentIds]
 *             properties:
 *               operation:
 *                 type: string
 *                 enum: [delete, verify, updateStatus]
 *                 example: "delete"
 *               documentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["123e4567-e89b-12d3-a456-426614174000", "987fcdeb-51a2-43d1-9f12-345678901234"]
 *               metadata:
 *                 type: object
 *                 description: Additional operation parameters
 *     responses:
 *       200:
 *         description: Bulk operation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         processed:
 *                           type: integer
 *                           example: 5
 *                         successful:
 *                           type: integer
 *                           example: 4
 *                         failed:
 *                           type: integer
 *                           example: 1
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               documentId:
 *                                 type: string
 *                               error:
 *                                 type: string
 *       400:
 *         description: Invalid operation or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Upload a single document
router.post(
    '/upload',
    authenticateToken,
    secureUploadSingle,
    validateDocumentUpload,
    DocumentController.uploadDocument as any
);

/**
 * Document Listing and Search Routes
 */

// Get paginated list of documents with filtering
router.get(
    '/',
    authenticateToken,
    validateDocumentListing,
    DocumentController.getDocuments
);

/**
 * Individual Document Routes
 */

// Get specific document by ID
router.get(
    '/:id',
    optionalAuth, // Allow both authenticated and public access
    validateDocumentId,
    DocumentController.getDocumentById
);

// Update document metadata
router.put(
    '/:id',
    authenticateToken,
    validateDocumentUpdate,
    DocumentController.updateDocument
);

// Delete document (soft delete)
router.delete(
    '/:id',
    authenticateToken,
    validateDocumentId,
    DocumentController.deleteDocument
);

/**
 * Document Download Routes
 */

// Download document file
router.get(
    '/:id/download',
    optionalAuth, // Allow both authenticated and public access for shared documents
    validateDocumentId,
    DocumentController.downloadDocument
);

/**
 * Bulk Operations Routes
 */

// Bulk operations on multiple documents
router.post(
    '/bulk',
    authenticateToken,
    validateBulkOperations,
    DocumentController.bulkOperations
);

export default router;