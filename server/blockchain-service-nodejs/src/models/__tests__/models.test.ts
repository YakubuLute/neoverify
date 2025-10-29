import { Sequelize } from 'sequelize';
import { User, Document, Organization, Verification, UserRole, SubscriptionTier, VerificationType, VerificationStatus, DocumentType } from '../index';

// Test database configuration
const testSequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
});

// Override the sequelize instance for testing
beforeAll(async () => {
    // Re-initialize models with test database
    User.init(User.getTableName() as any, { sequelize: testSequelize });
    Organization.init(Organization.getTableName() as any, { sequelize: testSequelize });
    Document.init(Document.getTableName() as any, { sequelize: testSequelize });
    Verification.init(Verification.getTableName() as any, { sequelize: testSequelize });

    await testSequelize.sync({ force: true });
});

afterAll(async () => {
    await testSequelize.close();
});

describe('Database Models', () => {
    describe('User Model', () => {
        it('should create a user with default values', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                firstName: 'John',
                lastName: 'Doe',
            };

            const user = await User.create(userData);

            expect(user.id).toBeDefined();
            expect(user.email).toBe('test@example.com');
            expect(user.firstName).toBe('John');
            expect(user.lastName).toBe('Doe');
            expect(user.role).toBe(UserRole.USER);
            expect(user.isEmailVerified).toBe(false);
            expect(user.mfaEnabled).toBe(false);
            expect(user.isActive).toBe(true);
            expect(user.preferences).toBeDefined();
        });

        it('should hash password on creation', async () => {
            const userData = {
                email: 'test2@example.com',
                password: 'password123',
                firstName: 'Jane',
                lastName: 'Doe',
            };

            const user = await User.create(userData);
            expect(user.password).not.toBe('password123');
            expect(user.password.length).toBeGreaterThan(20); // bcrypt hash length
        });

        it('should validate password correctly', async () => {
            const userData = {
                email: 'test3@example.com',
                password: 'password123',
                firstName: 'Bob',
                lastName: 'Smith',
            };

            const user = await User.create(userData);
            const isValid = await user.validatePassword('password123');
            const isInvalid = await user.validatePassword('wrongpassword');

            expect(isValid).toBe(true);
            expect(isInvalid).toBe(false);
        });
    });

    describe('Organization Model', () => {
        it('should create an organization with default values', async () => {
            const orgData = {
                name: 'Test Organization',
                domain: 'testorg',
                billingInfo: Organization.getDefaultBillingInfo('billing@testorg.com'),
            };

            const org = await Organization.create(orgData);

            expect(org.id).toBeDefined();
            expect(org.name).toBe('Test Organization');
            expect(org.domain).toBe('testorg');
            expect(org.subscriptionTier).toBe(SubscriptionTier.FREE);
            expect(org.isActive).toBe(true);
            expect(org.settings).toBeDefined();
            expect(org.usageStats).toBeDefined();
        });

        it('should calculate subscription limits correctly', async () => {
            const orgData = {
                name: 'Pro Organization',
                domain: 'proorg',
                subscriptionTier: SubscriptionTier.PROFESSIONAL,
                billingInfo: Organization.getDefaultBillingInfo('billing@proorg.com'),
            };

            const org = await Organization.create(orgData);
            const limits = org.getSubscriptionLimits();

            expect(limits.maxDocuments).toBe(1000);
            expect(limits.maxStorage).toBe(10 * 1024 * 1024 * 1024); // 10GB
            expect(limits.maxVerifications).toBe(500);
        });
    });

    describe('Document Model', () => {
        let user: User;
        let organization: Organization;

        beforeEach(async () => {
            user = await User.create({
                email: 'docuser@example.com',
                password: 'password123',
                firstName: 'Doc',
                lastName: 'User',
            });

            organization = await Organization.create({
                name: 'Doc Organization',
                domain: 'docorg',
                billingInfo: Organization.getDefaultBillingInfo('billing@docorg.com'),
            });
        });

        it('should create a document with metadata', async () => {
            const docData = {
                userId: user.id,
                organizationId: organization.id,
                filename: 'test-doc-123.pdf',
                originalName: 'test document.pdf',
                filePath: '/uploads/test-doc-123.pdf',
                mimeType: 'application/pdf',
                size: 1024000,
                hash: 'abc123def456',
                metadata: {
                    fileSize: 1024000,
                    mimeType: 'application/pdf',
                    checksum: 'abc123def456',
                },
            };

            const document = await Document.create(docData);

            expect(document.id).toBeDefined();
            expect(document.userId).toBe(user.id);
            expect(document.organizationId).toBe(organization.id);
            expect(document.documentType).toBe(DocumentType.PDF);
            expect(document.verificationStatus).toBe(VerificationStatus.PENDING);
            expect(document.downloadCount).toBe(0);
            expect(document.viewCount).toBe(0);
        });

        it('should increment view and download counts', async () => {
            const document = await Document.create({
                userId: user.id,
                filename: 'test-doc-456.pdf',
                originalName: 'test document 2.pdf',
                filePath: '/uploads/test-doc-456.pdf',
                mimeType: 'application/pdf',
                size: 2048000,
                hash: 'def456ghi789',
                metadata: {
                    fileSize: 2048000,
                    mimeType: 'application/pdf',
                    checksum: 'def456ghi789',
                },
            });

            await document.incrementViewCount();
            await document.incrementDownloadCount();

            expect(document.viewCount).toBe(1);
            expect(document.downloadCount).toBe(1);
            expect(document.lastAccessedAt).toBeDefined();
        });
    });

    describe('Verification Model', () => {
        let user: User;
        let document: Document;

        beforeEach(async () => {
            user = await User.create({
                email: 'verifyuser@example.com',
                password: 'password123',
                firstName: 'Verify',
                lastName: 'User',
            });

            document = await Document.create({
                userId: user.id,
                filename: 'verify-doc-789.pdf',
                originalName: 'verify document.pdf',
                filePath: '/uploads/verify-doc-789.pdf',
                mimeType: 'application/pdf',
                size: 3072000,
                hash: 'ghi789jkl012',
                metadata: {
                    fileSize: 3072000,
                    mimeType: 'application/pdf',
                    checksum: 'ghi789jkl012',
                },
            });
        });

        it('should create a verification with default values', async () => {
            const verificationData = {
                documentId: document.id,
                userId: user.id,
                type: VerificationType.AI_FORENSICS,
                metadata: Verification.getDefaultMetadata(user.id),
            };

            const verification = await Verification.create(verificationData);

            expect(verification.id).toBeDefined();
            expect(verification.documentId).toBe(document.id);
            expect(verification.userId).toBe(user.id);
            expect(verification.type).toBe(VerificationType.AI_FORENSICS);
            expect(verification.status).toBe(VerificationStatus.PENDING);
            expect(verification.startedAt).toBeDefined();
        });

        it('should calculate overall score correctly', async () => {
            const verification = await Verification.create({
                documentId: document.id,
                userId: user.id,
                type: VerificationType.HYBRID,
                metadata: Verification.getDefaultMetadata(user.id),
                results: {
                    aiForensics: {
                        jobId: 'test-job-123',
                        authenticity: 85,
                        tampering: 15,
                        confidence: 90,
                        details: {
                            anomalies: [],
                            processingTime: 5000,
                        },
                        modelVersion: '1.0.0',
                        processingNode: 'node-1',
                    },
                },
            });

            const score = verification.calculateOverallScore();
            expect(score).toBeGreaterThan(80); // Should be high score for good AI results
        });
    });

    describe('Model Associations', () => {
        let user: User;
        let organization: Organization;
        let document: Document;

        beforeEach(async () => {
            organization = await Organization.create({
                name: 'Association Test Org',
                domain: 'assocorg',
                billingInfo: Organization.getDefaultBillingInfo('billing@assocorg.com'),
            });

            user = await User.create({
                email: 'assocuser@example.com',
                password: 'password123',
                firstName: 'Assoc',
                lastName: 'User',
                organizationId: organization.id,
            });

            document = await Document.create({
                userId: user.id,
                organizationId: organization.id,
                filename: 'assoc-doc-123.pdf',
                originalName: 'association document.pdf',
                filePath: '/uploads/assoc-doc-123.pdf',
                mimeType: 'application/pdf',
                size: 4096000,
                hash: 'jkl012mno345',
                metadata: {
                    fileSize: 4096000,
                    mimeType: 'application/pdf',
                    checksum: 'jkl012mno345',
                },
            });
        });

        it('should load user organization association', async () => {
            const userWithOrg = await User.findByPk(user.id, {
                include: ['organization'],
            });

            expect(userWithOrg?.organization).toBeDefined();
            expect(userWithOrg?.organization.name).toBe('Association Test Org');
        });

        it('should load organization users association', async () => {
            const orgWithUsers = await Organization.findByPk(organization.id, {
                include: ['users'],
            });

            expect(orgWithUsers?.users).toBeDefined();
            expect(orgWithUsers?.users.length).toBe(1);
            expect(orgWithUsers?.users[0].email).toBe('assocuser@example.com');
        });

        it('should load document user and organization associations', async () => {
            const docWithAssociations = await Document.findByPk(document.id, {
                include: ['user', 'organization'],
            });

            expect(docWithAssociations?.user).toBeDefined();
            expect(docWithAssociations?.user.email).toBe('assocuser@example.com');
            expect(docWithAssociations?.organization).toBeDefined();
            expect(docWithAssociations?.organization.name).toBe('Association Test Org');
        });
    });
});