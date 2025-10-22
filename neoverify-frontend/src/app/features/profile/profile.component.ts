import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SHARED_IMPORTS } from '../../shared';
import { User } from '../../shared/models/auth.models';
import { FormUtils } from '../../shared/utils/form.utils';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2">
            Profile Settings
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Manage your account information and security settings
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Profile Information -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Basic Information -->
            <p-card>
              <ng-template pTemplate="header">
                <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                  <h2 class="text-xl font-semibold">Basic Information</h2>
                </div>
              </ng-template>

              <form [formGroup]="profileForm" (ngSubmit)="updateProfile()" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="field">
                    <label for="firstName" class="block text-sm font-medium mb-2">First Name *</label>
                    <input
                      id="firstName"
                      type="text"
                      pInputText
                      formControlName="firstName"
                      class="w-full"
                      [class.ng-invalid]="isFieldInvalid('firstName')"
                    />
                    @if (isFieldInvalid('firstName')) {
                      <small class="p-error block mt-1">
                        {{ getErrorMessage(profileForm.get('firstName'), 'First Name') }}
                      </small>
                    }
                  </div>

                  <div class="field">
                    <label for="lastName" class="block text-sm font-medium mb-2">Last Name *</label>
                    <input
                      id="lastName"
                      type="text"
                      pInputText
                      formControlName="lastName"
                      class="w-full"
                      [class.ng-invalid]="isFieldInvalid('lastName')"
                    />
                    @if (isFieldInvalid('lastName')) {
                      <small class="p-error block mt-1">
                        {{ getErrorMessage(profileForm.get('lastName'), 'Last Name') }}
                      </small>
                    }
                  </div>
                </div>

                <div class="field">
                  <label for="email" class="block text-sm font-medium mb-2">Email Address *</label>
                  <input
                    id="email"
                    type="email"
                    pInputText
                    formControlName="email"
                    class="w-full"
                    [class.ng-invalid]="isFieldInvalid('email')"
                  />
                  @if (isFieldInvalid('email')) {
                    <small class="p-error block mt-1">
                      {{ getErrorMessage(profileForm.get('email'), 'Email') }}
                    </small>
                  }
                </div>

                <div class="field">
                  <label for="phone" class="block text-sm font-medium mb-2">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    pInputText
                    formControlName="phone"
                    class="w-full"
                    [class.ng-invalid]="isFieldInvalid('phone')"
                  />
                  @if (isFieldInvalid('phone')) {
                    <small class="p-error block mt-1">
                      {{ getErrorMessage(profileForm.get('phone'), 'Phone') }}
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

                <div class="flex justify-end">
                  <p-button
                    type="submit"
                    label="Update Profile"
                    icon="pi pi-save"
                    [loading]="updatingProfile()"
                    [disabled]="profileForm.invalid"
                  ></p-button>
                </div>
              </form>
            </p-card>

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
                    styleClass="w-full"
                    inputStyleClass="w-full"
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
                    styleClass="w-full"
                    inputStyleClass="w-full"
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
                    styleClass="w-full"
                    inputStyleClass="w-full"
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

          <!-- Account Overview -->
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
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .field {
      margin-bottom: 1rem;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly updatingProfile = signal<boolean>(false);
  readonly changingPassword = signal<boolean>(false);

  readonly profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
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
  }

  private loadUserData(): void {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        organization: user.organizationName || ''
      });
    }
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      FormUtils.markFormGroupTouched(this.profileForm);
      return;
    }

    this.updatingProfile.set(true);
    const formValue = this.profileForm.value;

    // Mock API call - replace with actual implementation
    setTimeout(() => {
      console.log('Profile updated:', formValue);
      this.updatingProfile.set(false);
    }, 1000);
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

  private passwordMatchValidator(form: any) {
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

  isPasswordFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}