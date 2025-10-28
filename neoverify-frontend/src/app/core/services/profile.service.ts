import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, delay } from 'rxjs/operators';
import { User } from '../../shared/models/auth.models';

export interface ProfileUpdateRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
}

export interface ProfileUpdateResponse {
    success: boolean;
    message: string;
    user?: User;
}

@Injectable({
    providedIn: 'root'
})
export class ProfileService {
    private readonly http = inject(HttpClient);
    private readonly profileUpdateSubject = new BehaviorSubject<boolean>(false);

    readonly isUpdating$ = this.profileUpdateSubject.asObservable();

    /**
     * Update user profile information
     */
    updateProfile(profileData: ProfileUpdateRequest): Observable<ProfileUpdateResponse> {
        this.profileUpdateSubject.next(true);

        // Mock API call - replace with actual endpoint
        return of({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: '1',
                name: `${profileData.firstName} ${profileData.lastName}`,
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                email: profileData.email,
                phone: profileData.phone,
                role: 'org_admin' as any,
                organizationId: '1',
                organizationName: 'Test Organization',
                mfaEnabled: false,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            } as User
        }).pipe(
            delay(1000), // Simulate network delay
            tap(() => this.profileUpdateSubject.next(false)),
            catchError(error => {
                this.profileUpdateSubject.next(false);
                return throwError(() => ({
                    success: false,
                    message: error.message || 'Failed to update profile'
                }));
            })
        );
    }

    /**
     * Validate email availability
     */
    validateEmailAvailability(email: string, currentEmail: string): Observable<{ available: boolean; message?: string }> {
        // Skip validation if email hasn't changed
        if (email === currentEmail) {
            return of({ available: true });
        }

        // Mock API call - replace with actual endpoint
        return of({ available: true }).pipe(
            delay(500),
            catchError(() => of({
                available: false,
                message: 'Email is already in use'
            }))
        );
    }

    /**
     * Validate phone number format and availability
     */
    validatePhoneNumber(phone: string): Observable<{ valid: boolean; message?: string }> {
        if (!phone) {
            return of({ valid: true });
        }

        // Mock validation - replace with actual endpoint
        const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
        const isValid = phoneRegex.test(phone.replace(/\s/g, ''));

        return of({
            valid: isValid,
            message: isValid ? undefined : 'Please enter a valid phone number'
        }).pipe(delay(300));
    }
}