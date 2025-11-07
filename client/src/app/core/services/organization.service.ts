import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
    OrganizationMembership,
    OrganizationContext,
    OrganizationPolicy,
    OrganizationPreferences,

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
                isDefault: true,
                userId: '',
                updatedAt: undefined
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
                isDefault: false,
                userId: '',
                updatedAt: undefined
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
                        maxAge: 90
                    },
                    allowPublicDocuments: false,
                    requireEmailVerification: false,
                    enableMfaForAllUsers: false,
                    maxDocumentSize: 0,
                    allowedFileTypes: [],
                    autoVerifyDocuments: false,
                    retentionPeriod: 0,
                    emailNotifications: {
                        documentUploaded: false,
                        verificationCompleted: false,
                        userInvited: false,
                        weeklyReports: false
                    },
                    apiRateLimit: 0
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-15'),
                organizationId: '',
                policy: ''
            },
            {
                id: 'policy-2',
                name: 'Document Retention',
                description: 'Automatic document deletion after 365 days',
                type: PolicyType.DATA_RETENTION,
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
                        maxAge: 90
                    },
                    allowPublicDocuments: false,
                    requireEmailVerification: false,
                    enableMfaForAllUsers: false,
                    maxDocumentSize: 0,
                    allowedFileTypes: [],
                    autoVerifyDocuments: false,
                    retentionPeriod: 0,
                    emailNotifications: {
                        documentUploaded: false,
                        verificationCompleted: false,
                        userInvited: false,
                        weeklyReports: false
                    },
                    apiRateLimit: 0
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-10'),
                organizationId: '',
                policy: ''
            },
            {
                id: 'policy-3',
                name: 'Verification Standards',
                description: 'Minimum verification level requirements',
                type: PolicyType.VERIFICATION,
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
                        maxAge: 90
                    },
                    allowPublicDocuments: false,
                    requireEmailVerification: false,
                    enableMfaForAllUsers: false,
                    maxDocumentSize: 0,
                    allowedFileTypes: [],
                    autoVerifyDocuments: false,
                    retentionPeriod: 0,
                    emailNotifications: {
                        documentUploaded: false,
                        verificationCompleted: false,
                        userInvited: false,
                        weeklyReports: false
                    },
                    apiRateLimit: 0
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-02-01'),
                organizationId: '',
                policy: ''
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
            ],
            preferences: undefined
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
     * Get organization-specific preferences
     */
    getOrganizationPreferences(organizationId?: string): Observable<OrganizationPreferences> {
        // Mock organization preferences
        const mockPreferences: OrganizationPreferences = {
            notifications: {
                inheritFromOrganization: true,
                email: true,
                push: true,
                sms: false
            },
            privacy: {
                profileVisible: true,
                activityVisible: true
            },
            language: 'English',
            timezone: 'GMT'
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
            preferences: request.preferences || {}
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
        return context?.restrictions.some((r: { setting: string }) => r.setting === settingPath) || false;
    }

    /**
     * Get restriction details for a setting
     */
    getSettingRestriction(settingPath: string) {
        const context = this.currentOrganizationContext();
        return context?.restrictions.find((r: { setting: string }) => r.setting === settingPath);
    }

    /**
     * Get policies by type
     */
    getPoliciesByType(type: PolicyType) {
        const context = this.currentOrganizationContext();
        return context?.policies.filter(p => p?.type === type) || [];
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
        const permissionNames: Record<OrganizationPermission, string> = {
            [OrganizationPermission.MANAGE_USERS]: 'Manage Users',
            [OrganizationPermission.MANAGE_DOCUMENTS]: 'Manage Documents',
            [OrganizationPermission.VERIFY_DOCUMENTS]: 'Verify Documents',
            [OrganizationPermission.VIEW_DOCUMENTS]: 'View Documents',
            [OrganizationPermission.MANAGE_ORGANIZATION]: 'Manage Organization',
            [OrganizationPermission.VIEW_ORGANIZATION]: 'View Organization',
            [OrganizationPermission.MANAGE_BILLING]: 'Manage Billing',
            [OrganizationPermission.MANAGE_API_KEYS]: 'Manage API Keys',
            [OrganizationPermission.USE_API]: 'Use API',
            [OrganizationPermission.VIEW_AUDIT_LOGS]: 'View Audit Logs',
            [OrganizationPermission.EXPORT_DATA]: 'Export Data',
            [OrganizationPermission.READ_DOCUMENTS]: 'Read Documents',
            [OrganizationPermission.WRITE_DOCUMENTS]: 'Write Documents',
            [OrganizationPermission.DELETE_DOCUMENTS]: 'Delete Documents',
            [OrganizationPermission.MANAGE_SETTINGS]: 'Manage Settings',
            [OrganizationPermission.VIEW_ANALYTICS]: 'View Analytics',
        };

        return permissionNames[permission] || permission;
    }


    /**
     * Validate setting change against organization policies
     */
    validateSettingChange(settingPath: string, newValue: any): { isValid: boolean; reason?: string; policyId?: string } {
        const context = this.currentOrganizationContext();
        if (!context) {
            return { isValid: true };
        }

        // Check if setting is restricted
        const restriction = context.restrictions.find((r: { setting: string }) => r.setting === settingPath);
        if (restriction && !restriction.canOverride) {
            return {
                isValid: false,
                reason: restriction.reason,
                policyId: restriction.policyId
            };
        }

        // Check specific policy validations
        for (const policy of context.policies) {
            if (!policy?.isEnforced) continue;

            const validation = this.validateAgainstPolicy(policy, settingPath, newValue);
            if (!validation.isValid) {
                return validation;
            }
        }

        return { isValid: true };
    }

    /**
     * Get all policy violations for current settings
     */
    getPolicyViolations(currentSettings: any): Array<{ setting: string; violation: string; policyId: string; policyName: string }> {
        const context = this.currentOrganizationContext();
        if (!context) {
            return [];
        }

        const violations: Array<{ setting: string; violation: string; policyId: string; policyName: string }> = [];

        for (const policy of context.policies) {
            if (!policy?.isEnforced) continue;

            const policyViolations = this.checkPolicyViolations(policy, currentSettings);
            violations.push(...policyViolations);
        }

        return violations;
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
            if (!policy?.isEnforced) continue;

            const effectiveValue = this.getPolicyEffectiveValue(policy, settingPath, userValue);
            if (effectiveValue !== undefined) {
                return effectiveValue;
            }
        }

        return userValue;
    }

    /**
     * Validate a setting change against a specific policy
     */
    private validateAgainstPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason?: string; policyId?: string } {
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
    private validateSecurityPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason?: string; policyId?: string } {
        const settings = policy.settings;

        if (settingPath === 'mfaEnabled' && settings.requireMfa && !newValue) {
            return {
                isValid: false,
                reason: 'Organization policy requires MFA to be enabled',
                policyId: policy.id
            };
        }

        return { isValid: true };
    }

    /**
     * Validate against verification policies
     */
    private validateVerificationPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason?: string; policyId?: string } {
        const settings = policy.settings;

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
    private validateNotificationPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason?: string; policyId?: string } {
        return { isValid: true };
    }

    /**
     * Validate against data retention policies
     */
    private validateDataRetentionPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason?: string; policyId?: string } {
        return { isValid: true };
    }

    /**
     * Validate against API access policies
     */
    private validateApiAccessPolicy(policy: any, settingPath: string, newValue: any): { isValid: boolean; reason?: string; policyId?: string } {
        return { isValid: true };
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
                break;

            case PolicyType.VERIFICATION:
                if (settingPath === 'verification.autoShare' && settings.allowAutoSharing === false) {
                    return false; // Force auto-sharing to be disabled
                }
                break;
        }

        return undefined;
    }

    /**
     * Check violations for a specific policy
     */
    private checkPolicyViolations(policy: any, settings: any): Array<{ setting: string; violation: string; policyId: string; policyName: string }> {
        const violations: Array<{ setting: string; violation: string; policyId: string; policyName: string }> = [];

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
}