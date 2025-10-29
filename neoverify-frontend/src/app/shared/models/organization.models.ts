export interface OrganizationMembership {
    id: string;
    organizationId: string;
    organizationName: string;
    organizationDomain: string;
    organizationLogo?: string;
    role: OrganizationRole;
    status: MembershipStatus;
    joinedAt: Date;
    lastActiveAt?: Date;
    permissions: OrganizationPermission[];
    isDefault: boolean;
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
    // User Management
    MANAGE_USERS = 'users:manage',
    INVITE_USERS = 'users:invite',
    VIEW_USERS = 'users:view',

    // Document Management
    MANAGE_DOCUMENTS = 'documents:manage',
    VERIFY_DOCUMENTS = 'documents:verify',
    VIEW_DOCUMENTS = 'documents:view',

    // Organization Settings
    MANAGE_ORGANIZATION = 'organization:manage',
    VIEW_ORGANIZATION = 'organization:view',
    MANAGE_BILLING = 'billing:manage',

    // API Access
    MANAGE_API_KEYS = 'api:manage',
    USE_API = 'api:use',

    // Audit and Compliance
    VIEW_AUDIT_LOGS = 'audit:view',
    EXPORT_DATA = 'data:export'
}

export interface OrganizationPolicy {
    id: string;
    name: string;
    description: string;
    type: PolicyType;
    scope: PolicyScope;
    isEnforced: boolean;
    settings: PolicySettings;
    createdAt: Date;
    updatedAt: Date;
}

export enum PolicyType {
    SECURITY = 'security',
    NOTIFICATION = 'notification',
    VERIFICATION = 'verification',
    DATA_RETENTION = 'data_retention',
    API_ACCESS = 'api_access'
}

export enum PolicyScope {
    ORGANIZATION = 'organization',
    ROLE_BASED = 'role_based',
    USER_SPECIFIC = 'user_specific'
}

export interface PolicySettings {
    // Security policies
    requireMfa?: boolean;
    passwordPolicy?: PasswordPolicy;
    sessionTimeout?: number; // minutes

    // Notification policies
    allowedNotificationChannels?: ('email' | 'inApp')[];
    mandatoryNotifications?: string[];

    // Verification policies
    defaultVerificationLevel?: 'basic' | 'standard' | 'comprehensive';
    requiredVerificationLevel?: 'basic' | 'standard' | 'comprehensive';
    allowAutoSharing?: boolean;

    // Data retention policies
    documentRetentionDays?: number;
    auditLogRetentionDays?: number;
    autoDeleteEnabled?: boolean;

    // API access policies
    allowedApiScopes?: string[];
    rateLimitOverride?: number;
    apiKeyExpirationDays?: number;
}

export interface PasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number; // number of previous passwords to check
    maxAge: number; // days
}

export interface OrganizationContext {
    membership: OrganizationMembership;
    policies: OrganizationPolicy[];
    effectivePermissions: OrganizationPermission[];
    restrictions: PolicyRestriction[];
}

export interface PolicyRestriction {
    setting: string;
    reason: string;
    policyId: string;
    policyName: string;
    canOverride: boolean;
}

export interface OrganizationSwitchRequest {
    organizationId: string;
}

export interface OrganizationPreferences {
    notifications: OrganizationNotificationPreferences;
    verification: OrganizationVerificationPreferences;
    privacy: OrganizationPrivacyPreferences;
}

export interface OrganizationNotificationPreferences {
    inheritFromOrganization: boolean;
    overrides: {
        [key: string]: boolean;
    };
}

export interface OrganizationVerificationPreferences {
    inheritFromOrganization: boolean;
    overrides: {
        defaultVerificationLevel?: 'basic' | 'standard' | 'comprehensive';
        autoShare?: boolean;
        retentionDays?: number;
    };
}

export interface OrganizationPrivacyPreferences {
    inheritFromOrganization: boolean;
    overrides: {
        profileVisibility?: 'private' | 'organization' | 'public';
        activityVisibility?: 'private' | 'organization';
    };
}

export interface OrganizationSettingsUpdateRequest {
    organizationId: string;
    preferences: OrganizationPreferences;
}

export interface OrganizationSettingsResponse {
    success: boolean;
    message: string;
    preferences?: OrganizationPreferences;
    context?: OrganizationContext;
}