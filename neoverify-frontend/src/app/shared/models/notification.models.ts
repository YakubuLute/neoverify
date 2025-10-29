export interface NotificationPreferences {
    email: EmailNotificationPreferences;
    inApp: InAppNotificationPreferences;
    digestFrequency: DigestFrequency;
    quietHours: QuietHoursSettings;
}

export interface EmailNotificationPreferences {
    documentVerified: boolean;
    documentExpiring: boolean;
    organizationUpdates: boolean;
    securityAlerts: boolean;
    weeklyDigest: boolean;
}

export interface InAppNotificationPreferences {
    documentVerified: boolean;
    documentExpiring: boolean;
    organizationUpdates: boolean;
    securityAlerts: boolean;
}

export type DigestFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

export interface QuietHoursSettings {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
}

export interface NotificationCategory {
    id: keyof EmailNotificationPreferences;
    label: string;
    description: string;
    icon: string;
    emailKey: keyof EmailNotificationPreferences;
    inAppKey: keyof InAppNotificationPreferences;
}

export interface NotificationTestRequest {
    category: keyof EmailNotificationPreferences;
    channel: 'email' | 'inApp';
}

export interface NotificationTestResponse {
    success: boolean;
    message: string;
    testId?: string;
}

export interface NotificationHistoryItem {
    id: string;
    category: string;
    channel: 'email' | 'inApp';
    status: 'sent' | 'delivered' | 'failed' | 'pending';
    subject: string;
    sentAt: Date;
    deliveredAt?: Date;
    errorMessage?: string;
}

export interface NotificationPreferencesUpdateRequest {
    preferences: NotificationPreferences;
}

export interface NotificationPreferencesResponse {
    success: boolean;
    message: string;
    preferences?: NotificationPreferences;
}