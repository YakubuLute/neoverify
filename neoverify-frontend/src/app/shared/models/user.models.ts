import { z } from 'zod';
import { UserRole, User } from './auth.models';

// Re-export User for external use
export { User, UserRole };

// User preferences interface (unique to user.models.ts)
export interface UserPreferences {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    verificationAlerts: boolean;
    weeklyReports: boolean;
    language: string;
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
}

// Extended user interface with preferences (unique to user.models.ts)
export interface UserWithPreferences extends User {
    preferences: UserPreferences;
}

// User update interface (unique to user.models.ts)
export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    preferences?: Partial<UserPreferences>;
    profilePicture?: string;
}

// Register request interface (unique to user.models.ts)
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    organizationDomain?: string;
}

// Password reset request interface (unique to user.models.ts)
export interface PasswordResetRequest {
    email: string;
}

// Password reset confirm interface (unique to user.models.ts)
export interface PasswordResetConfirmRequest {
    token: string;
    newPassword: string;
}

// Change password request interface (unique to user.models.ts)
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

// MFA setup request interface (unique to user.models.ts)
export interface MfaSetupRequest {
    secret: string;
    code: string;
}

// MFA verify request interface (unique to user.models.ts)
export interface MfaVerifyRequest {
    code: string;
}

// Email verification request interface (unique to user.models.ts)
export interface EmailVerificationRequest {
    token: string;
}

// Token response interface (unique to user.models.ts)
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// Refresh token request interface (unique to user.models.ts)
export interface RefreshTokenRequest {
    refreshToken: string;
}

// User profile response interface (unique to user.models.ts)
export interface UserProfileResponse {
    user: UserWithPreferences;
    organization?: any;
    permissions: string[];
}

// Zod Schemas for Runtime Validation
export const UserPreferencesSchema = z.object({
    emailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    verificationAlerts: z.boolean(),
    weeklyReports: z.boolean(),
    language: z.string(),
    timezone: z.string(),
    theme: z.enum(['light', 'dark', 'auto'])
});

export const UpdateUserRequestSchema = z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    preferences: UserPreferencesSchema.partial().optional(),
    profilePicture: z.string().url().optional()
});

export const RegisterRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    organizationName: z.string().min(1).max(100).optional(),
    organizationDomain: z.string().min(1).max(100).optional()
});

export const TokenResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number()
});

export const UserProfileResponseSchema = z.object({
    user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        role: z.nativeEnum(UserRole),
        organizationId: z.string(),
        organizationName: z.string().optional(),
        avatar: z.string().optional(),
        mfaEnabled: z.boolean(),
        emailVerified: z.boolean(),
        lastLoginAt: z.string().datetime().optional(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        preferences: UserPreferencesSchema
    }),
    organization: z.any().optional(),
    permissions: z.array(z.string())
});// Ad
ditional auth - related types
export interface CreateUserRequest {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: UserRole;
    organizationId?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface AuthResponse {
    token: string;
    refreshToken?: string;
    user: User;
    expiresAt: Date;
}