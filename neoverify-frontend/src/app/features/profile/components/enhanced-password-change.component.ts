import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SHARED_IMPORTS, FormUtils } from '../../../shared';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

interface PasswordStrength {
    score: number; // 0-4
    label: string;
    color: string;
    suggestions: string[];
}

interface PasswordHistory {
    id: string;
    hashedPassword: string;
    createdAt: Date;
}

@Component({
    selector: 'app-enhanced-password-change',
    standalone: true,
    imports: SHARED_IMPORTS,
    template: `
    <div class="enhanced-password-change">
      <!-- Header -->
      <div class="header mb-6">
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2">
          Change Password
        </h2>
        <p class="text-surface-600 dark:text-surface-400">
          Update your password to keep your account secure
        </p>
      </div>

      <!-- Password Change Form -->
      <p-card>
        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-6">
          <!-- Current Password -->
          <div class="field">
            <label for="currentPassword" class="block text-sm font-medium mb-2">
              Current Password *
            </label>
            <div class="relative">
              <p-password
                id="currentPassword"
                formControlName="currentPassword"
                [feedback]="false"
                [toggleMask]="true"
                placeholder="Enter your current password"
                class="w-full"
                [class.ng-invalid]="isFieldInvalid('currentPassword')"
              ></p-password>
              @if (currentPasswordVerified()) {
                <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <i class="pi pi-check text-green-600"></i>
                </div>
              }
            </div>
            @if (isFieldInvalid('currentPassword')) {
              <small class="p-error block mt-1">
                {{ getErrorMessage(passwordForm.get('currentPassword'), 'Current Password') }}
              </small>
            }
            @if (currentPasswordError()) {
              <small class="p-error block mt-1">
                {{ currentPasswordError() }}
              </small>
            }
          </div>

          <!-- New Password -->
          <div class="field">
            <label for="newPassword" class="block text-sm font-medium mb-2">
              New Password *
            </label>
            <p-password
              id="newPassword"
              formControlName="newPassword"
              [feedback]="false"
              [toggleMask]="true"
              placeholder="Enter your new password"
              class="w-full"
              [class.ng-invalid]="isFieldInvalid('newPassword')"
            ></p-password>
            
            <!-- Password Strength Indicator -->
            @if (passwordForm.get('newPassword')?.value) {
              <div class="password-strength mt-3">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">Password Strength:</span>
                  <span class="text-sm font-medium" [style.color]="passwordStrength().color">
                    {{ passwordStrength().label }}
                  </span>
                </div>
                
                <!-- Strength Bar -->
                <div class="strength-bar bg-surface-200 dark:bg-surface-700 rounded-full h-2 mb-3">
                  <div 
                    class="strength-fill h-full rounded-full transition-all duration-300"
                    [style.width.%]="(passwordStrength().score + 1) * 20"
                    [style.background-color]="passwordStrength().color"
                  ></div>
                </div>

                <!-- Requirements Checklist -->
                <div class="requirements-checklist space-y-2">
                  <div class="requirement-item flex items-center gap-2">
                    <i [class]="hasMinLength() ? 'pi pi-check text-green-600' : 'pi pi-times text-red-500'"></i>
                    <span class="text-sm" [class.text-green-600]="hasMinLength()" [class.text-red-500]="!hasMinLength()">
                      At least 8 characters
                    </span>
                  </div>
                  
                  <div class="requirement-item flex items-center gap-2">
                    <i [class]="hasUppercase() ? 'pi pi-check text-green-600' : 'pi pi-times text-red-500'"></i>
                    <span class="text-sm" [class.text-green-600]="hasUppercase()" [class.text-red-500]="!hasUppercase()">
                      One uppercase letter
                    </span>
                  </div>
                  
                  <div class="requirement-item flex items-center gap-2">
                    <i [class]="hasLowercase() ? 'pi pi-check text-green-600' : 'pi pi-times text-red-500'"></i>
                    <span class="text-sm" [class.text-green-600]="hasLowercase()" [class.text-red-500]="!hasLowercase()">
                      One lowercase letter
                    </span>
                  </div>
                  
                  <div class="requirement-item flex items-center gap-2">
                    <i [class]="hasNumber() ? 'pi pi-check text-green-600' : 'pi pi-times text-red-500'"></i>
                    <span class="text-sm" [class.text-green-600]="hasNumber()" [class.text-red-500]="!hasNumber()">
                      One number
                    </span>
                  </div>
                  
                  <div class="requirement-item flex items-center gap-2">
                    <i [class]="hasSpecialChar() ? 'pi pi-check text-green-600' : 'pi pi-times text-red-500'"></i>
                    <span class="text-sm" [class.text-green-600]="hasSpecialChar()" [class.text-red-500]="!hasSpecialChar()">
                      One special character (!@#$%^&*)
                    </span>
                  </div>
                  
                  <div class="requirement-item flex items-center gap-2">
                    <i [class]="!isPasswordReused() ? 'pi pi-check text-green-600' : 'pi pi-times text-red-500'"></i>
                    <span class="text-sm" [class.text-green-600]="!isPasswordReused()" [class.text-red-500]="isPasswordReused()">
                      Not previously used
                    </span>
                  </div>
                </div>

                <!-- Suggestions -->
                @if (passwordStrength().suggestions.length > 0) {
                  <div class="suggestions mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Suggestions to improve your password:
                    </h4>
                    <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      @for (suggestion of passwordStrength().suggestions; track suggestion) {
                        <li>• {{ suggestion }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }

            @if (isFieldInvalid('newPassword')) {
              <small class="p-error block mt-1">
                {{ getErrorMessage(passwordForm.get('newPassword'), 'New Password') }}
              </small>
            }
          </div>

          <!-- Confirm Password -->
          <div class="field">
            <label for="confirmPassword" class="block text-sm font-medium mb-2">
              Confirm New Password *
            </label>
            <div class="relative">
              <p-password
                id="confirmPassword"
                formControlName="confirmPassword"
                [feedback]="false"
                [toggleMask]="true"
                placeholder="Confirm your new password"
                class="w-full"
                [class.ng-invalid]="isFieldInvalid('confirmPassword')"
              ></p-password>
              @if (passwordsMatch() && passwordForm.get('confirmPassword')?.value) {
                <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <i class="pi pi-check text-green-600"></i>
                </div>
              }
            </div>
            @if (isFieldInvalid('confirmPassword')) {
              <small class="p-error block mt-1">
                {{ getErrorMessage(passwordForm.get('confirmPassword'), 'Confirm Password') }}
              </small>
            }
          </div>

          <!-- Security Notice -->
          <div class="security-notice bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <i class="pi pi-info-circle text-yellow-600 mt-1"></i>
              <div>
                <h4 class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Security Notice
                </h4>
                <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• Changing your password will sign you out of all other devices</li>
                  <li>• You cannot reuse any of your last 5 passwords</li>
                  <li>• Use a unique password that you don't use elsewhere</li>
                  <li>• Consider using a password manager for better security</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions flex justify-between items-center pt-4">
            <p-button
              label="Cancel"
              severity="secondary"
              [outlined]="true"
              (onClick)="resetForm()"
              [disabled]="changingPassword()"
            ></p-button>

            <p-button
              type="submit"
              label="Change Password"
              icon="pi pi-lock"
              [loading]="changingPassword()"
              [disabled]="passwordForm.invalid || passwordStrength().score < 2"
            ></p-button>
          </div>
        </form>
      </p-card>

      <!-- Password History (for admins/debugging) -->
      @if (showPasswordHistory()) {
        <div class="password-history mt-6">
          <p-card>
            <ng-template pTemplate="header">
              <div class="p-4 border-b border-surface-200 dark:border-surface-700">
                <h3 class="text-lg font-semibold">Password History</h3>
                <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
                  Recent password changes (for security purposes)
                </p>
              </div>
            </ng-template>

            <div class="space-y-3">
              @for (entry of passwordHistory(); track entry.id) {
                <div class="history-entry flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                  <div class="flex items-center gap-3">
                    <i class="pi pi-key text-surface-600"></i>
                    <div>
                      <p class="font-medium">Password Changed</p>
                      <p class="text-sm text-surface-600 dark:text-surface-400">
                        {{ formatDate(entry.createdAt) }}
                      </p>
                    </div>
                  </div>
                  <p-tag value="Historical" severity="secondary"></p-tag>
                </div>
              }
            </div>
          </p-card>
        </div>
      }
    </div>
  `,
    styles: [`
    .enhanced-password-change {
      max-width: 600px;
    }

    .strength-bar {
      overflow: hidden;
    }

    .strength-fill {
      min-width: 4px;
    }

    .requirements-checklist {
      font-size: 0.875rem;
    }

    .requirement-item {
      padding: 0.25rem 0;
    }

    .suggestions {
      border-left: 4px solid var(--blue-500);
    }

    .security-notice {
      border-left: 4px solid var(--yellow-500);
    }

    .password-history .history-entry {
      transition: all 0.2s;
    }

    .password-history .history-entry:hover {
      background: var(--surface-100);
    }

    @media (max-width: 640px) {
      .form-actions {
        flex-direction: column;
        gap: 1rem;
      }

      .form-actions p-button {
        width: 100%;
      }
    }
  `]
})
export class EnhancedPasswordChangeComponent implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly notificationService = inject(NotificationService);
    private readonly destroy$ = new Subject<void>();

    // Signals
    readonly changingPassword = signal<boolean>(false);
    readonly currentPasswordVerified = signal<boolean>(false);
    readonly currentPasswordError = signal<string>('');
    readonly passwordStrength = signal<PasswordStrength>({
        score: 0,
        label: 'Very Weak',
        color: '#ef4444',
        suggestions: []
    });
    readonly passwordHistory = signal<PasswordHistory[]>([]);
    readonly showPasswordHistory = signal<boolean>(false);

    // Form
    readonly passwordForm = this.fb.group({
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [
            Validators.required,
            Validators.minLength(8),
            this.passwordStrengthValidator.bind(this),
            this.passwordHistoryValidator.bind(this)
        ]],
        confirmPassword: ['', [Validators.required]]
    }, {
        validators: [this.passwordMatchValidator.bind(this)]
    });

    // Mock password history for validation
    private readonly mockPasswordHistory = [
        'previous_password_hash_1',
        'previous_password_hash_2',
        'previous_password_hash_3',
        'previous_password_hash_4',
        'previous_password_hash_5'
    ];

    ngOnInit(): void {
        this.setupPasswordValidation();
        this.loadPasswordHistory();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private setupPasswordValidation(): void {
        // Real-time password strength checking
        const newPasswordControl = this.passwordForm.get('newPassword');
        if (newPasswordControl) {
            newPasswordControl.valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            ).subscribe(password => {
                if (password) {
                    this.updatePasswordStrength(password);
                }
            });
        }

        // Current password verification
        const currentPasswordControl = this.passwordForm.get('currentPassword');
        if (currentPasswordControl) {
            currentPasswordControl.valueChanges.pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            ).subscribe(password => {
                if (password && password.length >= 6) {
                    this.verifyCurrentPassword(password);
                } else {
                    this.currentPasswordVerified.set(false);
                    this.currentPasswordError.set('');
                }
            });
        }
    }

    private loadPasswordHistory(): void {
        // Mock password history loading
        const mockHistory: PasswordHistory[] = [
            {
                id: '1',
                hashedPassword: 'hash1',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
            },
            {
                id: '2',
                hashedPassword: 'hash2',
                createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
            }
        ];

        this.passwordHistory.set(mockHistory);
    }

    private verifyCurrentPassword(password: string): void {
        // Mock current password verification
        setTimeout(() => {
            if (password === 'wrongpassword') {
                this.currentPasswordVerified.set(false);
                this.currentPasswordError.set('Current password is incorrect');
            } else {
                this.currentPasswordVerified.set(true);
                this.currentPasswordError.set('');
            }
        }, 500);
    }

    private updatePasswordStrength(password: string): void {
        const strength = this.calculatePasswordStrength(password);
        this.passwordStrength.set(strength);
    }

    private calculatePasswordStrength(password: string): PasswordStrength {
        let score = 0;
        const suggestions: string[] = [];

        // Length check
        if (password.length >= 8) score++;
        else suggestions.push('Use at least 8 characters');

        if (password.length >= 12) score++;
        else if (password.length >= 8) suggestions.push('Consider using 12+ characters for better security');

        // Character variety checks
        if (/[a-z]/.test(password)) score++;
        else suggestions.push('Add lowercase letters');

        if (/[A-Z]/.test(password)) score++;
        else suggestions.push('Add uppercase letters');

        if (/[0-9]/.test(password)) score++;
        else suggestions.push('Add numbers');

        if (/[^A-Za-z0-9]/.test(password)) score++;
        else suggestions.push('Add special characters (!@#$%^&*)');

        // Common patterns check
        if (this.hasCommonPatterns(password)) {
            score = Math.max(0, score - 1);
            suggestions.push('Avoid common patterns like "123" or "abc"');
        }

        // Dictionary words check
        if (this.hasCommonWords(password)) {
            score = Math.max(0, score - 1);
            suggestions.push('Avoid common dictionary words');
        }

        // Determine label and color based on score
        let label: string;
        let color: string;

        switch (Math.min(score, 4)) {
            case 0:
            case 1:
                label = 'Very Weak';
                color = '#ef4444';
                break;
            case 2:
                label = 'Weak';
                color = '#f97316';
                break;
            case 3:
                label = 'Good';
                color = '#eab308';
                break;
            case 4:
                label = 'Strong';
                color = '#22c55e';
                break;
            default:
                label = 'Very Strong';
                color = '#16a34a';
        }

        return {
            score: Math.min(score, 4),
            label,
            color,
            suggestions: suggestions.slice(0, 3) // Limit to 3 suggestions
        };
    }

    private hasCommonPatterns(password: string): boolean {
        const patterns = [
            /123/,
            /abc/,
            /qwerty/i,
            /password/i,
            /(.)\1{2,}/ // Repeated characters
        ];
        return patterns.some(pattern => pattern.test(password));
    }

    private hasCommonWords(password: string): boolean {
        const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'test'];
        const lowerPassword = password.toLowerCase();
        return commonWords.some(word => lowerPassword.includes(word));
    }

    private passwordStrengthValidator(control: AbstractControl): any {
        const password = control.value;
        if (!password) return null;

        const strength = this.calculatePasswordStrength(password);
        if (strength.score < 2) {
            return { weakPassword: true };
        }
        return null;
    }

    private passwordHistoryValidator(control: AbstractControl): any {
        const password = control.value;
        if (!password) return null;

        // Mock password history check
        const hashedPassword = this.hashPassword(password);
        if (this.mockPasswordHistory.includes(hashedPassword)) {
            return { passwordReused: true };
        }
        return null;
    }

    private passwordMatchValidator(form: AbstractControl): any {
        const newPassword = form.get('newPassword');
        const confirmPassword = form.get('confirmPassword');

        if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
            confirmPassword.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        }

        return null;
    }

    private hashPassword(password: string): string {
        // Mock hashing - in real app, this would be done server-side
        return `hash_${password.length}_${password.charAt(0)}`;
    }

    changePassword(): void {
        if (this.passwordForm.invalid) {
            FormUtils.markFormGroupTouched(this.passwordForm);
            this.notificationService.error('Please fix the validation errors before submitting.');
            return;
        }

        this.changingPassword.set(true);
        const formValue = this.passwordForm.value;

        // Mock API call
        setTimeout(() => {
            console.log('Password changed successfully');
            this.notificationService.success('Password changed successfully! You will be signed out of other devices.');
            this.passwordForm.reset();
            this.changingPassword.set(false);
            this.currentPasswordVerified.set(false);
            this.passwordStrength.set({
                score: 0,
                label: 'Very Weak',
                color: '#ef4444',
                suggestions: []
            });
        }, 2000);
    }

    resetForm(): void {
        this.passwordForm.reset();
        this.currentPasswordVerified.set(false);
        this.currentPasswordError.set('');
        this.passwordStrength.set({
            score: 0,
            label: 'Very Weak',
            color: '#ef4444',
            suggestions: []
        });
    }

    // Helper methods for template
    hasMinLength(): boolean {
        const password = this.passwordForm.get('newPassword')?.value || '';
        return password.length >= 8;
    }

    hasUppercase(): boolean {
        const password = this.passwordForm.get('newPassword')?.value || '';
        return /[A-Z]/.test(password);
    }

    hasLowercase(): boolean {
        const password = this.passwordForm.get('newPassword')?.value || '';
        return /[a-z]/.test(password);
    }

    hasNumber(): boolean {
        const password = this.passwordForm.get('newPassword')?.value || '';
        return /[0-9]/.test(password);
    }

    hasSpecialChar(): boolean {
        const password = this.passwordForm.get('newPassword')?.value || '';
        return /[^A-Za-z0-9]/.test(password);
    }

    isPasswordReused(): boolean {
        const password = this.passwordForm.get('newPassword')?.value || '';
        if (!password) return false;
        const hashedPassword = this.hashPassword(password);
        return this.mockPasswordHistory.includes(hashedPassword);
    }

    passwordsMatch(): boolean {
        const newPassword = this.passwordForm.get('newPassword')?.value;
        const confirmPassword = this.passwordForm.get('confirmPassword')?.value;
        return newPassword && confirmPassword && newPassword === confirmPassword;
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.passwordForm.get(fieldName);
        return !!(field?.invalid && field?.touched);
    }

    getErrorMessage(control: any, fieldName: string): string {
        if (control?.errors?.['required']) {
            return `${fieldName} is required`;
        }
        if (control?.errors?.['minlength']) {
            return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
        }
        if (control?.errors?.['weakPassword']) {
            return 'Password is too weak';
        }
        if (control?.errors?.['passwordReused']) {
            return 'This password was recently used. Please choose a different password';
        }
        if (control?.errors?.['passwordMismatch']) {
            return 'Passwords do not match';
        }
        return FormUtils.getErrorMessage(control, fieldName);
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}