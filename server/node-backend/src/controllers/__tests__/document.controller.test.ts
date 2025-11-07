import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import app from '../../app';
import Document, { DocumentType } from '../../models/Document';
import User from '../../models/User';
import { JwtUtils } from '../../middleware/auth';

describe('Document Controller', () => {
    let authToken: string;
    let testUser: User;
    let testDocument: Document;

    beforeAll(async () => {
        // Create test user
        testUser = await User.create({
            email: 'test@example.com',
            password: 'hashedpassword',
            firstName: 'Test',
            lastName: 'User',
            isEmailVerified: true,
        });

        // Generate auth token
        const tokenPair = await JwtUtils.generateTokenPair({
            id: testUser.id,
            email: testUser.email,
            organizationId: testUser.organizationId,
            role: testUser.role,
            permissions: [],
        });
        authToken = tokenPair.accessToken;
    });

    afterAll(async () => {
        // Cleanup test data
        if (testDocument) {
            try {
                await fs.unlink(testDocument.filePath);
            } catch (error) {
                // File might not exist
            }
            await testDocument.destroy({ force: true });
        }
        await testUser.destroy({ force: true });
    });

    describe('POST /api/documents/upload', () => {
        it('should upload a document successfully', async () => {
            // Create a test file
            const testFilePath = path.join(__dirname, 'test-file.txt');
            await fs.writeFile(testFilePath, 'This is a test document content');

            const response = await request(app)
                .post('/api/documents/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('document', testFilePath)
                .field('description', 'Test document')
                .field('tags', 'test,document')
                .field('isPublic', 'false');

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.document).toHaveProperty('id');
            expect(response.body.data.document.filename).toBe('test-file.txt');
            expect(response.body.data.document.description).toBe('Test document');
            expect(response.body.data.document.tags).toEqual(['test', 'document']);

            // Store for cleanup
            testDocument = await Document.findByPk(response.body.data.document.id) as Document;

            // Cleanup test file
            await fs.unlink(testFilePath);
        });

        it('should reject upload without authentication', async () => {
            const response = await request(app)
                .post('/api/documents/upload')
                .attach('document', Buffer.from('test'), 'test.txt');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject upload without file', async () => {
            const response = await request(app)
                .post('/api/documents/upload')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('NO_FILE_UPLOADED');
        });
    });

    describe('GET /api/documents', () => {
        it('should get documents list with authentication', async () => {
            const response = await request(app)
                .get('/api/documents')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('documents');
            expect(response.body.data).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data.documents)).toBe(true);
        });

        it('should support pagination parameters', async () => {
            const response = await request(app)
                .get('/api/documents?page=1&limit=5')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.pagination.currentPage).toBe(1);
            expect(response.body.data.pagination.itemsPerPage).toBe(5);
        });

        it('should reject without authentication', async () => {
            const response = await request(app)
                .get('/api/documents');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/documents/:id', () => {
        it('should get document by ID', async () => {
            if (!testDocument) {
                // Skip if no test document available
                return;
            }

            const response = await request(app)
                .get(`/api/documents/${testDocument.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.document.id).toBe(testDocument.id);
        });

        it('should return 404 for non-existent document', async () => {
            const fakeId = '123e4567-e89b-12d3-a456-426614174000';
            const response = await request(app)
                .get(`/api/documents/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/documents/:id', () => {
        it('should update document metadata', async () => {
            if (!testDocument) {
                // Skip if no test document available
                return;
            }

            const response = await request(app)
                .put(`/api/documents/${testDocument.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    description: 'Updated description',
                    tags: ['updated', 'test'],
                    isPublic: true,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.document.description).toBe('Updated description');
            expect(response.body.data.document.tags).toEqual(['updated', 'test']);
            expect(response.body.data.document.isPublic).toBe(true);
        });
    });

    describe('DELETE /api/documents/:id', () => {
        it('should soft delete document', async () => {
            if (!testDocument) {
                // Skip if no test document available
                return;
            }

            const response = await request(app)
                .delete(`/api/documents/${testDocument.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify document is soft deleted
            const deletedDoc = await Document.findByPk(testDocument.id, { paranoid: false });
            expect(deletedDoc?.deletedAt).not.toBeNull();
        });
    });

    describe('POST /api/documents/bulk', () => {
        it('should perform bulk operations', async () => {
            // Create a test document for bulk operations
            const bulkTestDoc = await Document.create({
                userId: testUser.id,
                filename: 'bulk-test.txt',
                originalName: 'bulk-test.txt',
                filePath: '/tmp/bulk-test.txt',
                mimeType: 'text/plain',
                size: 100,
                hash: 'bulk-test-hash',
                documentType: DocumentType.TEXT,
                metadata: { fileSize: 100, mimeType: 'text/plain', checksum: 'bulk-test-hash' },
                sharingSettings: { isPublic: false, allowDownload: true },
            });

            const response = await request(app)
                .post('/api/documents/bulk')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    operation: 'update',
                    documentIds: [bulkTestDoc.id],
                    data: {
                        tags: ['bulk', 'updated'],
                        isPublic: true,
                    },
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.updatedCount).toBe(1);

            // Cleanup
            await bulkTestDoc.destroy({ force: true });
        });
    });
});