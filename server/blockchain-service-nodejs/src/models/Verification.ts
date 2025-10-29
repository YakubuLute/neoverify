import {
    DataTypes,
    Model,
    Optional,
    Association,
    BelongsToGetAssociationMixin,
    BelongsToSetAssociationMixin,
    Op,
} from 'sequelize';
import database from '../config/database';
import { VerificationStatus } from './Document';

// Verification type enumeration
export enum VerificationType {
    AI_FORENSICS = 'ai_forensics',
    BLOCKCHAIN = 'blockchain',
    IPFS = 'ipfs',
    MANUAL = 'manual',
    HYBRID = 'hybrid',
}

// Verification priority enumeration
export enum VerificationPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent',
}

// AI forensics results interface
export interface AIForensicsResults {
    jobId: string;
    authenticity: number; // 0-100 score
    tampering: number; // 0-100 score
    confidence: number; // 0-100 score
    details: {
        imageAnalysis?: {
            compression: number;
            noise: number;
            metadata: any;
        };
        textAnalysis?: {
            consistency: number;
            fontAnalysis: any;
            layoutAnalysis: any;
        };
        signatureAnalysis?: {
            authenticity: number;
            comparison: any;
        };
        anomalies: string[];
        processingTime: number;
    };
    modelVersion: string;
    processingNode: string;
}

// Blockchain results interface
export interface BlockchainResults {
    transactionHash: string;
    blockNumber?: number;
    blockHash?: string;
    gasUsed?: number;
    gasPrice?: string;
    timestamp: Date;
    confirmations: number;
    status: 'pending' | 'confirmed' | 'failed';
    network: string;
    contractAddress?: string;
    tokenId?: string;
}

// IPFS results interface
export interface IPFSResults {
    hash: string;
    size: number;
    timestamp: Date;
    gateway: string;
    pinned: boolean;
    replicationNodes: string[];
}

// Manual verification results interface
export interface ManualResults {
    reviewerId: string;
    reviewerName: string;
    decision: 'approved' | 'rejected' | 'needs_review';
    comments: string;
    checklist?: {
        [key: string]: boolean;
    };
    attachments?: string[];
}

// Verification results interface
export interface VerificationResultsData {
    aiForensics?: AIForensicsResults;
    blockchain?: BlockchainResults;
    ipfs?: IPFSResults;
    manual?: ManualResults;
    overall?: {
        score: number; // 0-100 overall confidence score
        status: 'authentic' | 'suspicious' | 'tampered' | 'inconclusive';
        summary: string;
        recommendations: string[];
    };
}

// Verification metadata interface
export interface VerificationMetadata {
    requestedBy: string;
    requestedAt: Date;
    priority: VerificationPriority;
    estimatedCompletionTime?: Date;
    actualCompletionTime?: Date;
    processingTime?: number; // in milliseconds
    retryCount: number;
    errorMessages: string[];
    webhookUrl?: string;
    callbackData?: any;
}

// Verification attributes interface
export interface VerificationAttributes {
    id: string;
    documentId: string;
    userId: string;
    organizationId?: string;
    type: VerificationType;
    status: VerificationStatus;
    priority: VerificationPriority;
    results: VerificationResultsData;
    metadata: VerificationMetadata;
    externalJobId?: string;
    webhookUrl?: string;
    callbackData?: any;
    startedAt: Date;
    completedAt?: Date;
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

// Optional attributes for creation
export interface VerificationCreationAttributes
    extends Optional<
        VerificationAttributes,
        | 'id'
        | 'status'
        | 'priority'
        | 'results'
        | 'metadata'
        | 'createdAt'
        | 'updatedAt'
    > { }

class Verification extends Model<VerificationAttributes, VerificationCreationAttributes> implements VerificationAttributes {
    public id!: string;
    public documentId!: string;
    public userId!: string;
    public organizationId?: string;
    public type!: VerificationType;
    public status!: VerificationStatus;
    public priority!: VerificationPriority;
    public results!: VerificationResultsData;
    public metadata!: VerificationMetadata;
    public externalJobId?: string;
    public webhookUrl?: string;
    public callbackData?: any;
    public startedAt!: Date;
    public completedAt?: Date;
    public expiresAt?: Date;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associations
    public getDocument!: BelongsToGetAssociationMixin<any>;
    public setDocument!: BelongsToSetAssociationMixin<any, string>;
    public getUser!: BelongsToGetAssociationMixin<any>;
    public setUser!: BelongsToSetAssociationMixin<any, string>;
    public getOrganization!: BelongsToGetAssociationMixin<any>;
    public setOrganization!: BelongsToSetAssociationMixin<any, string>;

    public static associations: {
        document: Association<Verification, any>;
        user: Association<Verification, any>;
        organization: Association<Verification, any>;
    };

    // Instance methods
    public isCompleted(): boolean {
        return this.status === VerificationStatus.COMPLETED;
    }

    public isFailed(): boolean {
        return this.status === VerificationStatus.FAILED;
    }

    public isExpired(): boolean {
        return !!(this.expiresAt && this.expiresAt < new Date());
    }

    public getProcessingTime(): number | null {
        if (!this.completedAt) return null;
        return this.completedAt.getTime() - this.startedAt.getTime();
    }

    public updateStatus(status: VerificationStatus, results?: Partial<VerificationResultsData>): void {
        this.status = status;

        if (status === VerificationStatus.COMPLETED || status === VerificationStatus.FAILED) {
            this.completedAt = new Date();
            this.metadata.actualCompletionTime = this.completedAt;
            this.metadata.processingTime = this.getProcessingTime() || 0;
        }

        if (results) {
            this.results = {
                ...this.results,
                ...results,
            };
        }
    }

    public addError(error: string): void {
        this.metadata.errorMessages.push(error);
        this.metadata.retryCount += 1;
    }

    public calculateOverallScore(): number {
        const { aiForensics, blockchain, ipfs, manual } = this.results;
        let totalScore = 0;
        let weightSum = 0;

        // AI forensics has the highest weight
        if (aiForensics) {
            const aiScore = (aiForensics.authenticity + (100 - aiForensics.tampering)) / 2;
            totalScore += aiScore * 0.6; // 60% weight
            weightSum += 0.6;
        }

        // Blockchain verification
        if (blockchain && blockchain.status === 'confirmed') {
            totalScore += 90 * 0.2; // 20% weight, high score for confirmed blockchain
            weightSum += 0.2;
        }

        // IPFS verification
        if (ipfs) {
            totalScore += 80 * 0.1; // 10% weight
            weightSum += 0.1;
        }

        // Manual verification
        if (manual) {
            const manualScore = manual.decision === 'approved' ? 95 : manual.decision === 'rejected' ? 10 : 50;
            totalScore += manualScore * 0.1; // 10% weight
            weightSum += 0.1;
        }

        return weightSum > 0 ? Math.round(totalScore / weightSum) : 0;
    }

    public generateOverallResults(): void {
        const score = this.calculateOverallScore();
        let status: 'authentic' | 'suspicious' | 'tampered' | 'inconclusive';
        let summary: string;
        const recommendations: string[] = [];

        if (score >= 80) {
            status = 'authentic';
            summary = 'Document appears to be authentic with high confidence.';
        } else if (score >= 60) {
            status = 'suspicious';
            summary = 'Document shows some signs of potential tampering or inconsistencies.';
            recommendations.push('Consider additional manual review');
        } else if (score >= 40) {
            status = 'tampered';
            summary = 'Document likely contains tampering or significant alterations.';
            recommendations.push('Reject document or request original');
        } else {
            status = 'inconclusive';
            summary = 'Unable to determine document authenticity with sufficient confidence.';
            recommendations.push('Request additional verification methods');
        }

        this.results.overall = {
            score,
            status,
            summary,
            recommendations,
        };
    }

    public toJSON(): Partial<VerificationAttributes> {
        const values = { ...this.get() } as any;
        // Remove sensitive callback data from JSON output
        if (values.callbackData) {
            values.callbackData = undefined;
        }
        return values;
    }

    // Static methods
    public static async findByDocumentId(documentId: string): Promise<Verification[]> {
        return this.findAll({
            where: { documentId },
            order: [['created_at', 'DESC']],
        });
    }

    public static async findByExternalJobId(jobId: string): Promise<Verification | null> {
        return this.findOne({
            where: { externalJobId: jobId },
        });
    }

    public static async findPendingVerifications(): Promise<Verification[]> {
        return this.findAll({
            where: {
                status: [VerificationStatus.PENDING, VerificationStatus.IN_PROGRESS],
            },
            order: [
                ['priority', 'DESC'],
                ['created_at', 'ASC'],
            ],
        });
    }

    public static async findExpiredVerifications(): Promise<Verification[]> {
        return this.findAll({
            where: {
                expiresAt: {
                    [Op.lt]: new Date(),
                },
                status: [VerificationStatus.PENDING, VerificationStatus.IN_PROGRESS],
            },
        });
    }

    public static getDefaultMetadata(userId: string, priority: VerificationPriority = VerificationPriority.NORMAL): VerificationMetadata {
        return {
            requestedBy: userId,
            requestedAt: new Date(),
            priority,
            retryCount: 0,
            errorMessages: [],
        };
    }
}

// Initialize the model
Verification.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        documentId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'documents',
                key: 'id',
            },
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
        type: {
            type: DataTypes.ENUM(...Object.values(VerificationType)),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(VerificationStatus)),
            defaultValue: VerificationStatus.PENDING,
        },
        priority: {
            type: DataTypes.ENUM(...Object.values(VerificationPriority)),
            defaultValue: VerificationPriority.NORMAL,
        },
        results: {
            type: DataTypes.JSONB,
            defaultValue: {},
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        externalJobId: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        webhookUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isUrl: true,
            },
        },
        callbackData: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        startedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        completedAt: {
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
        modelName: 'Verification',
        tableName: 'verifications',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['document_id'],
            },
            {
                fields: ['user_id'],
            },
            {
                fields: ['organization_id'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['type'],
            },
            {
                fields: ['priority'],
            },
            {
                unique: true,
                fields: ['external_job_id'],
                where: {
                    external_job_id: {
                        [Op.ne]: null,
                    },
                },
            },
            {
                fields: ['started_at'],
            },
            {
                fields: ['expires_at'],
            },
            // Composite indexes for common query patterns
            {
                fields: ['status', 'priority', 'created_at'],
                name: 'idx_verification_status_priority_created',
            },
            {
                fields: ['document_id', 'status'],
                name: 'idx_verification_document_status',
            },
            {
                fields: ['user_id', 'status', 'created_at'],
                name: 'idx_verification_user_status_created',
            },
            {
                fields: ['organization_id', 'type', 'status'],
                name: 'idx_verification_org_type_status',
            },
            // Index for expired verification cleanup queries
            {
                fields: ['expires_at', 'status'],
                name: 'idx_verification_expires_status',
                where: {
                    expires_at: {
                        [Op.ne]: null,
                    },
                },
            },
            // JSONB indexes for results queries
            {
                fields: ['results'],
                using: 'gin',
                name: 'idx_verification_results_gin',
            },
            {
                fields: ['metadata'],
                using: 'gin',
                name: 'idx_verification_metadata_gin',
            },
        ],
        hooks: {
            beforeUpdate: (verification: Verification) => {
                // Auto-generate overall results when verification is completed
                if (verification.changed('status') && verification.status === VerificationStatus.COMPLETED) {
                    verification.generateOverallResults();
                }
            },
        },
    }
);

export default Verification;