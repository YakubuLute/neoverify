import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
  User,
  Organization,
  LoginRequest,
  SignUpRequest,
  MfaVerificationRequest,
  AuthResponse,
  UserRole,
  InviteUserRequest,
  BillingPlan
} from '../../shared/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  // Reactive state
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  private readonly currentOrganizationSubject = new BehaviorSubject<Organization | null>(null);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly mfaRequiredSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly currentOrganization$ = this.currentOrganizationSubject.asObservable();
  readonly isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));
  readonly loading$ = this.loadingSubject.asObservable();
  readonly mfaRequired$ = this.mfaRequiredSubject.asObservable();

  // Signals for modern reactive patterns
  readonly currentUser = signal<User | null>(null);
  readonly currentOrganization = signal<Organization | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly loading = signal<boolean>(false);
  readonly mfaRequired = signal<boolean>(false);

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from stored token
   */
  private initializeAuth(): void {
    const token = this.getStoredToken();
    if (token) {
      this.validateToken(token);
    }
  }

  /**
   * Sign up new organization and admin user
   */
  signUp(request: SignUpRequest): Observable<{ message: string }> {
    this.setLoading(true);

    return this.apiService.post<{ message: string }>('auth/signup', request).pipe(
      map(response => response.data),
      tap(() => {
        this.notificationService.success('Account created! Please check your email to verify your account.');
      }),
      catchError(error => {
        this.notificationService.error('Sign up failed. Please try again.');
        return throwError(() => error);
      }),
      tap(() => this.setLoading(false))
    );
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.setLoading(true);

    // Hardcoded test account authentication
    if (credentials.email === 'test@email.com' && credentials.password === 'Test@1234') {
      return this.handleTestAccountLogin();
    }

    return this.apiService.post<AuthResponse>('auth/login', credentials).pipe(
      map(response => response.data),
      tap(authData => {
        if (authData.requiresMfa) {
          this.setMfaRequired(true, authData.sessionToken);
          this.notificationService.info('Please enter your MFA code to complete login.');
        } else {
          this.setAuthData(authData);
          this.notificationService.success('Login successful!');
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(error => {
        this.notificationService.error('Login failed. Please check your credentials.');
        return throwError(() => error);
      }),
      tap(() => this.setLoading(false))
    );
  }

  /**
   * Handle hardcoded test account login
   */
  private handleTestAccountLogin(): Observable<AuthResponse> {
    const testUser: User = {
      id: 'test-user-id',
      email: 'test@email.com',
      name: 'Test Admin',
      firstName: 'Test',
      lastName: 'Admin',
      role: UserRole.ORG_ADMIN,
      organizationId: 'test-org-id',
      organizationName: 'Test Organization',
      mfaEnabled: false,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const testOrganization: Organization = {
      id: 'test-org-id',
      name: 'Test Organization',
      domain: 'test.com',
      isActive: true,
      plan: BillingPlan.PROFESSIONAL,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const authResponse: AuthResponse = {
      token: 'test-jwt-token',
      refreshToken: 'test-refresh-token',
      user: testUser,
      organization: testOrganization,
      requiresMfa: false
    };

    return of(authResponse).pipe(
      tap(authData => {
        this.setAuthData(authData);
        this.notificationService.success('Login successful!');
        this.router.navigate(['/dashboard']);
      }),
      tap(() => this.setLoading(false))
    );
  }

  /**
   * Verify MFA code
   */
  verifyMfa(request: MfaVerificationRequest): Observable<AuthResponse> {
    this.setLoading(true);

    return this.apiService.post<AuthResponse>('auth/mfa/verify', request).pipe(
      map(response => response.data),
      tap(authData => {
        this.setAuthData(authData);
        this.setMfaRequired(false);
        this.notificationService.success('Login successful!');
        this.router.navigate(['/dashboard']);
      }),
      catchError(error => {
        this.notificationService.error('Invalid MFA code. Please try again.');
        return throwError(() => error);
      }),
      tap(() => this.setLoading(false))
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuthData();
    this.notificationService.info('You have been logged out.');
    this.router.navigate(['/auth/login']);
  }

  /**
   * Refresh authentication token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.apiService.post<AuthResponse>('auth/refresh', { refreshToken }).pipe(
      map(response => response.data),
      tap(authData => {
        this.setAuthData(authData);
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Get current organization
   */
  getCurrentOrganization(): Organization | null {
    return this.currentOrganization();
  }

  /**
   * Invite user to organization
   */
  inviteUser(request: InviteUserRequest): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>('auth/invite', request).pipe(
      map(response => response.data),
      tap(() => {
        this.notificationService.success(`Invitation sent to ${request.email}`);
      }),
      catchError(error => {
        this.notificationService.error('Failed to send invitation. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Set authentication data
   */
  private setAuthData(authData: AuthResponse): void {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('organization', JSON.stringify(authData.organization));

    this.currentUserSubject.next(authData.user);
    this.currentOrganizationSubject.next(authData.organization);
    this.currentUser.set(authData.user);
    this.currentOrganization.set(authData.organization);
  }

  /**
   * Set MFA required state
   */
  private setMfaRequired(required: boolean, sessionToken?: string): void {
    this.mfaRequiredSubject.next(required);
    this.mfaRequired.set(required);

    if (sessionToken) {
      sessionStorage.setItem('mfaSessionToken', sessionToken);
    } else {
      sessionStorage.removeItem('mfaSessionToken');
    }
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
    sessionStorage.removeItem('mfaSessionToken');

    this.currentUserSubject.next(null);
    this.currentOrganizationSubject.next(null);
    this.currentUser.set(null);
    this.currentOrganization.set(null);
    this.setMfaRequired(false);
  }

  /**
   * Get stored token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Validate stored token
   */
  private validateToken(_token: string): void {
    // In a real app, you'd validate the token with the server
    const storedUser = localStorage.getItem('user');
    const storedOrganization = localStorage.getItem('organization');

    if (storedUser && storedOrganization) {
      const user = JSON.parse(storedUser);
      const organization = JSON.parse(storedOrganization);

      this.currentUserSubject.next(user);
      this.currentOrganizationSubject.next(organization);
      this.currentUser.set(user);
      this.currentOrganization.set(organization);
    }
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
    this.loading.set(loading);
  }
}