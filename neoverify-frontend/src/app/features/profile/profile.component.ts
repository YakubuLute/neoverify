import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { NotificationService } from '../../core/services/notification.service';
import { FormPersistenceService } from '../../core/services/form-persistence.service';
import { SHARED_IMPORTS } from '../../shared';

import { FormUtils, FormValidators } from '../../shared/utils/form.utils';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

interface ProfileTab {
  id: string;
  label: string;
  icon: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            Profile Settings
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Manage your account information, security settings, and preferences
          </p>
        </div>

        <!-- Tabbed Interface -->
        <div class="profile-tabs-container">
          <!-- Tab Navigation -->
          <div class="tab-navigation">
            @for (tab of profileTabs(); track tab.id; let i = $index) {
              <button
                type="button"
                class="tab-button"
                [class.active]="activeTabIndex() === i"
                [disabled]="tab.disabled"
                (click)="onTabChange(i)"
              >
                <i [class]="tab.icon" class="tab-icon"></i>
                <span class="tab-label">{{ tab.label }}</span>
              </button>
            }
          </div>

          <!-- Tab Content -->
          <div class="tab-content-container">
            <div class="tab-content">
              @switch (profileTabs()[activeTabIndex()]?.id) {
                    @case ('basic') {
                      <div class="basic-info-tab">
                        <!-- Basic Information Content -->
                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                          <!-- Profile Form -->
                          <div class="xl:col-span-2">
                            <p-card>
                              <ng-template pTemplate="header">
                                <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                                  <h2 class="text-xl font-semibold">Basic Information</h2>
                                </div>
                              </ng-template>

                              <form [formGroup]="profileForm" (ngSubmit)="updateProfile()" class="space-y-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div class="field">
                                    <label for="firstName" class="block text-sm font-medium mb-2">
                                      First Name *
                                      @if (profileForm.get('firstName')?.pending) {
                                        <i class="pi pi-spin pi-spinner text-xs ml-1"></i>
                                      }
                                    </label>
                                    <input
                                      id="firstName"
                                      type="text"
                                      pInputText
                                      formControlName="firstName"
                                      class="w-full"
                                      [class.ng-invalid]="isFieldInvalid('firstName')"
                                      [class.ng-valid]="isFieldValid('firstName')"
                                      placeholder="Enter your first name"
                                    />
                                    @if (isFieldInvalid('firstName')) {
                                      <small class="p-error block mt-1">
                                        {{ getErrorMessage(profileForm.get('firstName'), 'First Name') }}
                                      </small>
                                    }
                                    @if (isFieldValid('firstName')) {
                                      <small class="text-green-600 block mt-1">
                                        <i class="pi pi-check text-xs mr-1"></i>Valid
                                      </small>
                                    }
                                  </div>

                                  <div class="field">
                                    <label for="lastName" class="block text-sm font-medium mb-2">
                                      Last Name *
                                      @if (profileForm.get('lastName')?.pending) {
                                        <i class="pi pi-spin pi-spinner text-xs ml-1"></i>
                                      }
                                    </label>
                                    <input
                                      id="lastName"
                                      type="text"
                                      pInputText
                                      formControlName="lastName"
                                      class="w-full"
                                      [class.ng-invalid]="isFieldInvalid('lastName')"
                                      [class.ng-valid]="isFieldValid('lastName')"
                                      placeholder="Enter your last name"
                                    />
                                    @if (isFieldInvalid('lastName')) {
                                      <small class="p-error block mt-1">
                                        {{ getErrorMessage(profileForm.get('lastName'), 'Last Name') }}
                                      </small>
                                    }
                                    @if (isFieldValid('lastName')) {
                                      <small class="text-green-600 block mt-1">
                                        <i class="pi pi-check text-xs mr-1"></i>Valid
                                      </small>
                                    }
                                  </div>
                                </div>

                                <div class="field">
                                  <label for="email" class="block text-sm font-medium mb-2">
                                    Email Address *
                                    @if (profileForm.get('email')?.pending) {
                                      <i class="pi pi-spin pi-spinner text-xs ml-1"></i>
                                    }
                                  </label>
                                  <input
                                    id="email"
                                    type="email"
                                    pInputText
                                    formControlName="email"
                                    class="w-full"
                                    [class.ng-invalid]="isFieldInvalid('email')"
                                    [class.ng-valid]="isFieldValid('email')"
                                    placeholder="Enter your email address"
                                  />
                                  @if (isFieldInvalid('email')) {
                                    <small class="p-error block mt-1">
                                      {{ getErrorMessage(profileForm.get('email'), 'Email') }}
                                    </small>
                                  }
                                  @if (isFieldValid('email')) {
                                    <small class="text-green-600 block mt-1">
                                      <i class="pi pi-check text-xs mr-1"></i>Valid
                                    </small>
                                  }
                                </div>

                                <div class="field">
                                  <label for="phone" class="block text-sm font-medium mb-2">
                                    Phone Number
                                    @if (profileForm.get('phone')?.pending) {
                                      <i class="pi pi-spin pi-spinner text-xs ml-1"></i>
                                    }
                                  </label>
                                  <input
                                    id="phone"
                                    type="tel"
                                    pInputText
                                    formControlName="phone"
                                    class="w-full"
                                    [class.ng-invalid]="isFieldInvalid('phone')"
                                    [class.ng-valid]="isFieldValid('phone')"
                                    placeholder="Enter your phone number (optional)"
                                  />
                                  @if (isFieldInvalid('phone')) {
                                    <small class="p-error block mt-1">
                                      {{ getErrorMessage(profileForm.get('phone'), 'Phone') }}
                                    </small>
                                  }
                                  @if (isFieldValid('phone') && profileForm.get('phone')?.value) {
                                    <small class="text-green-600 block mt-1">
                                      <i class="pi pi-check text-xs mr-1"></i>Valid
                                    </small>
                                  }
                                </div>

                                <div class="field">
                                  <label for="organization" class="block text-sm font-medium mb-2">Organization</label>
                                  <input
                                    id="organization"
                                    type="text"
                                    pInputText
                                    formControlName="organization"
                                    class="w-full"
                                    [readonly]="true"
                                  />
                                  <small class="text-surface-500 mt-1 block">
                                    Contact your administrator to change organization
                                  </small>
                                </div>

                                <div class="flex justify-between items-center">
                                  @if (formPersistenceService.hasFormState(formId)) {
                                    <p-button
                                      label="Reset Form"
                                      icon="pi pi-refresh"
                                      severity="secondary"
                                      [outlined]="true"
                                      size="small"
                                      (onClick)="resetForm()"
                                    ></p-button>
                                  } @else {
                                    <div></div>
                                  }
                                  
                                  <p-button
                                    type="submit"
                                    label="Update Profile"
                                    icon="pi pi-save"
                                    [loading]="updatingProfile()"
                                    [disabled]="profileForm.invalid || profileForm.pending"
                                  ></p-button>
                                </div>
                              </form>
                            </p-card>
                          </div>

                          <!-- Account Overview Sidebar -->
                          <div class="space-y-6">
                            <!-- Account Status -->
                            <p-card>
                              <ng-template pTemplate="header">
                                <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                                  <h3 class="text-lg font-semibold">Account Status</h3>
                                </div>
                              </ng-template>

                              <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                  <span class="text-sm font-medium">Account Status</span>
                                  <p-tag value="Active" severity="success"></p-tag>
                                </div>

                                <div class="flex items-center justify-between">
                                  <span class="text-sm font-medium">Role</span>
                                  <p-tag [value]="currentUser()?.role" severity="info"></p-tag>
                                </div>

                                <div class="flex items-center justify-between">
                                  <span class="text-sm font-medium">MFA Enabled</span>
                                  <p-tag 
                                    [value]="currentUser()?.mfaEnabled ? 'Yes' : 'No'" 
                                    [severity]="currentUser()?.mfaEnabled ? 'success' : 'warn'"
                                  ></p-tag>
                                </div>

                                <div class="flex items-center justify-between">
                                  <span class="text-sm font-medium">Email Verified</span>
                                  <p-tag 
                                    [value]="currentUser()?.emailVerified ? 'Yes' : 'No'" 
                                    [severity]="currentUser()?.emailVerified ? 'success' : 'warn'"
                                  ></p-tag>
                                </div>

                                <div>
                                  <span class="text-sm font-medium block mb-1">Member Since</span>
                                  <span class="text-sm text-surface-600 dark:text-surface-400">
                                    {{ formatDate(currentUser()?.createdAt) }}
                                  </span>
                                </div>

                                <div>
                                  <span class="text-sm font-medium block mb-1">Last Login</span>
                                  <span class="text-sm text-surface-600 dark:text-surface-400">
                                    {{ formatDate(currentUser()?.lastLoginAt) }}
                                  </span>
                                </div>
                              </div>
                            </p-card>
                          </div>
                        </div>
                      </div>
                    }
                    @case ('security') {
                      <div class="security-tab">
                        <!-- Security Settings Content -->
                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                          <!-- Security Forms -->
                          <div class="xl:col-span-2 space-y-6">
                            <!-- Change Password -->
                            <p-card>
                              <ng-template pTemplate="header">
                                <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                                  <h2 class="text-xl font-semibold">Change Password</h2>
                                </div>
                              </ng-template>

                              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-4">
                                <div class="field">
                                  <label for="currentPassword" class="block text-sm font-medium mb-2">Current Password *</label>
                                  <p-password
                                    id="currentPassword"
                                    formControlName="currentPassword"
                                    [feedback]="false"
                                    [toggleMask]="true"
                                    class="w-full"
                                    [class.ng-invalid]="isPasswordFieldInvalid('currentPassword')"
                                  ></p-password>
                                  @if (isPasswordFieldInvalid('currentPassword')) {
                                    <small class="p-error block mt-1">
                                      {{ getErrorMessage(passwordForm.get('currentPassword'), 'Current Password') }}
                                    </small>
                                  }
                                </div>

                                <div class="field">
                                  <label for="newPassword" class="block text-sm font-medium mb-2">New Password *</label>
                                  <p-password
                                    id="newPassword"
                                    formControlName="newPassword"
                                    [feedback]="true"
                                    [toggleMask]="true"
                                    class="w-full"
                                    [class.ng-invalid]="isPasswordFieldInvalid('newPassword')"
                                  ></p-password>
                                  @if (isPasswordFieldInvalid('newPassword')) {
                                    <small class="p-error block mt-1">
                                      {{ getErrorMessage(passwordForm.get('newPassword'), 'New Password') }}
                                    </small>
                                  }
                                </div>

                                <div class="field">
                                  <label for="confirmPassword" class="block text-sm font-medium mb-2">Confirm New Password *</label>
                                  <p-password
                                    id="confirmPassword"
                                    formControlName="confirmPassword"
                                    [feedback]="false"
                                    [toggleMask]="true"
                                    class="w-full"
                                    [class.ng-invalid]="isPasswordFieldInvalid('confirmPassword')"
                                  ></p-password>
                                  @if (isPasswordFieldInvalid('confirmPassword')) {
                                    <small class="p-error block mt-1">
                                      {{ getErrorMessage(passwordForm.get('confirmPassword'), 'Confirm Password') }}
                                    </small>
                                  }
                                </div>

                                <div class="flex justify-end">
                                  <p-button
                                    type="submit"
                                    label="Change Password"
                                    icon="pi pi-lock"
                                    [loading]="changingPassword()"
                                    [disabled]="passwordForm.invalid"
                                  ></p-button>
                                </div>
                              </form>
                            </p-card>
                          </div>

                          <!-- Security Settings Sidebar -->
                          <div class="space-y-6">
                            <!-- Security Settings -->
                            <p-card>
                              <ng-template pTemplate="header">
                                <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                                  <h3 class="text-lg font-semibold">Security Settings</h3>
                                </div>
                              </ng-template>

                              <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                  <div>
                                    <p class="font-medium">Two-Factor Authentication</p>
                                    <p class="text-sm text-surface-600 dark:text-surface-400">
                                      Add an extra layer of security
                                    </p>
                                  </div>
                                  <p-button
                                    [label]="currentUser()?.mfaEnabled ? 'Disable' : 'Enable'"
                                    [severity]="currentUser()?.mfaEnabled ? 'danger' : 'success'"
                                    [outlined]="true"
                                    size="small"
                                    (onClick)="toggleMFA()"
                                  ></p-button>
                                </div>

                                @if (!currentUser()?.emailVerified) {
                                  <div class="flex items-center justify-between">
                                    <div>
                                      <p class="font-medium">Email Verification</p>
                                      <p class="text-sm text-surface-600 dark:text-surface-400">
                                        Verify your email address
                                      </p>
                                    </div>
                                    <p-button
                                      label="Verify"
                                      severity="warn"
                                      [outlined]="true"
                                      size="small"
                                      (onClick)="sendVerificationEmail()"
                                    ></p-button>
                                  </div>
                                }

                                <div class="flex items-center justify-between">
                                  <div>
                                    <p class="font-medium">Active Sessions</p>
                                    <p class="text-sm text-surface-600 dark:text-surface-400">
                                      Manage your active sessions
                                    </p>
                                  </div>
                                  <p-button
                                    label="View"
                                    [outlined]="true"
                                    size="small"
                                    (onClick)="viewSessions()"
                                  ></p-button>
                                </div>
                              </div>
                            </p-card>

                            <!-- Danger Zone -->
                            <p-card>
                              <ng-template pTemplate="header">
                                <div class="p-4 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                                  <h3 class="text-lg font-semibold text-red-700 dark:text-red-300">Danger Zone</h3>
                                </div>
                              </ng-template>

                              <div class="space-y-4">
                                <div>
                                  <p class="font-medium text-red-700 dark:text-red-300 mb-2">Delete Account</p>
                                  <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
                                    Permanently delete your account and all associated data. This action cannot be undone.
                                  </p>
                                  <p-button
                                    label="Delete Account"
                                    severity="danger"
                                    [outlined]="true"
                                    size="small"
                                    (onClick)="deleteAccount()"
                                  ></p-button>
                                </div>
                              </div>
                            </p-card>
                          </div>
                        </div>
                      </div>
                    }
                    @default {
                      <div class="coming-soon-tab">
                        <p-card>
                          <ng-template pTemplate="header">
                            <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                              <h2 class="text-xl font-semibold">{{ profileTabs()[activeTabIndex()]?.label }}</h2>
                              <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                                Coming soon - This feature will be available in the next update
                              </p>
                            </div>
                          </ng-template>
                          <div class="p-6 text-center text-surface-600 dark:text-surface-400">
                            <i [class]="profileTabs()[activeTabIndex()]?.icon" class="text-4xl mb-4"></i>
                            <p>This feature will be available in the next update.</p>
                          </div>
                        </p-card>
                      </div>
                    }
                  }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .field {
      margin-bottom: 1rem;
    }

    .profile-tabs-container {
      background: var(--surface-card);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-1);
    }

    .tab-navigation {
      display: flex;
      background: var(--surface-50);
      border-bottom: 1px solid var(--surface-200);
      padding: 0 1rem;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tab-navigation::-webkit-scrollbar {
      display: none;
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border: none;
      background: transparent;
      color: var(--text-color-secondary);
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      border-radius: var(--border-radius) var(--border-radius) 0 0;
      margin-bottom: -1px;
    }

    .tab-button:hover:not(:disabled) {
      background: var(--surface-100);
      color: var(--text-color);
    }

    .tab-button.active {
      background: var(--primary-color);
      color: var(--primary-color-text);
      border-bottom: 2px solid var(--primary-color);
    }

    .tab-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tab-icon {
      font-size: 1rem;
    }

    .tab-content-container {
      padding: 2rem;
      background: var(--surface-card);
    }

    .tab-content {
      min-height: 400px;
    }

    /* Form validation styles */
    .field input.ng-valid:not(.ng-pristine) {
      border-color: var(--green-500);
    }

    .field input.ng-invalid.ng-touched {
      border-color: var(--red-500);
    }

    .field input.ng-pending {
      border-color: var(--blue-500);
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .tab-button {
        padding: 0.75rem 0.5rem;
        font-size: 0.75rem;
      }
      
      .tab-label {
        display: none;
      }
      
      .tab-content-container {
        padding: 1rem;
      }
      
      .tab-content {
        min-height: 300px;
      }
    }

    @media (max-width: 1280px) {
      .grid.xl\\:grid-cols-3 {
        grid-template-columns: 1fr;
      }
      
      .xl\\:col-span-2 {
        grid-column: span 1;
      }
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  readonly formPersistenceService = inject(FormPersistenceService);
  private readonly destroy$ = new Subject<void>();

  readonly currentUser = this.authService.currentUser;
  readonly updatingProfile = signal<boolean>(false);
  readonly changingPassword = signal<boolean>(false);
  readonly formId = 'profile-basic-info';

  // Tab management with signals
  readonly activeTabIndex = signal<number>(0);

  readonly profileTabs = signal<ProfileTab[]>([
    { id: 'basic', label: 'Basic Info', icon: 'pi pi-user' },
    { id: 'security', label: 'Security', icon: 'pi pi-shield' },
    { id: 'notifications', label: 'Notifications', icon: 'pi pi-bell' },
    { id: 'verification', label: 'Verification', icon: 'pi pi-verified' },
    { id: 'api-keys', label: 'API Keys', icon: 'pi pi-key' },
    { id: 'organization', label: 'Organization', icon: 'pi pi-building' },
    { id: 'privacy', label: 'Privacy & Data', icon: 'pi pi-shield' }
  ]);

  readonly profileForm = this.fb.group({
    firstName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      FormValidators.name()
    ]],
    lastName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      FormValidators.name()
    ]],
    email: ['', [
      Validators.required,
      Validators.email
    ], [
        FormValidators.emailAvailability(
          (email, currentEmail) => this.profileService.validateEmailAvailability(email, currentEmail),
          this.currentUser()?.email || ''
        )
      ]],
    phone: ['', [], [
      FormValidators.asyncPhoneNumber(
        (phone) => this.profileService.validatePhoneNumber(phone)
      )
    ]],
    organization: ['']
  });

  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: [this.passwordMatchValidator]
  });

  ngOnInit(): void {
    this.loadUserData();
    this.setupFormStatePreservation();
    this.setupRealTimeValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(index: number): void {
    // Save current form state before switching tabs
    if (this.activeTabIndex() === 0) { // Basic info tab
      this.saveFormState();
    }
    this.activeTabIndex.set(index);
  }

  private loadUserData(): void {
    const user = this.currentUser();
    if (user) {
      // Try to restore form state first, otherwise load user data
      const restored = this.formPersistenceService.restoreFormState(this.formId, this.profileForm);

      if (!restored) {
        this.profileForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
          organization: user.organizationName || ''
        });
      }
    }
  }

  private setupFormStatePreservation(): void {
    // Save form state on every change with debounce
    this.profileForm.valueChanges.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveFormState();
    });
  }

  private setupRealTimeValidation(): void {
    // Real-time validation for name fields
    const firstNameControl = this.profileForm.get('firstName');
    const lastNameControl = this.profileForm.get('lastName');
    const emailControl = this.profileForm.get('email');
    const phoneControl = this.profileForm.get('phone');

    // Trigger validation on value changes with debounce
    if (firstNameControl) {
      firstNameControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        firstNameControl.markAsTouched();
      });
    }

    if (lastNameControl) {
      lastNameControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        lastNameControl.markAsTouched();
      });
    }

    if (emailControl) {
      emailControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        emailControl.markAsTouched();
      });
    }

    if (phoneControl) {
      phoneControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        phoneControl.markAsTouched();
      });
    }
  }

  private saveFormState(): void {
    this.formPersistenceService.saveFormState(this.formId, this.profileForm, true);
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      FormUtils.markFormGroupTouched(this.profileForm);
      this.notificationService.error('Please fix the validation errors before submitting.');
      return;
    }

    this.updatingProfile.set(true);

    const formValue = this.profileForm.value;
    this.profileService.updateProfile({
      firstName: formValue.firstName!,
      lastName: formValue.lastName!,
      email: formValue.email!,
      phone: formValue.phone || undefined
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.updatingProfile.set(false);
        if (response.success) {
          this.notificationService.success('Profile updated successfully!');
          // Clear saved form state after successful update
          this.formPersistenceService.clearFormState(this.formId);
          // Update the current user if provided in response
          if (response.user) {
            // Update auth service user data here if needed
          }
        } else {
          this.notificationService.error(response.message || 'Failed to update profile');
        }
      },
      error: (error) => {
        this.updatingProfile.set(false);
        this.notificationService.error(error.message || 'An error occurred while updating your profile');
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      FormUtils.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.changingPassword.set(true);
    const formValue = this.passwordForm.value;

    // Mock API call - replace with actual implementation
    setTimeout(() => {
      console.log('Password changed');
      this.passwordForm.reset();
      this.changingPassword.set(false);
    }, 1000);
  }

  toggleMFA(): void {
    const user = this.currentUser();
    if (user?.mfaEnabled) {
      // Disable MFA
      console.log('Disable MFA');
    } else {
      // Enable MFA
      console.log('Enable MFA');
    }
  }

  sendVerificationEmail(): void {
    console.log('Send verification email');
  }

  viewSessions(): void {
    console.log('View active sessions');
  }

  deleteAccount(): void {
    console.log('Delete account');
  }

  private passwordMatchValidator(form: any): any {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field?.valid && field?.touched && field?.value);
  }

  isPasswordFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }

  resetForm(): void {
    this.formPersistenceService.clearFormState(this.formId);
    this.loadUserData();
    this.notificationService.info('Form has been reset to original values');
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}