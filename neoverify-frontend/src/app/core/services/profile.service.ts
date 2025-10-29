import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, delay } from 'rxjs/operators';
import { User } from '../../shared/models/auth.models';
import {
    VerificationPreferences,
    VerificationPreferencesUpdateRequest,
    VerificationPreferencesResponse,
    VerificationTemplate,
    OrganizationPolicy,
    VerificationLevel,
    DigestFrequency,
    RecipientType
} from '../../shared/models/verification-preferences.models';

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

    /**
     * Get user verification preferences
     */
    getVerificationPreferences(): Observable<VerificationPreferencesResponse> {
        // Mock API call - replace with actual endpoint
        const mockPreferences: VerificationPreferences = {
            defaultVerificationLevel: VerificationLevel.STANDARD,
            autoShare: {
                enabled: false,
                recipients: [],
                includeDetails: true,
                shareOnCompletion: true,
                shareOnFailure: false
            },
            retention: {
                documents: 365,
                reports: 730,
                autoDelete: false,
                notifyBeforeDelete: true,
                deleteWarningDays: 7
            },
            notifications: {
                onCompletion: true,
                onFailure: true,
                onExpiration: true,
                onStatusChange: false,
                digestEnabled: false,
                digestFrequency: DigestFrequency.WEEKLY
            },
            templates: {
                defaultTemplate: null,
                autoApplyTemplate: false,
                templatePreferences: [
                    {
                        documentType: 'degree',
                        templateId: '2',
                        autoApply: true
                    },
                    {
                        documentType: 'certificate',
                        templateId: '1',
                        autoApply: false
                    }
                ]
            }
        };

        return of({
            success: true,
            message: 'Verification preferences retrieved successfully',
            preferences: mockPreferences,
            organizationPolicies: []
        }).pipe(delay(800));
    }

    /**
     * Update user verification preferences
     */
    updateVerificationPreferences(preferences: VerificationPreferencesUpdateRequest): Observable<VerificationPreferencesResponse> {
        // Mock API call - replace with actual endpoint
        return of({
            success: true,
            message: 'Verification preferences updated successfully'
        }).pipe(
            delay(1200),
            catchError(error => throwError(() => ({
                success: false,
                message: error.message || 'Failed to update verification preferences'
            })))
        );
    }

    /**
     * Get available verification templates
     */
    getVerificationTemplates(): Observable<VerificationTemplate[]> {
        // Mock API call - replace with actual endpoint
        const mockTemplates: VerificationTemplate[] = [
            {
                id: '1',
                name: 'Standard Document Template',
                description: 'Default template for standard document verification',
                documentTypes: ['certificate', 'license'],
                verificationLevel: VerificationLevel.STANDARD,
                isDefault: true,
                isActive: true,
                organizationId: '1',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: '2',
                name: 'Academic Credentials Template',
                description: 'Specialized template for academic documents',
                documentTypes: ['degree', 'transcript'],
                verificationLevel: VerificationLevel.COMPREHENSIVE,
                isDefault: false,
                isActive: true,
                organizationId: '1',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: '3',
                name: 'Identity Document Template',
                description: 'Template for identity document verification',
                documentTypes: ['id_document'],
                verificationLevel: VerificationLevel.COMPREHENSIVE,
                isDefault: false,
                isActive: true,
                organizationId: '1',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        return of(mockTemplates).pipe(delay(600));
    }

    /**
     * Get organization policies that affect verification preferences
     */
    getOrganizationPolicies(): Observable<OrganizationPolicy[]> {
        // Mock API call - replace with actual endpoint
        const mockPolicies: OrganizationPolicy[] = [
            // Uncomment to test policy restrictions
            // {
            //     id: '1',
            //     name: 'Minimum Verification Level',
            //     description: 'All documents must use at least Standard verification level',
            //     type: PolicyType.VERIFICATION_LEVEL,
            //     value: VerificationLevel.STANDARD,
            //     isRestricted: true,
            //     overridesUserPreference: true
            // }
        ];

        return of(mockPolicies).pipe(delay(400));
    }
}