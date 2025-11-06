import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, ErrorObserver } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared';
import { OrganizationService } from '../../../core/services/organization.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PolicyValidationService } from '../../../core/services/policy-validation.service';
import {
  OrganizationMembership,
  OrganizationPreferences,
  OrganizationRole,
  MembershipStatus,
  OrganizationPermission,
  PolicyType,
  OrganizationSettingsUpdateRequest
} from '../../../shared/models/organization.models';

@Component({
  selector: 'app-organization-tab',
  standalone: true,
  imports: [SHARED_IMPORTS],
  template: `
    <div class="organization-settings-container">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2">
          Organization Settings
        </h2>
        <p class="text-surface-600 dark:text-surface-400">
          Manage your organization memberships and organization-specific preferences
        </p>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-8">
          <p-progressSpinner [style]="{ width: '50px', height: '50px' }"></p-progressSpinner>
        </div>
      } @else {
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <!-- Main Content -->
          <div class="xl:col-span-2 space-y-6">
            <!-- Organization Memberships -->
            <p-card>
              <ng-template pTemplate="header">
                <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                  <h3 class="text-lg font-semibold">Organization Memberships</h3>
                  <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                    Organizations you belong to and your role in each
                  </p>
                </div>
              </ng-template>

              <div class="space-y-4">
                @for (membership of memberships(); track membership.id) {
                  <div class="membership-card" [class.current]="membership.isDefault">
                    <div class="flex items-start gap-4">
                      <!-- Organization Logo/Icon -->
                      <div class="organization-avatar">
                        @if (membership.organizationLogo) {
                          <img [src]="membership.organizationLogo" [alt]="membership.organizationName" />
                        } @else {
                          <div class="avatar-placeholder">
                            <i class="pi pi-building text-xl"></i>
                          </div>
                        }
                      </div>

                      <!-- Organization Details -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                          <h4 class="font-semibold text-surface-900 dark:text-surface-0 truncate">
                            {{ membership.organizationName }}
                          </h4>
                          @if (membership.isDefault) {
                            <p-tag value="Current" severity="success" size="small"></p-tag>
                          }
                          @if (membership.role) {
                            <p-tag 
                              [value]="getRoleDisplayName(membership.role)" 
                              [severity]="getRoleSeverity(membership.role)"
                              size="small"
                            ></p-tag>
                          }
                        </div>

                        <div class="text-sm text-surface-600 dark:text-surface-400 space-y-1">
                          <div class="flex items-center gap-2">
                            <i class="pi pi-globe text-xs"></i>
                            <span>{{ membership.organizationDomain }}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <i class="pi pi-calendar text-xs"></i>
                            <span>Joined {{ formatDate(membership.joinedAt) }}</span>
                          </div>
                          @if (membership.lastActiveAt) {
                            <div class="flex items-center gap-2">
                              <i class="pi pi-clock text-xs"></i>
                              <span>Last active {{ formatRelativeDate(membership.lastActiveAt) }}</span>
                            </div>
                          }
                        </div>

                        <!-- Permissions Summary -->
                        <div class="mt-3">
                          <div class="flex items-center gap-2 mb-2">
                            <i class="pi pi-shield text-sm text-surface-500"></i>
                            <span class="text-sm font-medium">Permissions</span>
                          </div>
                          <div class="flex flex-wrap gap-1">
                            @for (permission of membership.permissions.slice(0, 3); track permission) {
                              <p-tag 
                                [value]="getPermissionDisplayName(permission)" 
                                severity="info" 
                                size="small"
                                class="text-xs"
                              ></p-tag>
                            }
                            @if (membership.permissions.length > 3) {
                              <p-tag 
                                [value]="'+' + (membership.permissions.length - 3) + ' more'" 
                                severity="secondary" 
                                size="small"
                                class="text-xs"
                              ></p-tag>
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Actions -->
                      <div class="flex flex-col gap-2">
                        @if (!membership.isDefault) {
                          <p-button
                            label="Switch"
                            icon="pi pi-refresh"
                            size="small"
                            [outlined]="true"
                            [loading]="switchingOrganization() === membership.organizationId"
                            (onClick)="switchOrganization(membership.organizationId)"
                          ></p-button>
                        }
                        <p-button
                          label="Details"
                          icon="pi pi-info-circle"
                          size="small"
                          [outlined]="true"
                          severity="secondary"
                          (onClick)="viewOrganizationDetails(membership)"
                        ></p-button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </p-card>

            <!-- Organization-Specific Preferences -->
            @if (currentContext()) {
              <p-card>
                <ng-template pTemplate="header">
                  <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                    <h3 class="text-lg font-semibold">Organization Preferences</h3>
                    <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                      Customize settings specific to {{ currentContext()?.membership?.organizationName }}
                    </p>
                  </div>
                </ng-template>

                <form [formGroup]="preferencesForm" class="space-y-6">
                  <!-- Notification Preferences -->
                  <div class="preference-section">
                    <div class="flex items-center justify-between mb-4">
                      <div>
                        <h4 class="font-semibold text-surface-900 dark:text-surface-0">
                          Notification Preferences
                        </h4>
                        <p class="text-sm text-surface-600 dark:text-surface-400">
                          Override organization notification settings
                        </p>
                      </div>
                      <p-toggleSwitch
                        formControlName="notifications.inheritFromOrganization"
                        [disabled]="updating() || isSettingRestricted('notifications')"
                      ></p-toggleSwitch>
                    </div>

                    @if (!preferencesForm.get('notifications.inheritFromOrganization')?.value) {
                      <div class="ml-4 space-y-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <div class="flex items-center justify-between">
                          <span class="text-sm">Organization Updates</span>
                          <p-toggleSwitch
                            formControlName="notifications.overrides.organizationUpdates"
                            [disabled]="updating()"
                          ></p-toggleSwitch>
                        </div>
                        <div class="flex items-center justify-between">
                          <span class="text-sm">Security Alerts</span>
                          <p-toggleSwitch
                            formControlName="notifications.overrides.securityAlerts"
                            [disabled]="updating() || isSettingRestricted('notifications.securityAlerts')"
                          ></p-toggleSwitch>
                        </div>
                      </div>
                    }

                    @if (isSettingRestricted('notifications')) {
                      <div class="restriction-notice">
                        <i class="pi pi-lock text-yellow-600"></i>
                        <span class="text-sm">{{ getRestrictionReason('notifications') }}</span>
                      </div>
                    }
                  </div>

                  <!-- Verification Preferences -->
                  <div class="preference-section">
                    <div class="flex items-center justify-between mb-4">
                      <div>
                        <h4 class="font-semibold text-surface-900 dark:text-surface-0">
                          Verification Preferences
                        </h4>
                        <p class="text-sm text-surface-600 dark:text-surface-400">
                          Override organization verification settings
                        </p>
                      </div>
                      <p-toggleSwitch
                        formControlName="verification.inheritFromOrganization"
                        [disabled]="updating() || isSettingRestricted('verification')"
                      ></p-toggleSwitch>
                    </div>

                    @if (!preferencesForm.get('verification.inheritFromOrganization')?.value) {
                      <div class="ml-4 space-y-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <div>
                          <label class="block text-sm font-medium mb-2">Default Verification Level</label>
                          <p-select
                            formControlName="verification.overrides.defaultVerificationLevel"
                            [options]="verificationLevels"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select verification level"
                            class="w-full"
                            [disabled]="updating() || isSettingRestricted('verification.defaultVerificationLevel')"
                          ></p-select>
                        </div>

                        <div class="flex items-center justify-between">
                          <div>
                            <span class="text-sm font-medium">Auto-share Documents</span>
                            <p class="text-xs text-surface-500">Automatically share verified documents</p>
                          </div>
                          <p-toggleSwitch
                            formControlName="verification.overrides.autoShare"
                            [disabled]="updating() || isSettingRestricted('verification.autoShare')"
                          ></p-toggleSwitch>
                        </div>

                        <div>
                          <label class="block text-sm font-medium mb-2">Document Retention (days)</label>
                          <p-inputNumber
                            formControlName="verification.overrides.retentionDays"
                            [min]="1"
                            [max]="3650"
                            placeholder="Enter retention period"
                            class="w-full"
                            [disabled]="updating() || isSettingRestricted('verification.retentionDays')"
                          ></p-inputNumber>
                        </div>
                      </div>
                    }

                    @if (isSettingRestricted('verification.autoShare')) {
                      <div class="restriction-notice">
                        <i class="pi pi-lock text-yellow-600"></i>
                        <span class="text-sm">{{ getRestrictionReason('verification.autoShare') }}</span>
                      </div>
                    }
                  </div>

                  <!-- Privacy Preferences -->
                  <div class="preference-section">
                    <div class="flex items-center justify-between mb-4">
                      <div>
                        <h4 class="font-semibold text-surface-900 dark:text-surface-0">
                          Privacy Preferences
                        </h4>
                        <p class="text-sm text-surface-600 dark:text-surface-400">
                          Override organization privacy settings
                        </p>
                      </div>
                      <p-toggleSwitch
                        formControlName="privacy.inheritFromOrganization"
                        [disabled]="updating() || isSettingRestricted('privacy')"
                      ></p-toggleSwitch>
                    </div>

                    @if (!preferencesForm.get('privacy.inheritFromOrganization')?.value) {
                      <div class="ml-4 space-y-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <div>
                          <label class="block text-sm font-medium mb-2">Profile Visibility</label>
                          <p-select
                            formControlName="privacy.overrides.profileVisibility"
                            [options]="visibilityOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select visibility"
                            class="w-full"
                            [disabled]="updating()"
                          ></p-select>
                        </div>

                        <div>
                          <label class="block text-sm font-medium mb-2">Activity Visibility</label>
                          <p-select
                            formControlName="privacy.overrides.activityVisibility"
                            [options]="activityVisibilityOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select visibility"
                            class="w-full"
                            [disabled]="updating()"
                          ></p-select>
                        </div>
                      </div>
                    }
                  </div>
                </form>

                <!-- Save Button -->
                <ng-template pTemplate="footer">
                  <div class="flex justify-between items-center">
                    <div class="flex gap-2">
                      <p-button
                        label="Check Violations"
                        icon="pi pi-exclamation-triangle"
                        severity="warn"
                        [outlined]="true"
                        size="small"
                        (onClick)="showPolicyViolationDetails()"
                      ></p-button>
                      <p-button
                        label="Reset to Defaults"
                        icon="pi pi-refresh"
                        severity="secondary"
                        [outlined]="true"
                        size="small"
                        (onClick)="resetToPolicyDefaults()"
                      ></p-button>
                    </div>
                    <p-button
                      label="Save Organization Preferences"
                      icon="pi pi-save"
                      [loading]="updating()"
                      [disabled]="preferencesForm.invalid || !hasChanges()"
                      (onClick)="savePreferences()"
                    ></p-button>
                  </div>
                </ng-template>
              </p-card>
            }
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Current Organization Info -->
            @if (currentContext()) {
              <p-card>
                <ng-template pTemplate="header">
                  <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                    <h3 class="text-lg font-semibold">Current Organization</h3>
                  </div>
                </ng-template>

                <div class="space-y-4">
                  <div class="text-center">
                    <div class="organization-avatar mx-auto mb-3">
                      @if (currentContext()?.membership?.organizationLogo) {
                        <img [src]="currentContext()?.membership?.organizationLogo" [alt]="currentContext()?.membership?.organizationName" />
                      } @else {
                        <div class="avatar-placeholder">
                          <i class="pi pi-building text-2xl"></i>
                        </div>
                      }
                    </div>
                    <h4 class="font-semibold text-surface-900 dark:text-surface-0">
                      {{ currentContext()?.membership?.organizationName }}
                    </h4>
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                      {{ currentContext()?.membership?.organizationDomain }}
                    </p>
                  </div>

                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">Your Role</span>
                      @if (currentContext()?.membership?.role) {
                        <p-tag 
                          [value]="getRoleDisplayName(currentContext()!.membership!.role)" 
                          [severity]="getRoleSeverity(currentContext()!.membership!.role)"
                          size="small"
                        ></p-tag>
                      }
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">Status</span>
                      @if (currentContext()?.membership?.status) {
                        <p-tag 
                          [value]="getStatusDisplayName(currentContext()!.membership!.status)" 
                          [severity]="getStatusSeverity(currentContext()!.membership!.status)"
                          size="small"
                        ></p-tag>
                      }
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">Permissions</span>
                      <span class="text-sm text-surface-600 dark:text-surface-400">
                        {{ currentContext()?.effectivePermissions?.length || 0 }} granted
                      </span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">Policies</span>
                      <span class="text-sm text-surface-600 dark:text-surface-400">
                        {{ currentContext()?.policies?.length || 0 }} active
                      </span>
                    </div>
                  </div>
                </div>
              </p-card>
            }

            <!-- Organization Policies -->
            @if (currentContext()?.policies && currentContext()?.policies?.length) {
              <p-card>
                <ng-template pTemplate="header">
                  <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                    <h3 class="text-lg font-semibold">Active Policies</h3>
                  </div>
                </ng-template>

                <div class="space-y-3">
                  @for (policy of currentContext()?.policies || []; track policy.id) {
                    <div class="policy-item">
                      <div class="flex items-start gap-3">
                        <div class="policy-icon">
                          <i [class]="getPolicyIcon(policy.type)" class="text-sm"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-surface-900 dark:text-surface-0">
                            {{ policy?.name }}
                          </p>
                          <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
                            {{ policy?.description }}
                          </p>
                          <div class="flex items-center gap-2 mt-2">
                            <p-tag 
                              [value]="getPolicyTypeDisplayName(policy.type)" 
                              [severity]="getPolicyTypeSeverity(policy.type)"
                              size="small"
                            ></p-tag>
                            @if (policy.isEnforced) {
                              <p-tag value="Enforced" severity="warn" size="small"></p-tag>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </p-card>
            }

            <!-- Restrictions Notice -->
            @if (currentContext()?.restrictions && currentContext()?.restrictions?.length) {
              <p-card>
                <ng-template pTemplate="header">
                  <div class="p-4 border-b border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <h3 class="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                      <i class="pi pi-exclamation-triangle mr-2"></i>
                      Policy Restrictions
                    </h3>
                  </div>
                </ng-template>

                <div class="space-y-3">
                  @for (restriction of currentContext()?.restrictions || []; track restriction.setting) {
                    <div class="restriction-item">
                      <p class="text-sm font-medium text-surface-900 dark:text-surface-0">
                        {{ restriction.setting }}
                      </p>
                      <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
                        {{ restriction.reason }}
                      </p>
                      <p class="text-xs text-surface-500 mt-1">
                        Policy: {{ restriction.policyName }}
                      </p>
                    </div>
                  }
                </div>
              </p-card>
            }

            <!-- Organization Management Actions -->
            @if (canModifyOrganizationSettings()) {
              <p-card>
                <ng-template pTemplate="header">
                  <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                    <h3 class="text-lg font-semibold">Organization Management</h3>
                  </div>
                </ng-template>

                <div class="space-y-3">
                  <p-button
                    label="Export Settings"
                    icon="pi pi-download"
                    [outlined]="true"
                    size="small"
                    class="w-full"
                    (onClick)="exportOrganizationSettings()"
                  ></p-button>
                  
                  <p-button
                    label="View Audit Log"
                    icon="pi pi-history"
                    [outlined]="true"
                    severity="secondary"
                    size="small"
                    class="w-full"
                    [disabled]="!organizationService.hasPermission(OrganizationPermission.VIEW_AUDIT_LOGS)"
                  ></p-button>
                  
                  <p-button
                    label="Manage Policies"
                    icon="pi pi-cog"
                    [outlined]="true"
                    severity="info"
                    size="small"
                    class="w-full"
                    [disabled]="!organizationService.hasPermission(OrganizationPermission.MANAGE_ORGANIZATION)"
                  ></p-button>
                </div>
              </p-card>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .membership-card {
      padding: 1.5rem;
      border: 2px solid var(--surface-200);
      border-radius: var(--border-radius);
      background: var(--surface-0);
      transition: all 0.2s;
    }

    .membership-card:hover {
      border-color: var(--primary-300);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .membership-card.current {
      border-color: var(--primary-500);
      background: var(--primary-50);
    }

    .organization-avatar {
      width: 48px;
      height: 48px;
      border-radius: var(--border-radius);
      overflow: hidden;
      flex-shrink: 0;
    }

    .organization-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: var(--primary-100);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-600);
    }

    .preference-section {
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--surface-200);
    }

    .preference-section:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .restriction-notice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--yellow-50);
      border: 1px solid var(--yellow-200);
      border-radius: var(--border-radius);
      color: var(--yellow-700);
      font-size: 0.875rem;
    }

    .policy-item {
      padding: 0.75rem;
      border: 1px solid var(--surface-200);
      border-radius: var(--border-radius);
      background: var(--surface-50);
    }

    .policy-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--primary-100);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-600);
      flex-shrink: 0;
    }

    .restriction-item {
      padding: 0.75rem;
      border: 1px solid var(--yellow-200);
      border-radius: var(--border-radius);
      background: var(--yellow-50);
    }

    /* Dark mode adjustments */
    :host-context(.dark) .membership-card {
      border-color: var(--surface-700);
      background: var(--surface-800);
    }

    :host-context(.dark) .membership-card:hover {
      border-color: var(--primary-400);
    }

    :host-context(.dark) .membership-card.current {
      background: var(--primary-900);
    }

    :host-context(.dark) .policy-item {
      border-color: var(--surface-700);
      background: var(--surface-800);
    }

    :host-context(.dark) .restriction-notice {
      background: var(--yellow-900);
      border-color: var(--yellow-700);
      color: var(--yellow-300);
    }

    :host-context(.dark) .restriction-item {
      border-color: var(--yellow-700);
      background: var(--yellow-900);
    }
  `]
})
export class OrganizationTabComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly organizationService = inject(OrganizationService);
  private readonly notificationService = inject(NotificationService);
  private readonly policyValidationService = inject(PolicyValidationService);
  private readonly destroy$ = new Subject<void>();

  readonly loading = this.organizationService.loading;
  readonly updating = signal<boolean>(false);
  readonly switchingOrganization = signal<string | null>(null);
  readonly memberships = this.organizationService.userMemberships;
  readonly currentContext = this.organizationService.currentOrganizationContext;

  // Expose enums for template use
  readonly OrganizationPermission = OrganizationPermission;

  readonly verificationLevels = [
    { label: 'Basic', value: 'basic' },
    { label: 'Standard', value: 'standard' },
    { label: 'Comprehensive', value: 'comprehensive' }
  ];

  readonly visibilityOptions = [
    { label: 'Private', value: 'private' },
    { label: 'Organization Only', value: 'organization' },
    { label: 'Public', value: 'public' }
  ];

  readonly activityVisibilityOptions = [
    { label: 'Private', value: 'private' },
    { label: 'Organization Only', value: 'organization' }
  ];

  readonly preferencesForm = this.fb.group({
    notifications: this.fb.group({
      inheritFromOrganization: [true],
      overrides: this.fb.group({
        organizationUpdates: [true],
        securityAlerts: [true]
      })
    }),
    verification: this.fb.group({
      inheritFromOrganization: [false],
      overrides: this.fb.group({
        defaultVerificationLevel: ['standard'],
        autoShare: [false],
        retentionDays: [365]
      })
    }),
    privacy: this.fb.group({
      inheritFromOrganization: [true],
      overrides: this.fb.group({
        profileVisibility: ['organization'],
        activityVisibility: ['organization']
      })
    })
  });

  private initialFormValue: any = null;

  ngOnInit(): void {
    console.log('OrganizationTabComponent initialized');
    this.loadMemberships();
    this.setupFormChangeTracking();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMemberships(): void {
    this.organizationService.getUserMemberships().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (memberships) => {
        // Load context for default organization
        const defaultMembership = memberships.find(m => m.isDefault);
        if (defaultMembership) {
          this.loadOrganizationContext(defaultMembership.organizationId);
        }
      },
      error: (error) => {
        console.error('Failed to load memberships:', error);
      }
    });
  }

  private loadOrganizationContext(organizationId: string): void {
    this.organizationService.getOrganizationContext(organizationId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (context) => {
        this.loadOrganizationPreferences(organizationId);
      },
      error: (error) => {
        console.error('Failed to load organization context:', error);
      }
    });
  }

  private loadOrganizationPreferences(organizationId: string): void {
    this.organizationService.getOrganizationPreferences(organizationId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (preferences: any) => {
        this.preferencesForm.patchValue(preferences);
        this.initialFormValue = this.preferencesForm.value;
      },
      error: (error) => {
        console.error('Failed to load organization preferences:', error);
      }
    });
  }

  private setupFormChangeTracking(): void {
    this.preferencesForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Form change tracking for hasChanges() method
    });
  }

  switchOrganization(organizationId: string): void {
    this.switchingOrganization.set(organizationId);

    this.organizationService.switchOrganization({ organizationId }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.switchingOrganization.set(null);
        // Update memberships to reflect new default
        this.loadMemberships();
        this.loadOrganizationPreferences(organizationId);
      },
      error: (error: any) => {
        this.switchingOrganization.set(null);
        console.error('Failed to switch organization:', error);
      }
    });
  }

  viewOrganizationDetails(membership: OrganizationMembership): void {
    // This would typically open a dialog or navigate to a details page
    this.notificationService.info(`Viewing details for ${membership.organizationName}`);
  }

  savePreferences(): void {
    if (this.preferencesForm.invalid) {
      this.notificationService.warn('Please fix the validation errors before saving');
      return;
    }

    const currentMembership = this.currentContext()?.membership;
    if (!currentMembership) {
      this.notificationService.error('No organization context available');
      return;
    }

    // Validate against organization policies
    const formValues = this.preferencesForm.value;
    const policyErrors = this.policyValidationService.validateSettings(this.flattenFormValues(formValues));

    if (policyErrors.length > 0) {
      const errorMessage = policyErrors.map(e => `${e.setting}: ${e.error}`).join('; ');
      this.notificationService.error(`Policy violations: ${errorMessage}`);
      return;
    }

    // Sanitize settings to ensure policy compliance
    const { sanitized, warnings } = this.policyValidationService.sanitizeSettings(this.flattenFormValues(formValues));

    if (warnings.length > 0) {
      warnings.forEach(warning => {
        this.notificationService.warn(`${warning.setting}: ${warning.message}`);
      });
    }

    this.updating.set(true);
    const preferences = this.preferencesForm.value as OrganizationPreferences;

    const request: OrganizationSettingsUpdateRequest = {
      organizationId: currentMembership.organizationId,
      preferences,
    };

    this.organizationService.updateOrganizationPreferences(request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.updating.set(false);
        if (response.success) {
          this.initialFormValue = this.preferencesForm.value;
        }
      },
      error: (error) => {
        this.updating.set(false);
        console.error('Failed to save organization preferences:', error);
      }
    });
  }

  hasChanges(): boolean {
    return JSON.stringify(this.preferencesForm.value) !== JSON.stringify(this.initialFormValue);
  }

  isSettingRestricted(settingPath: string): boolean {
    return this.organizationService.isSettingRestricted(settingPath);
  }

  getRestrictionReason(settingPath: string): string {
    const restriction = this.organizationService.getSettingRestriction(settingPath);
    return restriction?.reason || 'This setting is restricted by organization policy';
  }

  getRoleDisplayName(role: OrganizationRole): string {
    return this.organizationService.getRoleDisplayName(role);
  }

  getPermissionDisplayName(permission: OrganizationPermission): string {
    return this.organizationService.getPermissionDisplayName(permission);
  }

  getRoleSeverity(role: OrganizationRole): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | null | undefined {
    const severityMap: Record<OrganizationRole, "success" | "secondary" | "info" | "warn" | "danger"> = {
      [OrganizationRole.OWNER]: 'danger',
      [OrganizationRole.ADMIN]: 'warn',
      [OrganizationRole.MANAGER]: 'info',
      [OrganizationRole.MEMBER]: 'success',
      [OrganizationRole.VIEWER]: 'secondary'
    };
    return severityMap[role] || 'secondary';
  }

  getStatusDisplayName(status: MembershipStatus): string {
    const statusNames = {
      [MembershipStatus.ACTIVE]: 'Active',
      [MembershipStatus.PENDING]: 'Pending',
      [MembershipStatus.SUSPENDED]: 'Suspended',
      [MembershipStatus.INACTIVE]: 'Inactive'
    };
    return statusNames[status] || status;
  }

  getStatusSeverity(status: MembershipStatus): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | null | undefined {
    const severityMap: Record<MembershipStatus, "success" | "secondary" | "info" | "warn" | "danger"> = {
      [MembershipStatus.ACTIVE]: 'success',
      [MembershipStatus.PENDING]: 'warn',
      [MembershipStatus.SUSPENDED]: 'danger',
      [MembershipStatus.INACTIVE]: 'secondary'
    };
    return severityMap[status] || 'secondary';
  }

  getPolicyIcon(type: PolicyType): string {
    const iconMap: Record<PolicyType, string> = {
      [PolicyType.SECURITY]: 'pi pi-shield',
      [PolicyType.NOTIFICATION]: 'pi pi-bell',
      [PolicyType.VERIFICATION]: 'pi pi-verified',
      [PolicyType.DATA_RETENTION]: 'pi pi-database',
      [PolicyType.API_ACCESS]: 'pi pi-key',
      [PolicyType.DOCUMENT_RETENTION]: '',
      [PolicyType.ACCESS_CONTROL]: '',
      [PolicyType.DATA_PRIVACY]: ''
    };
    return iconMap[type] || 'pi pi-cog';
  }

  getPolicyTypeDisplayName(type: PolicyType): string {
    const typeNames: Record<PolicyType, string> = {
      [PolicyType.SECURITY]: 'Security',
      [PolicyType.NOTIFICATION]: 'Notification',
      [PolicyType.VERIFICATION]: 'Verification',
      [PolicyType.DATA_RETENTION]: 'Data Retention',
      [PolicyType.API_ACCESS]: 'API Access',
      [PolicyType.DOCUMENT_RETENTION]: '',
      [PolicyType.ACCESS_CONTROL]: '',
      [PolicyType.DATA_PRIVACY]: ''
    };
    return typeNames[type] || type;
  }

  getPolicyTypeSeverity(type: PolicyType): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | null | undefined {
    const severityMap: Record<PolicyType, "success" | "secondary" | "info" | "warn" | "danger"> = {
      [PolicyType.SECURITY]: 'danger',
      [PolicyType.NOTIFICATION]: 'info',
      [PolicyType.VERIFICATION]: 'success',
      [PolicyType.DATA_RETENTION]: 'warn',
      [PolicyType.API_ACCESS]: 'secondary',
      [PolicyType.DOCUMENT_RETENTION]: 'success',
      [PolicyType.ACCESS_CONTROL]: 'success',
      [PolicyType.DATA_PRIVACY]: 'success'
    };
    return severityMap[type] || 'secondary';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return this.formatDate(date);
    }
  }

  /**
   * Flatten nested form values for policy validation
   */
  private flattenFormValues(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenFormValues(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Check if a specific form control should be disabled due to policy
   */
  isControlDisabled(controlPath: string): boolean {
    return this.policyValidationService.isControlDisabled(controlPath);
  }

  /**
   * Get policy restriction message for a control
   */
  getControlRestrictionMessage(controlPath: string): string | null {
    return this.policyValidationService.getRestrictionMessage(controlPath);
  }

  /**
   * Validate a form control value against policies
   */
  validateControlValue(controlPath: string, value: any): { isValid: boolean; message?: string } {
    const validation = this.organizationService.validateSettingChange(controlPath, value);
    return {
      isValid: validation.isValid,
      message: validation.reason
    };
  }

  /**
   * Get policy-compliant default value for a setting
   */
  getPolicyCompliantDefault(settingPath: string, defaultValue: any): any {
    return this.policyValidationService.getPolicyCompliantDefault(settingPath, defaultValue);
  }

  /**
   * Check if user can modify organization settings
   */
  canModifyOrganizationSettings(): boolean {
    return this.organizationService.hasAnyPermission([
      OrganizationPermission.MANAGE_ORGANIZATION,
      OrganizationPermission.VIEW_ORGANIZATION
    ]);
  }

  /**
   * Get all current policy violations
   */
  getCurrentPolicyViolations(): Array<{ setting: string; violation: string; policyName: string }> {
    const formValues = this.flattenFormValues(this.preferencesForm.value);
    return this.organizationService.getPolicyViolations(formValues);
  }

  /**
   * Show policy violation details
   */
  showPolicyViolationDetails(): void {
    const violations = this.getCurrentPolicyViolations();

    if (violations.length === 0) {
      this.notificationService.info('No policy violations found');
      return;
    }

    const violationMessage = violations.map(v =>
      `• ${v.setting}: ${v.violation} (Policy: ${v.policyName})`
    ).join('\n');

    this.notificationService.warn(`Policy Violations:\n${violationMessage}`);
  }

  /**
   * Reset form to policy-compliant defaults
   */
  resetToPolicyDefaults(): void {
    const currentValues = this.preferencesForm.value;
    const compliantValues: any = {};

    // Apply policy-compliant defaults
    for (const [key, value] of Object.entries(this.flattenFormValues(currentValues))) {
      compliantValues[key] = this.getPolicyCompliantDefault(key, value);
    }

    // Reconstruct nested form structure
    const nestedValues = this.unflattenFormValues(compliantValues);
    this.preferencesForm.patchValue(nestedValues);

    this.notificationService.success('Form reset to policy-compliant defaults');
  }

  /**
   * Convert flattened values back to nested structure
   */
  private unflattenFormValues(flattened: Record<string, any>): any {
    const nested: any = {};

    for (const [key, value] of Object.entries(flattened)) {
      const keys = key.split('.');
      let current = nested;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
    }

    return nested;
  }

  /**
   * Export organization settings for audit purposes
   */
  exportOrganizationSettings(): void {
    if (!this.organizationService.hasPermission(OrganizationPermission.EXPORT_DATA)) {
      this.notificationService.error('You do not have permission to export organization data');
      return;
    }

    const context = this.currentContext();
    if (!context) {
      this.notificationService.error('No organization context available');
      return;
    }

    const exportData = {
      organization: {
        id: context.membership?.organizationId,
        name: context.membership?.organizationName,
        domain: context.membership?.organizationDomain
      },
      membership: context.membership,
      policies: context.policies,
      restrictions: context.restrictions,
      preferences: this.preferencesForm.value,
      exportedAt: new Date().toISOString(),
      exportedBy: context.membership?.id
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `organization-settings-${context.membership.organizationName}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.notificationService.success('Organization settings exported successfully');
  }
}