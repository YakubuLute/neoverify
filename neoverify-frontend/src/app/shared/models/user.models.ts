import { z } from 'zod';

// User role enumeration
export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    USER = 'user',
    VIEWER = 'viewer',
}

// User preferences interface
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

// User interface
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isEmailVerified: boolean;
    mfaEnabled: boolean;
    lastLoginAt?: Date;
    organizationId?: string;
    role: UserRole;
    preferences: UserPreferences;
    profilePicture?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// User creation interface
export interface CreateUserRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationId?: string;
    role?: UserRole;
}

// User update interface
export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    preferences?: Partial<UserPreferences>;
    profilePicture?: string;
}

// Login request interface
export interface LoginRequest {
    email: string;
    password: string;
    mfaCode?: string;
    rememberMe?: boolean;
}

// Register request interface
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    organizationDomain?: string;
}

// Password reset request interface
export interface PasswordResetRequest {
    email: string;
}

// Password reset confirm interface
export interface PasswordResetConfirmRequest {
    token: string;
    newPassword: string;
}

// Change password request interface
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

// MFA setup request interface
export interface MfaSetupRequest {
    secret: string;
    code: string;
}

// MFA verify request interface
export interface MfaVerifyRequest {
    code: string;
}

// Email verification request interface
export interface EmailVerificationRequest {
    token: string;
}

// Authentication response interface
export interface AuthResponse {
    user: User;
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
    organization?: any; // Will be defined in organization.models.ts
}

// Token response interface
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// Refresh token request interface
export interface RefreshTokenRequest {
    refreshToken: string;
}

// User profile response interface
export interface UserProfileResponse {
    user: User;
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

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    isEmailVerified: z.boolean(),
    mfaEnabled: z.boolean(),
    lastLoginAt: z.string().datetime().optional(),
    organizationId: z.string().uuid().optional(),
    role: z.nativeEnum(UserRole),
    preferences: UserPreferencesSchema,
    profilePicture: z.string().url().optional(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
});

export const CreateUserRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    organizationId: z.string().uuid().optional(),
    role: z.nativeEnum(UserRole).optional()
});

export const UpdateUserRequestSchema = z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    preferences: UserPreferencesSchema.partial().optional(),
    profilePicture: z.string().url().optional()
});

export const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    mfaCode: z.string().length(6).optional(),
    rememberMe: z.boolean().optional()
});

export const RegisterRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    organizationName: z.string().min(1).max(100).optional(),
    organizationDomain: z.string().min(1).max(100).optional()
});

export const AuthResponseSchema = z.object({
    user: UserSchema,
    tokens: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresIn: z.number()
    }),
    organization: z.any().optional()
});

export const TokenResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number()
});

export const UserProfileResponseSchema = z.object({
    user: UserSchema,
    organization: z.any().optional(),
    permissions: z.array(z.string())
});