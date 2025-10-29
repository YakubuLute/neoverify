import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
    OrganizationMembership,
    OrganizationContext,
    OrganizationPolicy,
    OrganizationPreferences,
    OrganizationSwitchRequest,
    OrganizationSettingsUpdateRequest,
    OrganizationSettingsResponse,
    OrganizationRole,
    MembershipStatus,
    OrganizationPermission,
    PolicyType
} from '../../shared/models/organization.models';

@Injectable({
    providedIn: 'root'
})
export class OrganizationService {
    private readonly apiService = inject(ApiService);
    private readonly notificationService = inject(NotificationService);

    // Reactive state
    readonly currentOrganizationContext = signal<OrganizationContext | null>(null);
    readonly userMemberships = signal<OrganizationMembership[]>([]);
    readonly loading = signal<boolean>(false);

    /**
     * Get user's organization memberships
     */
    getUserMemberships(): Observable<OrganizationMembership[]> {
        this.loading.set(true);

        // Mock data for development
        const mockMemberships: OrganizationMembership[] = [
            {
                id: 'membership-1',
                organizationId: 'test-org-id',
                organizationName: 'Test Organization',
                organizationDomain: 'test.com',
                role: OrganizationRole.ADMIN,
                status: MembershipStatus.ACTIVE,
                joinedAt: new Date('2024-01-15'),
                lastActiveAt: new Date(),
                permissions: [
                    OrganizationPermission.MANAGE_USERS,
                    OrganizationPermission.MANAGE_DOCUMENTS,
                    OrganizationPermission.VIEW_ORGANIZATION,
                    OrganizationPermission.MANAGE_API_KEYS,
                    OrganizationPermission.VIEW_AUDIT_LOGS
                ],
                isDefault: true
            },
            {
                id: 'membership-2',
                organizationId: 'acme-corp-id',
                organizationName: 'Acme Corporation',
                organizationDomain: 'acme.com',
                role: OrganizationRole.MEMBER,
                status: MembershipStatus.ACTIVE,
                joinedAt: new Date('2024-02-20'),
                lastActiveAt: new Date(Date.now() - 86400000), // 1 day ago
                permissions: [
                    OrganizationPermission.VERIFY_DOCUMENTS,
                    OrganizationPermission.VIEW_DOCUMENTS,
                    OrganizationPermission.USE_API
                ],
                isDefault: false
            }
        ];

        return of(mockMemberships).pipe(
            tap(memberships => {
                this.userMemberships.set(memberships);
                this.loading.set(false);
            }),
            catchError(error => {
                this.loading.set(false);
                this.notificationService.error('Failed to load organization memberships');
                return throwError(() => error);
            })
        );
    }

    /**
     * Get organization context for current or specified organization
     */
    getOrganizationContext(organizationId?: string): Observable<OrganizationContext> {
        this.loading.set(true);

        // Mock organization context
        const mockPolicies: OrganizationPolicy[] = [
            {
                id: 'policy-1',
                name: 'MFA Requirement',
                description: 'All users must enable multi-factor authentication',
                type: PolicyType.SECURITY,
                scope: 'organization' as any,
                isEnforced: true,
                settings: {
                    requireMfa: true,
                    passwordPolicy: {
                        minLength: 12,
                        requireUppercase: true,
                        requireLowercase: true,
                        requireNumbers: true,
                        requireSpecialChars: true,
                        preventReuse: 5,
                        maxAge: 90
                    }
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-15')
            },
            {
                id: 'policy-2',
                name: 'Document Retention',
                description: 'Automatic document deletion after 365 days',
                type: PolicyType.DATA_RETENTION,
                scope: 'organization' as any,
                isEnforced: true,
                settings: {
                    documentRetentionDays: 365,
                    auditLogRetentionDays: 2555, // 7 years
                    autoDeleteEnabled: true
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-10')
            },
            {
                id: 'policy-3',
                name: 'Verification Standards',
                description: 'Minimum verification level requirements',
                type: PolicyType.VERIFICATION,
                scope: 'organization' as any,
                isEnforced: true,
                settings: {
                    requiredVerificationLevel: 'standard',
                    allowAutoSharing: false
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-02-01')
            }
        ];

        const currentMembership = this.userMemberships().find(m =>
            organizationId ? m.organizationId === organizationId : m.isDefault
        );

        if (!currentMembership) {
            return throwError(() => new Error('Organization membership not found'));
        }

        const mockContext: OrganizationContext = {
            membership: currentMembership,
            policies: mockPolicies,
            effectivePermissions: currentMembership.permissions,
            restrictions: [
                {
                    setting: 'mfaEnabled',
                    reason: 'Organization policy requires MFA for all users',
                    policyId: 'policy-1',
                    policyName: 'MFA Requirement',
                    canOverride: false
                },
                {
                    setting: 'verification.autoShare',
                    reason: 'Organization policy prohibits automatic document sharing',
                    policyId: 'policy-3',
                    policyName: 'Verification Standards',
                    canOverride: false
                }
            ]
        };

        return of(mockContext).pipe(
            tap(context => {
                this.currentOrganizationContext.set(context);
                this.loading.set(false);
            }),
            catchError(error => {
                this.loading.set(false);
                this.notificationService.error('Failed to load organization context');
                return throwError(() => error);
            })
        );
    }

    /**
     * Switch to different organization context
     */
    switchOrganization(request: OrganizationSwitchRequest): Observable<OrganizationContext> {
        this.loading.set(true);

        return this.getOrganizationContext(request.organizationId).pipe(
            tap(context => {
                this.notificationService.success(`Switched to ${context.membership.organizationName}`);
            })
        );
    }

    /**
     * Get organization-specific preferences
     */
    getOrganizationPreferences(organizationId?: string): Observable<OrganizationPreferences> {
        // Mock organization preferences
        const mockPreferences: OrganizationPreferences = {
            notifications: {
                inheritFromOrganization: true,
                overrides: {}
            },
            verification: {
                inheritFromOrganization: false,
                overrides: {
                    defaultVerificationLevel: 'comprehensive',
                    autoShare: false,
                    retentionDays: 180
                }
            },
            privacy: {
                inheritFromOrganization: true,
                overrides: {}
            }
        };

        return of(mockPreferences).pipe(
            catchError(error => {
                this.notificationService.error('Failed to load organization preferences');
                return throwError(() => error);
            })
        );
    }

    /**
     * Update organization-specific preferences
     */
    updateOrganizationPreferences(request: OrganizationSettingsUpdateRequest): Observable<OrganizationSettingsResponse> {
        this.loading.set(true);

        // Mock successful update
        const response: OrganizationSettingsResponse = {
            success: true,
            message: 'Organization preferences updated successfully',
            preferences: request.preferences
        };

        return of(response).pipe(
            tap(response => {
                this.loading.set(false);
                if (response.success) {
                    this.notificationService.success(response.message);
                } else {
                    this.notificationService.error(response.message);
                }
            }),
            catchError(error => {
                this.loading.set(false);
                this.notificationService.error('Failed to update organization preferences');
                return throwError(() => error);
            })
        );
    }

    /**
     * Check if user has specific permission in current organization
     */
    hasPermission(permission: OrganizationPermission): boolean {
        const context = this.currentOrganizationContext();
        return context?.effectivePermissions.includes(permission) || false;
    }

    /**
     * Check if user has any of the specified permissions
     */
    hasAnyPermission(permissions: OrganizationPermission[]): boolean {
        const context = this.currentOrganizationContext();
        if (!context) return false;

        return permissions.some(permission =>
            context.effectivePermissions.includes(permission)
        );
    }

    /**
     * Check if a setting is restricted by organization policy
     */
    isSettingRestricted(settingPath: string): boolean {
        const context = this.currentOrganizationContext();
        return context?.restrictions.some(r => r.setting === settingPath) || false;
    }

    /**
     * Get restriction details for a setting
     */
    getSettingRestriction(settingPath: string) {
        const context = this.currentOrganizationContext();
        return context?.restrictions.find(r => r.setting === settingPath);
    }

    /**
     * Get policies by type
     */
    getPoliciesByType(type: PolicyType) {
        const context = this.currentOrganizationContext();
        return context?.policies.filter(p => p.type === type) || [];
    }

    /**
     * Get current organization membership
     */
    getCurrentMembership(): OrganizationMembership | null {
        return this.currentOrganizationContext()?.membership || null;
    }

    /**
     * Check if user is organization admin or owner
     */
    isOrganizationAdmin(): boolean {
        const membership = this.getCurrentMembership();
        return membership?.role === OrganizationRole.ADMIN ||
            membership?.role === OrganizationRole.OWNER;
    }

    /**
     * Get formatted role display name
     */
    getRoleDisplayName(role: OrganizationRole): string {
        const roleNames = {
            [OrganizationRole.OWNER]: 'Owner',
            [OrganizationRole.ADMIN]: 'Administrator',
            [OrganizationRole.MANAGER]: 'Manager',
            [OrganizationRole.MEMBER]: 'Member',
            [OrganizationRole.VIEWER]: 'Viewer'
        };
        return roleNames[role] || role;
    }

    /**
     * Get formatted permission display name
     */
    getPermissionDisplayName(permission: OrganizationPermission): string {
        const permissionNames = {
            [OrganizationPermission.MANAGE_USERS]: 'Manage Users',
            [OrganizationPermission.INVITE_USERS]: 'Invite Users',
            [OrganizationPermission.VIEW_USERS]: 'View Users',
            [OrganizationPermission.MANAGE_DOCUMENTS]: 'Manage Documents',
            [OrganizationPermission.VERIFY_DOCUMENTS]: 'Verify Documents',
            [OrganizationPermission.VIEW_DOCUMENTS]: 'View Documents',
            [OrganizationPermission.MANAGE_ORGANIZATION]: 'Manage Organization',
            [OrganizationPermission.VIEW_ORGANIZATION]: 'View Organization',
            [OrganizationPermission.MANAGE_BILLING]: 'Manage Billing',
            [OrganizationPermission.MANAGE_API_KEYS]: 'Manage API Keys',
            [OrganizationPermission.USE_API]: 'Use API',
            [OrganizationPermission.VIEW_AUDIT_LOGS]: 'View Audit Logs',
            [OrganizationPermission.EXPORT_DATA]: 'Export Data'
        };
        return permissionNames[permission] || permission;
    }
}  /**

   * Validate setting change against organization policies
   */
validateSettingChange(settingPath: string, newValue: any): { isValid: boolean; reason ?: string; policyId ?: string } {
    const context = this.currentOrganizationContext();
    if (!context) {
        return { isValid: true };
    }

    // Check if setting is restricted
    const restriction = context.restrictions.find(r => r.setting === settingPath);
    if (restriction && !restriction.canOverride) {
        return {
            isValid: false,
            reason: restriction.reason,
            policyId: restriction.policyId
        };
    }

    // Check specific policy validations
    for (const policy of context.policies) {
        if (!policy.isEnforced) continue;

        const validation = this.validateAgainstPolicy(policy, settingPath, newValue);
        if (!validation.isValid) {
            return validation;
        }
    }

    return { isValid: true };
}

  /**
   * Validate a setting change against a specific policy
   */
  private validateAgainstPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason ?: string; policyId ?: string } {
    switch (policy.type) {
        case PolicyType.SECURITY:
            return this.validateSecurityPolicy(policy, settingPath, newValue);
        case PolicyType.VERIFICATION:
            return this.validateVerificationPolicy(policy, settingPath, newValue);
        case PolicyType.NOTIFICATION:
            return this.validateNotificationPolicy(policy, settingPath, newValue);
        case PolicyType.DATA_RETENTION:
            return this.validateDataRetentionPolicy(policy, settingPath, newValue);
        case PolicyType.API_ACCESS:
            return this.validateApiAccessPolicy(policy, settingPath, newValue);
        default:
            return { isValid: true };
    }
}

  /**
   * Validate against security policies
   */
  private validateSecurityPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason ?: string; policyId ?: string } {
    const settings = policy.settings;

    if (settingPath === 'mfaEnabled' && settings.requireMfa && !newValue) {
        return {
            isValid: false,
            reason: 'Organization policy requires MFA to be enabled',
            policyId: policy.id
        };
    }

    if (settingPath.startsWith('password') && settings.passwordPolicy) {
        const passwordPolicy = settings.passwordPolicy;

        if (settingPath === 'password.minLength' && newValue < passwordPolicy.minLength) {
            return {
                isValid: false,
                reason: `Minimum password length must be at least ${passwordPolicy.minLength} characters`,
                policyId: policy.id
            };
        }
    }

    if (settingPath === 'sessionTimeout' && settings.sessionTimeout && newValue > settings.sessionTimeout) {
        return {
            isValid: false,
            reason: `Session timeout cannot exceed ${settings.sessionTimeout} minutes`,
            policyId: policy.id
        };
    }

    return { isValid: true };
}

  /**
   * Validate against verification policies
   */
  private validateVerificationPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason ?: string; policyId ?: string } {
    const settings = policy.settings;

    if (settingPath === 'verification.defaultVerificationLevel' && settings.requiredVerificationLevel) {
        const levelOrder = { 'basic': 1, 'standard': 2, 'comprehensive': 3 };
        const requiredLevel = levelOrder[settings.requiredVerificationLevel as keyof typeof levelOrder];
        const selectedLevel = levelOrder[newValue as keyof typeof levelOrder];

        if (selectedLevel < requiredLevel) {
            return {
                isValid: false,
                reason: `Verification level must be at least ${settings.requiredVerificationLevel}`,
                policyId: policy.id
            };
        }
    }

    if (settingPath === 'verification.autoShare' && settings.allowAutoSharing === false && newValue === true) {
        return {
            isValid: false,
            reason: 'Organization policy prohibits automatic document sharing',
            policyId: policy.id
        };
    }

    return { isValid: true };
}

  /**
   * Validate against notification policies
   */
  private validateNotificationPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason ?: string; policyId ?: string } {
    const settings = policy.settings;

    if (settings.allowedNotificationChannels && settingPath.includes('notification')) {
        const channel = settingPath.includes('email') ? 'email' : 'inApp';
        if (!settings.allowedNotificationChannels.includes(channel) && newValue === true) {
            return {
                isValid: false,
                reason: `${channel} notifications are not allowed by organization policy`,
                policyId: policy.id
            };
        }
    }

    if (settings.mandatoryNotifications && settingPath.includes('notification')) {
        const notificationType = settingPath.split('.').pop();
        if (settings.mandatoryNotifications.includes(notificationType) && newValue === false) {
            return {
                isValid: false,
                reason: `${notificationType} notifications are mandatory and cannot be disabled`,
                policyId: policy.id
            };
        }
    }

    return { isValid: true };
}

  /**
   * Validate against data retention policies
   */
  private validateDataRetentionPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason ?: string; policyId ?: string } {
    const settings = policy.settings;

    if (settingPath === 'verification.retentionDays' && settings.documentRetentionDays) {
        if (newValue > settings.documentRetentionDays) {
            return {
                isValid: false,
                reason: `Document retention cannot exceed ${settings.documentRetentionDays} days`,
                policyId: policy.id
            };
        }
    }

    if (settingPath === 'privacy.autoDelete' && settings.autoDeleteEnabled === true && newValue === false) {
        return {
            isValid: false,
            reason: 'Organization policy requires automatic data deletion to be enabled',
            policyId: policy.id
        };
    }

    return { isValid: true };
}

  /**
   * Validate against API access policies
   */
  private validateApiAccessPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason ?: string; policyId ?: string } {
    const settings = policy.settings;

    if (settingPath === 'apiKey.scopes' && settings.allowedApiScopes) {
        const requestedScopes = Array.isArray(newValue) ? newValue : [newValue];
        const unauthorizedScopes = requestedScopes.filter((scope: string) => !settings.allowedApiScopes.includes(scope));

        if (unauthorizedScopes.length > 0) {
            return {
                isValid: false,
                reason: `API scopes ${unauthorizedScopes.join(', ')} are not allowed by organization policy`,
                policyId: policy.id
            };
        }
    }

    if (settingPath === 'apiKey.rateLimit' && settings.rateLimitOverride && newValue > settings.rateLimitOverride) {
        return {
            isValid: false,
            reason: `API rate limit cannot exceed ${settings.rateLimitOverride} requests per minute`,
            policyId: policy.id
        };
    }

    return { isValid: true };
}

/**
 * Get effective setting value considering organization policies
 */
getEffectiveSettingValue(settingPath: string, userValue: any): any {
    const context = this.currentOrganizationContext();
    if (!context) {
        return userValue;
    }

    // Check if setting is overridden by policy
    for (const policy of context.policies) {
        if (!policy.isEnforced) continue;

        const effectiveValue = this.getPolicyEffectiveValue(policy, settingPath, userValue);
        if (effectiveValue !== undefined) {
            return effectiveValue;
        }
    }

    return userValue;
}

  /**
   * Get effective value from a specific policy
   */
  private getPolicyEffectiveValue(policy: any, settingPath: string, userValue: any): any {
    const settings = policy.settings;

    switch (policy.type) {
        case PolicyType.SECURITY:
            if (settingPath === 'mfaEnabled' && settings.requireMfa) {
                return true; // Force MFA to be enabled
            }
            if (settingPath === 'sessionTimeout' && settings.sessionTimeout) {
                return Math.min(userValue || settings.sessionTimeout, settings.sessionTimeout);
            }
            break;

        case PolicyType.VERIFICATION:
            if (settingPath === 'verification.autoShare' && settings.allowAutoSharing === false) {
                return false; // Force auto-sharing to be disabled
            }
            if (settingPath === 'verification.defaultVerificationLevel' && settings.requiredVerificationLevel) {
                const levelOrder = { 'basic': 1, 'standard': 2, 'comprehensive': 3 };
                const requiredLevel = levelOrder[settings.requiredVerificationLevel as keyof typeof levelOrder];
                const userLevel = levelOrder[userValue as keyof typeof levelOrder];

                if (userLevel < requiredLevel) {
                    return settings.requiredVerificationLevel;
                }
            }
            break;

        case PolicyType.DATA_RETENTION:
            if (settingPath === 'verification.retentionDays' && settings.documentRetentionDays) {
                return Math.min(userValue || settings.documentRetentionDays, settings.documentRetentionDays);
            }
            break;
    }

    return undefined;
}

/**
 * Get all policy violations for current settings
 */
getPolicyViolations(currentSettings: any): Array < { setting: string; violation: string; policyId: string; policyName: string } > {
    const context = this.currentOrganizationContext();
    if(!context) {
        return [];
    }

    const violations: Array<{ setting: string; violation: string; policyId: string; policyName: string }> =[];

for (const policy of context.policies) {
    if (!policy.isEnforced) continue;

    const policyViolations = this.checkPolicyViolations(policy, currentSettings);
    violations.push(...policyViolations);
}

return violations;
  }

  /**
   * Check violations for a specific policy
   */
  private checkPolicyViolations(policy: any, settings: any): Array < { setting: string; violation: string; policyId: string; policyName: string } > {
    const violations: Array<{ setting: string; violation: string; policyId: string; policyName: string }> =[];

// This would contain comprehensive policy checking logic
// For now, we'll implement basic checks

if (policy.type === PolicyType.SECURITY) {
    if (policy.settings.requireMfa && !settings.mfaEnabled) {
        violations.push({
            setting: 'mfaEnabled',
            violation: 'MFA is required but not enabled',
            policyId: policy.id,
            policyName: policy.name
        });
    }
}

if (policy.type === PolicyType.VERIFICATION) {
    if (policy.settings.allowAutoSharing === false && settings.verification?.autoShare === true) {
        violations.push({
            setting: 'verification.autoShare',
            violation: 'Auto-sharing is prohibited but enabled',
            policyId: policy.id,
            policyName: policy.name
        });
    }
}

return violations;
  }