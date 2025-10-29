import {
    DataTypes,
    Model,
    Optional,
    Association,
    BelongsToGetAssociationMixin,
    BelongsToSetAssociationMixin,
    HasManyGetAssociationsMixin,
} from 'sequelize';
import database from '../config/database';

// Document verification status enumeration
export enum VerificationStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

// Document type enumeration
export enum DocumentType {
    PDF = 'pdf',
    IMAGE = 'image',
    WORD = 'word',
    EXCEL = 'excel',
    POWERPOINT = 'powerpoint',
    TEXT = 'text',
    OTHER = 'other',
}

// Document metadata interface
export interface DocumentMetadata {
    fileSize: number;
    mimeType: string;
    dimensions?: {
        width: number;
        height: number;
    };
    pages?: number;
    author?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
    creationDate?: Date;
    modificationDate?: Date;
    producer?: string;
    creator?: string;
    extractedText?: string;
    language?: string;
    checksum: string;
    uploadedFrom?: string;
    clientInfo?: {
        userAgent?: string;
        ipAddress?: string;
    };
}

// Verification results interface
export interface VerificationResults {
    aiForensics?: {
        authenticity: number;
        tampering: number;
        confidence: number;
        details: any;
        completedAt: Date;
    };
    blockchain?: {
        transactionHash: string;
        blockNumber?: number;
        timestamp: Date;
        status: 'pending' | 'confirmed' | 'failed';
    };
    ipfs?: {
        hash: string;
        size: number;
        timestamp: Date;
    };
    overall?: {
        score: number;
        status: 'authentic' | 'suspicious' | 'tampered' | 'inconclusive';
        summary: string;
    };
}

// Document sharing settings interface
export interface SharingSettings {
    isPublic: boolean;
    allowDownload: boolean;
    expiresAt?: Date;
    password?: string;
    allowedEmails?: string[];
    shareToken?: string;
}

// Document attributes interface
export interface DocumentAttributes {
    id: string;
    userId: string;
    organizationId?: string;
    filename: string;
    originalName: string;
    filePath: string;
    mimeType: string;
    size: number;
    hash: string;
    ipfsHash?: string;
    documentType: DocumentType;
    metadata: DocumentMetadata;
    verificationStatus: VerificationStatus;
    verificationResults?: VerificationResults;
    sharingSettings: SharingSettings;
    tags: string[];
    description?: string;
    isPublic: boolean;
    downloadCount: number;
    viewCount: number;
    lastAccessedAt?: Date;
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

// Optional attributes for creation
export interface DocumentCreationAttributes
    extends Optional<
        DocumentAttributes,
        | 'id'
        | 'documentType'
        | 'verificationStatus'
        | 'sharingSettings'
        | 'tags'
        | 'isPublic'
        | 'downloadCount'
        | 'viewCount'
        | 'createdAt'
        | 'updatedAt'
        | 'deletedAt'
    > { }

class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
    public id!: string;
    public userId!: string;
    public organizationId?: string;
    public filename!: string;
    public originalName!: string;
    public filePath!: string;
    public mimeType!: string;
    public size!: number;
    public hash!: string;
    public ipfsHash?: string;
    public documentType!: DocumentType;
    public metadata!: DocumentMetadata;
    public verificationStatus!: VerificationStatus;
    public verificationResults?: VerificationResults;
    public sharingSettings!: SharingSettings;
    public tags!: string[];
    public description?: string;
    public isPublic!: boolean;
    public downloadCount!: number;
    public viewCount!: number;
    public lastAccessedAt?: Date;
    public expiresAt?: Date;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt?: Date;

    // Associations
    public getUser!: BelongsToGetAssociationMixin<any>;
    public setUser!: BelongsToSetAssociationMixin<any, string>;
    public getOrganization!: BelongsToGetAssociationMixin<any>;
    public setOrganization!: BelongsToSetAssociationMixin<any, string>;
    public getVerifications!: HasManyGetAssociationsMixin<any>;

    public static associations: {
        user: Association<Document, any>;
        organization: Association<Document, any>;
        verifications: Association<Document, any>;
    };

    // Instance methods
    public isExpired(): boolean {
        return !!(this.expiresAt && this.expiresAt < new Date());
    }

    public isVerified(): boolean {
        return this.verificationStatus === VerificationStatus.COMPLETED;
    }

    public getFileExtension(): string {
        return this.originalName.split('.').pop()?.toLowerCase() || '';
    }

    public async incrementViewCount(): Promise<void> {
        this.viewCount += 1;
        this.lastAccessedAt = new Date();
        await this.save();
    }

    public async incrementDownloadCount(): Promise<void> {
        this.downloadCount += 1;
        this.lastAccessedAt = new Date();
        await this.save();
    }

    public updateVerificationStatus(status: VerificationStatus, results?: Partial<VerificationResults>): void {
        this.verificationStatus = status;
        if (results) {
            this.verificationResults = {
                ...this.verificationResults,
                ...results,
            };
        }
    }

    public addTag(tag: string): void {
        if (!this.tags.includes(tag.toLowerCase())) {
            this.tags.push(tag.toLowerCase());
        }
    }

    public removeTag(tag: string): void {
        this.tags = this.tags.filter(t => t !== tag.toLowerCase());
    }

    public generateShareToken(): string {
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        this.sharingSettings = {
            ...this.sharingSettings,
            shareToken: token,
        };
        return token;
    }

    public isAccessibleBy(userId?: string, email?: string): boolean {
        // Public documents are accessible by anyone
        if (this.isPublic) return true;

        // Owner always has access
        if (userId && this.userId === userId) return true;

        // Check sharing settings
        if (this.sharingSettings.isPublic) return true;

        // Check if email is in allowed list
        if (email && this.sharingSettings.allowedEmails?.includes(email)) return true;

        return false;
    }

    public toJSON(): Partial<DocumentAttributes> {
        const values = { ...this.get() };
        // Remove sensitive fields from JSON output
        if (values.sharingSettings?.password) {
            values.sharingSettings = {
                ...values.sharingSettings,
                password: undefined,
            };
        }
        return values;
    }

    // Static methods
    public static async findByHash(hash: string): Promise<Document | null> {
        return this.findOne({
            where: { hash },
        });
    }

    public static async findByShareToken(token: string): Promise<Document | null> {
        return this.findOne({
            where: {
                'sharing_settings.shareToken': token,
            },
        });
    }

    public static async findByUserId(userId: string, options: any = {}): Promise<Document[]> {
        return this.findAll({
            where: { userId },
            ...options,
        });
    }

    public static async findByOrganizationId(organizationId: string, options: any = {}): Promise<Document[]> {
        return this.findAll({
            where: { organizationId },
            ...options,
        });
    }

    public static getDocumentTypeFromMimeType(mimeType: string): DocumentType {
        if (mimeType.startsWith('image/')) return DocumentType.IMAGE;
        if (mimeType === 'application/pdf') return DocumentType.PDF;
        if (mimeType.includes('word') || mimeType.includes('msword')) return DocumentType.WORD;
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return DocumentType.EXCEL;
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return DocumentType.POWERPOINT;
        if (mimeType.startsWith('text/')) return DocumentType.TEXT;
        return DocumentType.OTHER;
    }
}

// Initialize the model
Document.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        organizationId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'organizations',
                key: 'id',
            },
        },
        filename: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [1, 255],
            },
        },
        originalName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [1, 255],
            },
        },
        filePath: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mimeType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        size: {
            type: DataTypes.BIGINT,
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        hash: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        ipfsHash: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        documentType: {
            type: DataTypes.ENUM(...Object.values(DocumentType)),
            allowNull: false,
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
        },
        verificationStatus: {
            type: DataTypes.ENUM(...Object.values(VerificationStatus)),
            defaultValue: VerificationStatus.PENDING,
        },
        verificationResults: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        sharingSettings: {
            type: DataTypes.JSONB,
            defaultValue: {
                isPublic: false,
                allowDownload: true,
            },
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        downloadCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        viewCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        lastAccessedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize: database.getSequelize(),
        modelName: 'Document',
        tableName: 'documents',
        timestamps: true,
        paranoid: true, // Enable soft deletes
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['hash'],
            },
            {
                fields: ['user_id'],
            },
            {
                fields: ['organization_id'],
            },
            {
                fields: ['verification_status'],
            },
            {
                fields: ['document_type'],
            },
            {
                fields: ['is_public'],
            },
            {
                fields: ['created_at'],
            },
            {
                fields: ['tags'],
                using: 'gin',
            },
            {
                fields: ['metadata'],
                using: 'gin',
            },
        ],
        hooks: {
            beforeCreate: (document: Document) => {
                // Set document type based on mime type if not provided
                if (!document.documentType) {
                    document.documentType = Document.getDocumentTypeFromMimeType(document.mimeType);
                }
            },
        },
    }
);

export default Document;