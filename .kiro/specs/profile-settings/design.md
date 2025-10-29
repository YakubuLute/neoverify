# Profile Settings Design Document

## Overview

The Profile Settings feature will be enhanced to provide a comprehensive user management interface within the NeoVerify document verification platform. The design builds upon the existing Angular standalone component architecture using PrimeNG components, reactive forms, and signal-based state management.

The enhanced profile settings will be organized into multiple sections using a tabbed interface, providing users with intuitive access to different categories of settings while maintaining the existing responsive design patterns.

## Architecture

### Component Structure

```
ProfileComponent (Enhanced)
├── ProfileTabsComponent (New)
│   ├── BasicInfoTabComponent (Enhanced existing)
│   ├── SecurityTabComponent (Enhanced existing)
│   ├── NotificationTabComponent (New)
│   ├── VerificationTabComponent (New)
│   ├── ApiKeysTabComponent (New)
│   ├── OrganizationTabComponent (New)
│   └── PrivacyTabComponent (New)
├── ProfilePictureUploadComponent (New)
├── SessionManagementComponent (New)
├── MfaSetupDialogComponent (New)
├── ApiKeyDialogComponent (New)
└── AccountDeletionDialogComponent (New)
```

### Service Layer Enhancements

```
ProfileService (New)
├── updateProfile()
├── uploadProfilePicture()
├── getNotificationPreferences()
├── updateNotificationPreferences()
├── getVerificationPreferences()
├── updateVerificationPreferences()
├── exportUserData()
└── initiateAccountDeletion()

ApiKeyService (New)
├── getApiKeys()
├── createApiKey()
├── revokeApiKey()
├── getApiUsageStats()
└── regenerateApiKey()

SessionService (New)
├── getActiveSessions()
├── revokeSession()
├── revokeAllSessions()
└── getSessionDetails()

NotificationService (Enhanced)
├── getPreferences()
├── updatePreferences()
├── testNotification()
└── getNotificationHistory()
```

## Components and Interfaces

### 1. Enhanced ProfileComponent

The main component will be restructured to use a tabbed interface with PrimeNG TabView:

```typescript
interface ProfileTab {
  id: string;
  label: string;
  icon: string;
  component: Type<any>;
  disabled?: boolean;
}

interface ProfileState {
  activeTab: string;
  loading: boolean;
  saving: boolean;
  user: User | null;
  preferences: UserPreferences | null;
}
```

### 2. ProfilePictureUploadComponent

Handles profile picture upload with validation and preview:

```typescript
interface ProfilePictureUpload {
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
}

interface ProfilePictureValidation {
  maxSize: number; // 5MB
  allowedTypes: string[]; // ['image/jpeg', 'image/png', 'image/webp']
  minDimensions: { width: number; height: number };
}
```

### 3. NotificationTabComponent

Manages user notification preferences:

```typescript
interface NotificationPreferences {
  email: {
    documentVerified: boolean;
    documentExpiring: boolean;
    organizationUpdates: boolean;
    securityAlerts: boolean;
    weeklyDigest: boolean;
  };
  inApp: {
    documentVerified: boolean;
    documentExpiring: boolean;
    organizationUpdates: boolean;
    securityAlerts: boolean;
  };
  digestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
}
```

### 4. VerificationTabComponent

Manages document verification preferences:

```typescript
interface VerificationPreferences {
  defaultVerificationLevel: 'basic' | 'standard' | 'comprehensive';
  autoShare: {
    enabled: boolean;
    recipients: string[];
    includeDetails: boolean;
  };
  retention: {
    documents: number; // days
    reports: number;   // days
    autoDelete: boolean;
  };
  notifications: {
    onCompletion: boolean;
    onFailure: boolean;
    onExpiration: boolean;
  };
  templates: {
    defaultTemplate: string | null;
    autoApplyTemplate: boolean;
  };
}
```

### 5. ApiKeysTabComponent

Manages API keys for programmatic access:

```typescript
interface ApiKeyDisplay extends ApiKey {
  maskedKey: string;
  usageStats: {
    requestsThisMonth: number;
    lastRequest: Date | null;
    rateLimitRemaining: number;
  };
}

interface ApiKeyCreation {
  name: string;
  scopes: ApiScope[];
  expiresAt: Date | null;
  rateLimit: number;
  description?: string;
}
```

### 6. SessionManagementComponent

Displays and manages active user sessions:

```typescript
interface UserSession {
  id: string;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
  };
  location: {
    ip: string;
    city: string;
    country: string;
  };
  createdAt: Date;
  lastActivity: Date;
  isCurrent: boolean;
}
```

### 7. MfaSetupDialogComponent

Handles MFA setup and management:

```typescript
interface MfaSetup {
  qrCode: string;
  backupCodes: string[];
  verificationCode: string;
  step: 'setup' | 'verify' | 'complete';
}

interface MfaDevice {
  id: string;
  name: string;
  type: 'totp' | 'sms' | 'email';
  createdAt: Date;
  lastUsed: Date | null;
}
```

## Data Models

### Enhanced User Model

```typescript
interface User {
  // Existing fields...
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // New fields
  avatar?: string;
  timezone: string;
  language: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'auto';
  profileCompleteness: number; // 0-100
  lastProfileUpdate: Date;
  preferences: UserPreferences;
}
```

### New UserPreferences Model

```typescript
interface UserPreferences {
  notifications: NotificationPreferences;
  verification: VerificationPreferences;
  privacy: PrivacyPreferences;
  display: DisplayPreferences;
}

interface PrivacyPreferences {
  dataCollection: {
    analytics: boolean;
    performance: boolean;
    marketing: boolean;
  };
  sharing: {
    profileVisibility: 'private' | 'organization' | 'public';
    activityVisibility: 'private' | 'organization';
  };
  retention: {
    autoDeleteInactive: boolean;
    inactivityPeriod: number; // days
  };
}

interface DisplayPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  density: 'compact' | 'comfortable' | 'spacious';
}
```

## Error Handling

### Validation Strategy

1. **Client-side Validation**: Real-time form validation using Angular reactive forms
2. **Server-side Validation**: API response validation with detailed error messages
3. **File Upload Validation**: Size, type, and dimension validation for profile pictures
4. **Security Validation**: Password strength, MFA code format, API key permissions

### Error Types

```typescript
interface ProfileError {
  field?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

enum ProfileErrorCodes {
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  MFA_REQUIRED = 'MFA_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ORGANIZATION_POLICY_VIOLATION = 'ORGANIZATION_POLICY_VIOLATION'
}
```

### Error Recovery

- **Automatic Retry**: For network-related failures
- **Form State Preservation**: Maintain form data during errors
- **Progressive Enhancement**: Graceful degradation for optional features
- **User Guidance**: Clear instructions for resolving errors

## Testing Strategy

### Unit Testing

1. **Component Testing**: Test each tab component independently
2. **Service Testing**: Mock API calls and test business logic
3. **Form Validation Testing**: Test all validation scenarios
4. **State Management Testing**: Test signal updates and computed values

### Integration Testing

1. **Tab Navigation**: Test switching between tabs preserves state
2. **File Upload Flow**: Test complete profile picture upload process
3. **MFA Setup Flow**: Test complete MFA enablement process
4. **API Key Management**: Test create, view, and revoke operations

### E2E Testing

1. **Complete Profile Update**: Test updating all profile sections
2. **Security Settings**: Test password change and MFA setup
3. **Notification Preferences**: Test preference updates and validation
4. **Account Deletion**: Test account deletion confirmation flow

### Accessibility Testing

1. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
2. **Screen Reader Support**: Test with NVDA/JAWS for proper announcements
3. **Color Contrast**: Verify WCAG AA compliance for all text and backgrounds
4. **Focus Management**: Test focus handling in dialogs and tab navigation

## Implementation Phases

### Phase 1: Core Enhancement
- Enhance existing BasicInfoTab and SecurityTab components
- Implement ProfilePictureUpload component
- Add tabbed navigation structure
- Implement basic form validation and error handling

### Phase 2: Notification & Verification Preferences
- Implement NotificationTabComponent
- Implement VerificationTabComponent
- Add notification preference management
- Add verification default settings

### Phase 3: Advanced Features
- Implement ApiKeysTabComponent
- Implement SessionManagementComponent
- Add MFA setup dialog
- Implement organization-specific settings

### Phase 4: Privacy & Data Management
- Implement PrivacyTabComponent
- Add data export functionality
- Implement account deletion flow
- Add privacy preference controls

### Phase 5: Polish & Optimization
- Implement loading states and animations
- Add comprehensive error handling
- Optimize performance and bundle size
- Complete accessibility improvements