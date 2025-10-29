import {
    DataTypes,
    Model,
    Optional,
    Association,
    HasManyGetAssociationsMixin,
} from 'sequelize';
import database from '../config/database';

// Subscription tier enumeration
export enum SubscriptionTier {
    FREE = 'free',
    BASIC = 'basic',
    PROFESSIONAL = 'professional',
    ENTERPRISE = 'enterprise',
}

// Organization settings interface
export interface OrganizationSettings {
    // General settings
    allowPublicDocuments: boolean;
    requireEmailVerification: boolean;
    enableMfaForAllUsers: boolean;

    // Document settings
    maxDocumentSize: number; // in bytes
    allowedFileTypes: string[];
    autoVerifyDocuments: boolean;
    retentionPeriod: number; // in days, 0 = indefinite

    // Security settings
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        maxAge: number; // in days, 0 = no expiration
    };

    // Notification settings
    emailNotifications: {
        documentUploaded: boolean;
        verificationCompleted: boolean;
        userInvited: boolean;
        weeklyReports: boolean;
    };

    // API settings
    apiRateLimit: number; // requests per minute
    webhookUrl?: string;
    webhookSecret?: string;

    // Branding
    logoUrl?: string;
    primaryColor?: string;
    customDomain?: string;
}

// Billing information interface
export interface BillingInfo {
    subscriptionId?: string;
    customerId?: string;
    paymentMethodId?: string;
    billingEmail: string;
    billingAddress?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    taxId?: string;
    nextBillingDate?: Date;
    subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'unpaid';
}

// Usage statistics interface
export interface UsageStats {
    documentsUploaded: number;
    verificationsPerformed: number;
    storageUsed: number; // in bytes
    apiCallsThisMonth: number;
    activeUsers: number;
    lastResetDate: Date;
}

// Organization attributes interface
export interface OrganizationAttributes {
    id: string;
    name: string;
    domain: string;
    description?: string;
    website?: string;
    industry?: string;
    size?: string;
    country?: string;
    timezone: string;
    subscriptionTier: SubscriptionTier;
    settings: OrganizationSettings;
    billingInfo: BillingInfo;
    usageStats: UsageStats;
    isActive: boolean;
    trialEndsAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

// Optional attributes for creation
export interface OrganizationCreationAttributes
    extends Optional<
        OrganizationAttributes,
        | 'id'
        | 'subscriptionTier'
        | 'settings'
        | 'billingInfo'
        | 'usageStats'
        | 'isActive'
        | 'timezone'
        | 'createdAt'
        | 'updatedAt'
        | 'deletedAt'
    > { }

class Organization extends Model<OrganizationAttributes, OrganizationCreationAttributes> implements OrganizationAttributes {
    public id!: string;
    public name!: string;
    public domain!: string;
    public description?: string;
    public website?: string;
    public industry?: string;
    public size?: string;
    public country?: string;
    public timezone!: string;
    public subscriptionTier!: SubscriptionTier;
    public settings!: OrganizationSettings;
    public billingInfo!: BillingInfo;
    public usageStats!: UsageStats;
    public isActive!: boolean;
    public trialEndsAt?: Date;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt?: Date;

    // Associations
    public getUsers!: HasManyGetAssociationsMixin<any>;
    public getDocuments!: HasManyGetAssociationsMixin<any>;

    public static associations: {
        users: Association<Organization, any>;
        documents: Association<Organization, any>;
    };

    // Instance methods
    public isTrialExpired(): boolean {
        return !!(this.trialEndsAt && this.trialEndsAt < new Date());
    }

    public isSubscriptionActive(): boolean {
        return this.billingInfo.subscriptionStatus === 'active';
    }

    public canUploadDocument(fileSize: number): boolean {
        if (!this.isActive || this.isTrialExpired()) return false;

        // Check file size limit
        if (fileSize > this.settings.maxDocumentSize) return false;

        // Check subscription limits
        const limits = this.getSubscriptionLimits();
        if (this.usageStats.documentsUploaded >= limits.maxDocuments) return false;
        if (this.usageStats.storageUsed + fileSize > limits.maxStorage) return false;

        return true;
    }

    public canPerformVerification(): boolean {
        if (!this.isActive || this.isTrialExpired()) return false;

        const limits = this.getSubscriptionLimits();
        return this.usageStats.verificationsPerformed < limits.maxVerifications;
    }

    public getSubscriptionLimits(): {
        maxDocuments: number;
        maxStorage: number;
        maxVerifications: number;
        maxUsers: number;
        maxApiCalls: number;
    } {
        switch (this.subscriptionTier) {
            case SubscriptionTier.FREE:
                return {
                    maxDocuments: 10,
                    maxStorage: 100 * 1024 * 1024, // 100MB
                    maxVerifications: 5,
                    maxUsers: 1,
                    maxApiCalls: 100,
                };
            case SubscriptionTier.BASIC:
                return {
                    maxDocuments: 100,
                    maxStorage: 1024 * 1024 * 1024, // 1GB
                    maxVerifications: 50,
                    maxUsers: 5,
                    maxApiCalls: 1000,
                };
            case SubscriptionTier.PROFESSIONAL:
                return {
                    maxDocuments: 1000,
                    maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
                    maxVerifications: 500,
                    maxUsers: 25,
                    maxApiCalls: 10000,
                };
            case SubscriptionTier.ENTERPRISE:
                return {
                    maxDocuments: -1, // unlimited
                    maxStorage: -1, // unlimited
                    maxVerifications: -1, // unlimited
                    maxUsers: -1, // unlimited
                    maxApiCalls: -1, // unlimited
                };
            default:
                return this.getSubscriptionLimits(); // fallback to FREE
        }
    }

    public async incrementUsage(type: 'documents' | 'verifications' | 'apiCalls', amount: number = 1): Promise<void> {
        switch (type) {
            case 'documents':
                this.usageStats.documentsUploaded += amount;
                break;
            case 'verifications':
                this.usageStats.verificationsPerformed += amount;
                break;
            case 'apiCalls':
                this.usageStats.apiCallsThisMonth += amount;
                break;
        }
        await this.save();
    }

    public async updateStorageUsage(bytes: number): Promise<void> {
        this.usageStats.storageUsed += bytes;
        await this.save();
    }

    public async resetMonthlyUsage(): Promise<void> {
        this.usageStats.apiCallsThisMonth = 0;
        this.usageStats.lastResetDate = new Date();
        await this.save();
    }

    public toJSON(): Partial<OrganizationAttributes> {
        const values = { ...this.get() };
        // Remove sensitive fields from JSON output
        if (values.settings?.webhookSecret) {
            values.settings = {
                ...values.settings,
                webhookSecret: undefined,
            };
        }
        if (values.billingInfo?.paymentMethodId) {
            values.billingInfo = {
                ...values.billingInfo,
                paymentMethodId: undefined,
            };
        }
        return values;
    }

    // Static methods
    public static async findByDomain(domain: string): Promise<Organization | null> {
        return this.findOne({
            where: { domain: domain.toLowerCase() },
        });
    }

    public static getDefaultSettings(): OrganizationSettings {
        return {
            allowPublicDocuments: false,
            requireEmailVerification: true,
            enableMfaForAllUsers: false,
            maxDocumentSize: 50 * 1024 * 1024, // 50MB
            allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'txt'],
            autoVerifyDocuments: false,
            retentionPeriod: 0, // indefinite
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: false,
                maxAge: 0, // no expiration
            },
            emailNotifications: {
                documentUploaded: true,
                verificationCompleted: true,
                userInvited: true,
                weeklyReports: false,
            },
            apiRateLimit: 60, // 60 requests per minute
        };
    }

    public static getDefaultBillingInfo(email: string): BillingInfo {
        return {
            billingEmail: email,
            subscriptionStatus: 'active',
        };
    }

    public static getDefaultUsageStats(): UsageStats {
        return {
            documentsUploaded: 0,
            verificationsPerformed: 0,
            storageUsed: 0,
            apiCallsThisMonth: 0,
            activeUsers: 0,
            lastResetDate: new Date(),
        };
    }
}

// Initialize the model
Organization.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [1, 100],
            },
        },
        domain: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isLowercase: true,
                len: [1, 100],
            },
            set(value: string) {
                this.setDataValue('domain', value.toLowerCase());
            },
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        website: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isUrl: true,
            },
        },
        industry: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        size: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        country: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        timezone: {
            type: DataTypes.STRING,
            defaultValue: 'UTC',
        },
        subscriptionTier: {
            type: DataTypes.ENUM(...Object.values(SubscriptionTier)),
            defaultValue: SubscriptionTier.FREE,
        },
        settings: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: Organization.getDefaultSettings(),
        },
        billingInfo: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        usageStats: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: Organization.getDefaultUsageStats(),
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        trialEndsAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize: database.getSequelize(),
        modelName: 'Organization',
        tableName: 'organizations',
        timestamps: true,
        paranoid: true, // Enable soft deletes
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['domain'],
            },
            {
                fields: ['subscription_tier'],
            },
            {
                fields: ['is_active'],
            },
            {
                fields: ['created_at'],
            },
        ],
    }
);

export default Organization;