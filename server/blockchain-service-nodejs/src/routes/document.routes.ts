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
 * Document Upload Routes
 */

// Upload a single document
router.post(
    '/upload',
    authenticateToken,
    secureUploadSingle,
    validateDocumentUpload,
    DocumentController.uploadDocument
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