import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'NeoVerify API',
            version: '1.0.0',
            description: 'Comprehensive API for NeoVerify document verification system',
            contact: {
                name: 'NeoVerify Support',
                email: 'support@neoverify.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: 'Development server',
            },
            {
                url: 'https://api.neoverify.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token for authentication',
                },
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API key for service-to-service authentication',
                },
            },
            schemas: {
                // Common response schemas
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true,
                        },
                        data: {
                            type: 'object',
                            description: 'Response data',
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                timestamp: {
                                    type: 'string',
                                    format: 'date-time',
                                },
                                requestId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        error: {
                            type: 'object',
                            properties: {
                                code: {
                                    type: 'string',
                                    example: 'VALIDATION_ERROR',
                                },
                                message: {
                                    type: 'string',
                                    example: 'Invalid input data',
                                },
                                details: {
                                    type: 'object',
                                    description: 'Additional error details',
                                },
                                timestamp: {
                                    type: 'string',
                                    format: 'date-time',
                                },
                                requestId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
                PaginationMeta: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            minimum: 1,
                            example: 1,
                        },
                        limit: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            example: 20,
                        },
                        total: {
                            type: 'integer',
                            minimum: 0,
                            example: 100,
                        },
                        totalPages: {
                            type: 'integer',
                            minimum: 0,
                            example: 5,
                        },
                    },
                },
                // User schemas
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'user@example.com',
                        },
                        firstName: {
                            type: 'string',
                            example: 'John',
                        },
                        lastName: {
                            type: 'string',
                            example: 'Doe',
                        },
                        isEmailVerified: {
                            type: 'boolean',
                            example: true,
                        },
                        mfaEnabled: {
                            type: 'boolean',
                            example: false,
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'user', 'viewer'],
                            example: 'user',
                        },
                        organizationId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                UserRegistration: {
                    type: 'object',
                    required: ['email', 'password', 'firstName', 'lastName'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'user@example.com',
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            example: 'SecurePassword123!',
                        },
                        firstName: {
                            type: 'string',
                            minLength: 1,
                            example: 'John',
                        },
                        lastName: {
                            type: 'string',
                            minLength: 1,
                            example: 'Doe',
                        },
                        organizationId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                        },
                    },
                },
                UserLogin: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'user@example.com',
                        },
                        password: {
                            type: 'string',
                            example: 'SecurePassword123!',
                        },
                        mfaCode: {
                            type: 'string',
                            pattern: '^[0-9]{6}$',
                            example: '123456',
                            description: 'Required if MFA is enabled',
                        },
                    },
                },
                AuthTokens: {
                    type: 'object',
                    properties: {
                        accessToken: {
                            type: 'string',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        },
                        refreshToken: {
                            type: 'string',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        },
                        expiresIn: {
                            type: 'integer',
                            example: 3600,
                            description: 'Access token expiration time in seconds',
                        },
                    },
                },
                // Document schemas
                Document: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        organizationId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                        },
                        filename: {
                            type: 'string',
                            example: 'document_20231201_123456.pdf',
                        },
                        originalName: {
                            type: 'string',
                            example: 'contract.pdf',
                        },
                        mimeType: {
                            type: 'string',
                            example: 'application/pdf',
                        },
                        size: {
                            type: 'integer',
                            example: 1024000,
                        },
                        hash: {
                            type: 'string',
                            example: 'sha256:abc123...',
                        },
                        ipfsHash: {
                            type: 'string',
                            nullable: true,
                            example: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
                        },
                        verificationStatus: {
                            type: 'string',
                            enum: ['pending', 'processing', 'verified', 'failed', 'rejected'],
                            example: 'verified',
                        },
                        metadata: {
                            type: 'object',
                            properties: {
                                pages: {
                                    type: 'integer',
                                    example: 5,
                                },
                                author: {
                                    type: 'string',
                                    example: 'John Doe',
                                },
                                createdDate: {
                                    type: 'string',
                                    format: 'date-time',
                                },
                            },
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                DocumentUpload: {
                    type: 'object',
                    properties: {
                        file: {
                            type: 'string',
                            format: 'binary',
                            description: 'Document file to upload',
                        },
                        metadata: {
                            type: 'object',
                            properties: {
                                description: {
                                    type: 'string',
                                    example: 'Contract document',
                                },
                                tags: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                    },
                                    example: ['contract', 'legal'],
                                },
                            },
                        },
                    },
                },
                // Organization schemas
                Organization: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        name: {
                            type: 'string',
                            example: 'Acme Corporation',
                        },
                        domain: {
                            type: 'string',
                            example: 'acme.com',
                        },
                        settings: {
                            type: 'object',
                            properties: {
                                allowedFileTypes: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                    },
                                    example: ['pdf', 'docx', 'jpg'],
                                },
                                maxFileSize: {
                                    type: 'integer',
                                    example: 10485760,
                                },
                                requireMfa: {
                                    type: 'boolean',
                                    example: true,
                                },
                            },
                        },
                        subscriptionTier: {
                            type: 'string',
                            enum: ['free', 'basic', 'premium', 'enterprise'],
                            example: 'premium',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                // Verification schemas
                Verification: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        documentId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'processing', 'completed', 'failed'],
                            example: 'completed',
                        },
                        aiForensicsJobId: {
                            type: 'string',
                            nullable: true,
                            example: 'job_123456',
                        },
                        blockchainTxHash: {
                            type: 'string',
                            nullable: true,
                            example: '0x1234567890abcdef...',
                        },
                        results: {
                            type: 'object',
                            properties: {
                                authenticity: {
                                    type: 'object',
                                    properties: {
                                        score: {
                                            type: 'number',
                                            minimum: 0,
                                            maximum: 1,
                                            example: 0.95,
                                        },
                                        confidence: {
                                            type: 'string',
                                            enum: ['low', 'medium', 'high'],
                                            example: 'high',
                                        },
                                    },
                                },
                                tampering: {
                                    type: 'object',
                                    properties: {
                                        detected: {
                                            type: 'boolean',
                                            example: false,
                                        },
                                        regions: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    x: { type: 'number' },
                                                    y: { type: 'number' },
                                                    width: { type: 'number' },
                                                    height: { type: 'number' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        startedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        completedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints',
            },
            {
                name: 'Documents',
                description: 'Document management and file operations',
            },
            {
                name: 'Profile',
                description: 'User profile and preferences management',
            },
            {
                name: 'Organizations',
                description: 'Organization management and user roles',
            },
            {
                name: 'Verification',
                description: 'Document verification and AI forensics',
            },
            {
                name: 'System',
                description: 'System health and monitoring endpoints',
            },
        ],
    },
    apis: [
        './src/routes/*.ts',
        './src/controllers/*.ts',
    ],
};

export const swaggerSpec = swaggerJsdoc(options);