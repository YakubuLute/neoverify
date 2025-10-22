import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SharedModule } from '../../../shared';
import { FormUtils } from '../../../shared/utils/form.utils';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [SharedModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-surface-900 dark:to-surface-950 p-4">
      <div class="w-full max-w-md">
        <!-- Logo and Title -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            NeoVerify
          </h1>
          <p class="text-surface-600 dark:text-surface-400">
            Two-Factor Authentication
          </p>
        </div>

        <!-- MFA Form -->
        <p-card class="shadow-lg">
          <div class="text-center mb-6">
            <i class="pi pi-shield text-4xl text-primary-500 mb-4"></i>
            <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-0 mb-2">
              Enter Verification Code
            </h2>
            <p class="text-surface-600 dark:text-surface-400">
              Please enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form [formGroup]="mfaForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- TOTP Code Input -->
            <div class="field">
              <label for="totpCode" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-2 text-center">
                Verification Code
              </label>
              <input
                id="totpCode"
                type="text"
                pInputText
                formControlName="totpCode"
                placeholder="000000"
                maxlength="6"
                class="w-full text-center text-2xl tracking-widest font-mono"
                [class.ng-invalid]="isFieldInvalid('totpCode')"
                (input)="onCodeInput($event)"
              />
              @if (isFieldInvalid('totpCode')) {
                <small class="p-error block mt-1 text-center">
                  {{ getErrorMessage(mfaForm.get('totpCode'), 'Verification code') }}
                </small>
              }
            </div>

            <!-- Submit Button -->
            <p-button
              type="submit"
              label="Verify"
              icon="pi pi-check"
              [loading]="loading()"
              [disabled]="mfaForm.invalid"
              styleClass="w-full"
            ></p-button>

            <!-- Backup Options -->
            <div class="text-center space-y-2">
              <p class="text-sm text-surface-500">
                Having trouble?
              </p>
              <div class="space-x-4">
                <a 
                  href="#" 
                  class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                  (click)="$event.preventDefault(); useBackupCode()"
                >
                  Use backup code
                </a>
                <span class="text-surface-300">|</span>
                <a 
                  href="#" 
                  class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                  (click)="$event.preventDefault(); resendCode()"
                >
                  Resend code
                </a>
              </div>
            </div>

            <!-- Back to Login -->
            <div class="text-center">
              <p-button
                label="Back to Login"
                icon="pi pi-arrow-left"
                [text]="true"
                (onClick)="backToLogin()"
              ></p-button>
            </div>
          </form>
        </p-card>

        <!-- Security Notice -->
        <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div class="flex items-start">
            <i class="pi pi-info-circle text-blue-500 mr-2 mt-0.5"></i>
            <div class="text-sm text-blue-700 dark:text-blue-300">
              <p class="font-medium mb-1">Security Notice</p>
              <p>This code expires in 30 seconds. Never share your verification codes with anyone.</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8 text-sm text-surface-500">
          <p>&copy; 2025 NeoVerify. All rights reserved.</p>
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
export class MfaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = this.authService.loading;
  
  private email = signal<string>('');
  private sessionToken = signal<string>('');

  readonly mfaForm = this.fb.group({
    totpCode: ['', [
      Validators.required, 
      Validators.pattern(/^\d{6}$/),
      Validators.minLength(6),
      Validators.maxLength(6)
    ]]
  });

  ngOnInit(): void {
    // Get email and session token from navigation state or redirect to login
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    
    if (state?.email && state?.sessionToken) {
      this.email.set(state.email);
      this.sessionToken.set(state.sessionToken);
    } else {
      // Try to get from session storage as fallback
      const storedSessionToken = sessionStorage.getItem('mfaSessionToken');
      if (!storedSessionToken) {
        this.router.navigate(['/auth/login']);
        return;
      }
      this.sessionToken.set(storedSessionToken);
    }
  }

  onSubmit(): void {
    if (this.mfaForm.valid && this.sessionToken()) {
      const totpCode = this.mfaForm.value.totpCode!;
      
      this.authService.verifyMfa({
        email: this.email(),
        totpCode,
        sessionToken: this.sessionToken()
      }).subscribe({
        next: () => {
          // Navigation handled by auth service
        },
        error: (error) => {
          console.error('MFA verification failed:', error);
          // Clear the form for retry
          this.mfaForm.patchValue({ totpCode: '' });
        }
      });
    } else {
      FormUtils.markFormGroupTouched(this.mfaForm);
    }
  }

  onCodeInput(event: any): void {
    const value = event.target.value.replace(/\D/g, ''); // Only allow digits
    event.target.value = value;
    this.mfaForm.patchValue({ totpCode: value });
    
    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      setTimeout(() => this.onSubmit(), 100);
    }
  }

  useBackupCode(): void {
    // TODO: Implement backup code functionality
    console.log('Use backup code clicked');
  }

  resendCode(): void {
    // TODO: Implement resend code functionality
    console.log('Resend code clicked');
  }

  backToLogin(): void {
    // Clear MFA session
    sessionStorage.removeItem('mfaSessionToken');
    this.router.navigate(['/auth/login']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.mfaForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }
}