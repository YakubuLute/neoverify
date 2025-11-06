import { z } from 'zod';

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

// Subscription limits interface
export interface SubscriptionLimits {
    maxDocuments: number;
    maxStorage: number;
    maxVerifications: number;
    maxUsers: number;
    maxApiCalls: number;
}

// Organization interface
export interface OrganizationDetails {
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
    createdAt: Date;
    updatedAt: Date;
}

// Organization creation request interface
export interface CreateOrganizationRequest {
    name: string;
    domain: string;
    description?: string;
    website?: string;
    industry?: string;
    size?: string;
    country?: string;
    timezone?: string;
    billingEmail: string;
}

// Organization update request interface
export interface UpdateOrganizationRequest {
    name?: string;
    description?: string;
    website?: string;
    industry?: string;
    size?: string;
    country?: string;
    timezone?: string;
    settings?: Partial<OrganizationSettings>;
}

// Organization subscription update request interface
export interface UpdateSubscriptionRequest {
    subscriptionTier: SubscriptionTier;
    paymentMethodId?: string;
    billingAddress?: BillingInfo['billingAddress'];
}

// Organization member interface
export interface OrganizationMember {
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    joinedAt: Date;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
        lastLoginAt?: Date;
        isActive: boolean;
    };
}

// Organization invitation interface
export interface OrganizationInvitation {
    id: string;
    organizationId: string;
    email: string;
    role: string;
    invitedBy: string;
    token: string;
    expiresAt: Date;
    acceptedAt?: Date;
    createdAt: Date;
}

// Organization invitation request interface
export interface OrganizationInviteUserRequest {
    email: string;
    role: string;
    message?: string;
}

// Organization statistics interface
export interface OrganizationStatistics {
    totalUsers: number;
    activeUsers: number;
    totalDocuments: number;
    verifiedDocuments: number;
    storageUsed: number;
    apiCallsThisMonth: number;
    subscriptionLimits: SubscriptionLimits;
    usagePercentages: {
        documents: number;
        storage: number;
        verifications: number;
        users: number;
        apiCalls: number;
    };
}

// Zod Schemas for Runtime Validation
export const OrganizationSettingsSchema = z.object({
    allowPublicDocuments: z.boolean(),
    requireEmailVerification: z.boolean(),
    enableMfaForAllUsers: z.boolean(),
    maxDocumentSize: z.number().min(0),
    allowedFileTypes: z.array(z.string()),
    autoVerifyDocuments: z.boolean(),
    retentionPeriod: z.number().min(0),
    passwordPolicy: z.object({
        minLength: z.number().min(1),
        requireUppercase: z.boolean(),
        requireLowercase: z.boolean(),
        requireNumbers: z.boolean(),
        requireSpecialChars: z.boolean(),
        maxAge: z.number().min(0)
    }),
    emailNotifications: z.object({
        documentUploaded: z.boolean(),
        verificationCompleted: z.boolean(),
        userInvited: z.boolean(),
        weeklyReports: z.boolean()
    }),
    apiRateLimit: z.number().min(1),
    webhookUrl: z.string().url().optional(),
    webhookSecret: z.string().optional(),
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().optional(),
    customDomain: z.string().optional()
});

export const BillingInfoSchema = z.object({
    subscriptionId: z.string().optional(),
    customerId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    billingEmail: z.string().email(),
    billingAddress: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string()
    }).optional(),
    taxId: z.string().optional(),
    nextBillingDate: z.string().datetime().optional(),
    subscriptionStatus: z.enum(['active', 'past_due', 'canceled', 'unpaid'])
});

export const UsageStatsSchema = z.object({
    documentsUploaded: z.number().min(0),
    verificationsPerformed: z.number().min(0),
    storageUsed: z.number().min(0),
    apiCallsThisMonth: z.number().min(0),
    activeUsers: z.number().min(0),
    lastResetDate: z.string().datetime()
});

export const SubscriptionLimitsSchema = z.object({
    maxDocuments: z.number(),
    maxStorage: z.number(),
    maxVerifications: z.number(),
    maxUsers: z.number(),
    maxApiCalls: z.number()
});

export const OrganizationSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    domain: z.string().min(1).max(100),
    description: z.string().optional(),
    website: z.string().url().optional(),
    industry: z.string().optional(),
    size: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string(),
    subscriptionTier: z.nativeEnum(SubscriptionTier),
    settings: OrganizationSettingsSchema,
    billingInfo: BillingInfoSchema,
    usageStats: UsageStatsSchema,
    isActive: z.boolean(),
    trialEndsAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

export const CreateOrganizationRequestSchema = z.object({
    name: z.string().min(1).max(100),
    domain: z.string().min(1).max(100),
    description: z.string().optional(),
    website: z.string().url().optional(),
    industry: z.string().optional(),
    size: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().optional(),
    billingEmail: z.string().email()
});

export const UpdateOrganizationRequestSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    website: z.string().url().optional(),
    industry: z.string().optional(),
    size: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().optional(),
    settings: OrganizationSettingsSchema.partial().optional()
});

export const OrganizationMemberSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    organizationId: z.string().uuid(),
    role: z.string(),
    joinedAt: z.string().datetime(),
    user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        profilePicture: z.string().url().optional(),
        lastLoginAt: z.string().datetime().optional(),
        isActive: z.boolean()
    })
});

export const OrganizationInvitationSchema = z.object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    email: z.string().email(),
    role: z.string(),
    invitedBy: z.string().uuid(),
    token: z.string(),
    expiresAt: z.string().datetime(),
    acceptedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime()
});

export const OrganizationStatisticsSchema = z.object({
    totalUsers: z.number(),
    activeUsers: z.number(),
    totalDocuments: z.number(),
    verifiedDocuments: z.number(),
    storageUsed: z.number(),
    apiCallsThisMonth: z.number(),
    subscriptionLimits: SubscriptionLimitsSchema,
    usagePercentages: z.object({
        documents: z.number().min(0).max(100),
        storage: z.number().min(0).max(100),
        verifications: z.number().min(0).max(100),
        users: z.number().min(0).max(100),
        apiCalls: z.number().min(0).max(100)
    })
});