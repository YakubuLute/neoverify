import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SHARED_IMPORTS, FormUtils } from '../../../shared';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full">
        <!-- Logo and Header -->
        <div class="text-center mb-8">
          <div class="mx-auto h-20 w-20 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <i class="pi pi-shield text-white text-3xl"></i>
          </div>
          <h2 class="text-3xl font-bold text-gray-900 mb-2">
            Two-Factor Authentication
          </h2>
          <p class="text-gray-600 text-lg">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <!-- MFA Form Card -->
        <div class="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <!-- User Info -->
          <div class="bg-blue-50 rounded-2xl p-4 mb-6">
            <div class="flex items-center space-x-3">
              <div class="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <i class="pi pi-user text-blue-600"></i>
              </div>
              <div>
                <p class="text-sm text-gray-600">Signing in as</p>
                <p class="font-semibold text-gray-900">{{ email() }}</p>
              </div>
            </div>
          </div>

          <form [formGroup]="mfaForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- MFA Code Input -->
            <div class="space-y-2">
              <label for="totpCode" class="block text-sm font-semibold text-gray-700">
                Authentication Code
              </label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i class="pi pi-key text-gray-400 group-focus-within:text-green-500 transition-colors"></i>
                </div>
                <input
                  id="totpCode"
                  type="text"
                  pInputText
                  formControlName="totpCode"
                  placeholder="000000"
                  maxlength="6"
                  class="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 text-gray-900 placeholder-gray-400 text-center text-2xl font-mono tracking-widest"
                  [class.border-red-300]="mfaForm.get('totpCode')?.invalid && mfaForm.get('totpCode')?.touched"
                  (input)="onCodeInput($event)"
                />
              </div>
              @if (mfaForm.get('totpCode')?.invalid && mfaForm.get('totpCode')?.touched) {
                <p class="text-red-500 text-sm mt-1 flex items-center">
                  <i class="pi pi-exclamation-circle mr-1"></i>
                  {{ getErrorMessage(mfaForm.get('totpCode'), 'Authentication code') }}
                </p>
              }
              <p class="text-xs text-gray-500 text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="mfaForm.invalid || verifying()"
              class="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
            >
              @if (verifying()) {
                <i class="pi pi-spin pi-spinner text-lg"></i>
                <span class="text-lg">Verifying...</span>
              } @else {
                <i class="pi pi-check text-lg"></i>
                <span class="text-lg">Verify & Continue</span>
              }
            </button>

            <!-- Help Section -->
            <div class="bg-gray-50 rounded-2xl p-4 space-y-3">
              <h3 class="font-semibold text-gray-800 flex items-center">
                <i class="pi pi-question-circle mr-2 text-gray-600"></i>
                Need Help?
              </h3>
              <div class="space-y-2 text-sm text-gray-600">
                <p class="flex items-start">
                  <i class="pi pi-mobile mr-2 mt-0.5 text-gray-400"></i>
                  Open your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <p class="flex items-start">
                  <i class="pi pi-eye mr-2 mt-0.5 text-gray-400"></i>
                  Find the 6-digit code for NeoVerify
                </p>
                <p class="flex items-start">
                  <i class="pi pi-clock mr-2 mt-0.5 text-gray-400"></i>
                  Enter the code before it expires (usually 30 seconds)
                </p>
              </div>
            </div>

            <!-- Alternative Options -->
            <div class="text-center space-y-3">
              <button
                type="button"
                class="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                (click)="resendCode()"
              >
                Didn't receive a code? Try again
              </button>
              
              <div class="text-sm text-gray-500">
                or
              </div>
              
              <button
                type="button"
                routerLink="/auth/login"
                class="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        </div>

        <!-- Security Notice -->
        <div class="text-center mt-8">
          <div class="bg-green-50 rounded-2xl p-4 border border-green-200">
            <div class="flex items-center justify-center space-x-2 text-green-700">
              <i class="pi pi-shield"></i>
              <span class="text-sm font-medium">Your account is protected by two-factor authentication</span>
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
  `]
})
export class MfaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly email = signal<string>('');
  readonly sessionToken = signal<string>('');
  readonly verifying = signal<boolean>(false);

  readonly mfaForm = this.fb.group({
    totpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  ngOnInit(): void {
    // Get email and session token from navigation state
    const state = this.router.getCurrentNavigation()?.extras.state;
    if (state?.['email'] && state?.['sessionToken']) {
      this.email.set(state['email']);
      this.sessionToken.set(state['sessionToken']);
    } else {
      // Redirect to login if no session data
      this.router.navigate(['/auth/login']);
    }
  }

  onSubmit(): void {
    if (this.mfaForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.verifying.set(true);
    const { totpCode } = this.mfaForm.value;

    // Mock MFA verification - replace with actual implementation
    setTimeout(() => {
      console.log('MFA verification:', {
        email: this.email(),
        totpCode,
        sessionToken: this.sessionToken()
      });
      
      this.verifying.set(false);
      // Navigate to dashboard on successful verification
      this.router.navigate(['/dashboard']);
    }, 1500);
  }

  onCodeInput(event: any): void {
    // Auto-submit when 6 digits are entered
    const value = event.target.value;
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      setTimeout(() => this.onSubmit(), 100);
    }
  }

  resendCode(): void {
    // Mock resend functionality
    console.log('Resending MFA code to:', this.email());
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.mfaForm.controls).forEach(key => {
      const control = this.mfaForm.get(key);
      control?.markAsTouched();
    });
  }
}