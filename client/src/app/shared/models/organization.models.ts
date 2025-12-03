import { z } from 'zod';

// Subscription tier enumeration
export enum SubscriptionTier {
    FREE = 'free',
    BASIC = 'basic',
    PROFESSIONAL = 'professional',
    ENTERPRISE = 'enterprise',
}

export interface InviteUserRequest {
  email: string;
  role: string;
}

export interface OrganizationSettingsResponse {
    success: boolean;
    message: string;
    preferences: Partial<OrganizationPreferences>;
}

// Organization settings interface
export interface OrganizationSettings {
    // General settings
    allowPublicDocuments: boolean;
    requireEmailVerification: boolean;
    enableMfaForAllUsers: boolean;
    requireMfa: boolean;
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

// Organization interface (alias for OrganizationDetails)
export interface Organization {
    id: string;
    name: string;
    domain: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
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

// orgnizational policy interface
export interface OrganizationPolicy {
    id: string;
    name: string;
    description: string;
    scope: string;
    isEnforced: boolean;
    settings?: OrganizationSettings;
    organizationId: string;
    type: PolicyType;
    policy: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface OrganizationRestriction {
    setting: string;
    reason: string;
    policyId: string;
    policyName: string;
    canOverride: boolean;
}

// interface for organization context switch request
export interface OrganizationContext {
    membership: OrganizationMembership;
    policies: Partial<OrganizationPolicy[]>;
    preferences: OrganizationPreferences | undefined;
    effectivePermissions: OrganizationPermission[];
    restrictions: OrganizationRestriction[];
}

// Additional organization types
export interface OrganizationMembership {
    id: string;
    organizationId: string;
    userId: string;
    role: OrganizationRole;
    status: MembershipStatus;
    permissions: OrganizationPermission[];
    joinedAt: Date;
    updatedAt?: Date;
    isDefault?: boolean;
    organizationName?: string;
    organizationLogo?: string;
    organizationDomain?: string;
    lastActiveAt?: Date;
}

export interface OrganizationPreferences {
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
        inheritFromOrganization: boolean
    };
    privacy: {
        profileVisible: boolean;
        activityVisible: boolean;
    };
    language: string;
    timezone: string;
}

export enum OrganizationRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MANAGER = 'manager',
    MEMBER = 'member',
    VIEWER = 'viewer'
}

export enum MembershipStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    SUSPENDED = 'suspended',
    INACTIVE = 'inactive'
}

export enum OrganizationPermission {
    READ_DOCUMENTS = 'read_documents',
    WRITE_DOCUMENTS = 'write_documents',
    DELETE_DOCUMENTS = 'delete_documents',
    MANAGE_USERS = 'manage_users',
    MANAGE_SETTINGS = 'manage_settings',
    MANAGE_BILLING = 'manage_billing',
    VIEW_ANALYTICS = 'view_analytics',
    VIEW_AUDIT_LOGS = 'view_audit_logs',
    MANAGE_ORGANIZATION = 'manage_organization',
    MANAGE_API_KEYS = 'manage_api_keys',
    MANAGE_DOCUMENTS = 'manage_documents',
    VIEW_ORGANIZATION = 'view_organization',
    EXPORT_DATA = 'export_data',
    VERIFY_DOCUMENTS = 'verify_document',
    VIEW_DOCUMENTS = 'view_documents',
    USE_API = 'use_api'
}

export enum PolicyType {
    DOCUMENT_RETENTION = 'document_retention',
    ACCESS_CONTROL = 'access_control',
    DATA_PRIVACY = 'data_privacy',
    SECURITY = 'security',
    NOTIFICATION = 'notification',
    VERIFICATION = 'verification',
    DATA_RETENTION = 'data_retention',
    API_ACCESS = 'api_access'
}

export interface OrganizationSettingsUpdateRequest {
    organizationId:string;
    settings?: Partial<OrganizationSettings>;
    preferences?: Partial<OrganizationPreferences>;
}
