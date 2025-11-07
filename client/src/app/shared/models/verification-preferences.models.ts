export interface VerificationPreferences {
    defaultVerificationLevel: VerificationLevel;
    autoShare: AutoShareSettings;
    retention: RetentionSettings;
    notifications: VerificationNotificationSettings;
    templates: TemplateSettings;
}

export enum VerificationLevel {
    BASIC = 'basic',
    STANDARD = 'standard',
    COMPREHENSIVE = 'comprehensive'
}

export interface AutoShareSettings {
    enabled: boolean;
    recipients: ShareRecipient[];
    includeDetails: boolean;
    shareOnCompletion: boolean;
    shareOnFailure: boolean;
}

export interface ShareRecipient {
    id: string;
    email: string;
    name: string;
    type: RecipientType;
    permissions: SharePermissions;
}

export enum RecipientType {
    USER = 'user',
    EXTERNAL = 'external',
    ORGANIZATION = 'organization'
}

export interface SharePermissions {
    canView: boolean;
    canDownload: boolean;
    canComment: boolean;
}

export interface RetentionSettings {
    documents: number; // days
    reports: number;   // days
    autoDelete: boolean;
    notifyBeforeDelete: boolean;
    deleteWarningDays: number;
}

export interface VerificationNotificationSettings {
    onCompletion: boolean;
    onFailure: boolean;
    onExpiration: boolean;
    onStatusChange: boolean;
    digestEnabled: boolean;
    digestFrequency: DigestFrequency;
}

export enum DigestFrequency {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly'
}

export interface TemplateSettings {
    defaultTemplate: string | null;
    autoApplyTemplate: boolean;
    templatePreferences: TemplatePreference[];
}

export interface TemplatePreference {
    documentType: string;
    templateId: string;
    autoApply: boolean;
}

export interface OrganizationPolicy {
    id: string;
    name: string;
    description: string;
    type: PolicyType;
    value: any;
    isRestricted: boolean;
    overridesUserPreference: boolean;
}

export enum PolicyType {
    VERIFICATION_LEVEL = 'verification_level',
    RETENTION_PERIOD = 'retention_period',
    AUTO_SHARING = 'auto_sharing',
    TEMPLATE_USAGE = 'template_usage',
    NOTIFICATION_SETTINGS = 'notification_settings'
}

export interface VerificationTemplate {
    id: string;
    name: string;
    description: string;
    documentTypes: string[];
    verificationLevel: VerificationLevel;
    isDefault: boolean;
    isActive: boolean;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface VerificationPreferencesUpdateRequest {
    defaultVerificationLevel?: VerificationLevel;
    autoShare?: Partial<AutoShareSettings>;
    retention?: Partial<RetentionSettings>;
    notifications?: Partial<VerificationNotificationSettings>;
    templates?: Partial<TemplateSettings>;
}

export interface VerificationPreferencesResponse {
    success: boolean;
    message: string;
    preferences?: VerificationPreferences;
    organizationPolicies?: OrganizationPolicy[];
}