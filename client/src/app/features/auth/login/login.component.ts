import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SHARED_IMPORTS, FormUtils } from '../../../shared';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full">
        <!-- Logo and Header -->
        <div class="text-center mb-8">
          <div class="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <i class="pi pi-shield text-white text-3xl"></i>
          </div>
          <h2 class="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p class="text-gray-600 text-lg">
            Sign in to your NeoVerify account
          </p>
        </div>

        <!-- Login Form Card -->
        <div class="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Email Field -->
            <div class="space-y-2">
              <label for="email" class="block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div class="relative group">
            
                <input
                  id="email"
                  type="email"
                  pInputText
                  formControlName="email"
                  placeholder="Enter your email address"
                  class="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                  [class.border-red-300]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                  [class.focus:ring-red-100]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                  [class.focus:border-red-500]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                />
              </div>
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <p class="text-red-500 text-sm mt-1 flex items-center">
                  <i class="pi pi-exclamation-circle mr-1"></i>
                  {{ getErrorMessage(loginForm.get('email'), 'Email') }}
                </p>
              }
            </div>

            <!-- Password Field -->
            <div class="space-y-2">
              <label for="password" class="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div class="">
             
                <p-password     
                        
                  id="password"
                  formControlName="password"
                  placeholder="Enter your password"
                  [toggleMask]="true"
                  [feedback]="false"
                  class="w-full"
                  inputStyleClass="w-full pl-14 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                  [class.ng-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                ></p-password>
              </div>
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <p class="text-red-500 text-sm mt-1 flex items-center">
                  <i class="pi pi-exclamation-circle mr-1"></i>
                  {{ getErrorMessage(loginForm.get('password'), 'Password') }}
                </p>
              }
            </div>

            <!-- Remember Me & Forgot Password -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <p-checkbox
                  formControlName="rememberMe"
                  inputId="rememberMe"
                  [binary]="true"
                  class="mr-3"
                ></p-checkbox>
                <label for="rememberMe" class="text-sm text-gray-600 font-medium">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                class="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200"
                (click)="forgotPassword()"
              >
                Forgot password?
              </button>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="loginForm.invalid || loading()"
              class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
            >
              @if (loading()) {
                <i class="pi pi-spin pi-spinner text-lg"></i>
                <span class="text-lg">Signing in...</span>
              } @else {
                <i class="pi pi-sign-in text-lg"></i>
                <span class="text-lg">Sign In</span>
              }
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-8">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-white text-gray-500 font-medium">New to NeoVerify?</span>
            </div>
          </div>

          <!-- Sign Up Link -->
          <button
            type="button"
            routerLink="/auth/signup"
            class="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center space-x-3"
          >
            <i class="pi pi-user-plus text-lg"></i>
            <span class="text-lg">Create New Account</span>
          </button>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8">
          <p class="text-sm text-gray-500 flex items-center justify-center space-x-4">
            <span class="flex items-center">
              <i class="pi pi-shield mr-1"></i>
              Secure
            </span>
            <span class="flex items-center">
              <i class="pi pi-verified mr-1"></i>
              Trusted
            </span>
            <span class="flex items-center">
              <i class="pi pi-check-circle mr-1"></i>
              Verified
            </span>
          </p>
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
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal<boolean>(false);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading.set(true);
    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.loading.set(false);
        // Navigation is handled in the auth service
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  forgotPassword(): void {
    // TODO: Implement forgot password functionality
    console.log('Forgot password clicked');
  }

  getErrorMessage(control: any, fieldName: string): string {
    return FormUtils.getErrorMessage(control, fieldName);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}