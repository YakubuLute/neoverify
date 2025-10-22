import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  // Reactive state
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));
  readonly loading$ = this.loadingSubject.asObservable();

  // Signals for modern reactive patterns
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly loading = signal<boolean>(false);

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
   * Login with email and password
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.setLoading(true);
    
    return this.apiService.post<AuthResponse>('auth/login', credentials).pipe(
      map(response => response.data),
      tap(authData => {
        this.setAuthData(authData);
        this.notificationService.success('Login successful!');
        this.router.navigate(['/dashboard']);
      }),
      catchError(error => {
        this.notificationService.error('Login failed. Please check your credentials.');
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
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Set authentication data
   */
  private setAuthData(authData: AuthResponse): void {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('user', JSON.stringify(authData.user));
    
    this.currentUserSubject.next(authData.user);
    this.currentUser.set(authData.user);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    this.currentUserSubject.next(null);
    this.currentUser.set(null);
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
  private validateToken(token: string): void {
    // In a real app, you'd validate the token with the server
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUserSubject.next(user);
      this.currentUser.set(user);
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