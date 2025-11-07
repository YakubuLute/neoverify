import { z } from 'zod';
import {
    User,
    CreateUserRequest,
    UpdateUserRequest,
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    TokenResponse,
    UserProfileResponse,
    PasswordResetRequest,
    PasswordResetConfirmRequest,
    ChangePasswordRequest,
    MfaSetupRequest,
    MfaVerifyRequest,
    EmailVerificationRequest,
    RefreshTokenRequest
} from '../../shared/models/user.models';
import {
    Document,
    DocumentFilters,
    DocumentListResponse,
    DocumentVerificationRequest,
    DocumentVerificationJob,
    DocumentShareRequest,
    DocumentShareResponse,
    DocumentStatistics,
    DocumentUpdateRequest
} from '../../shared/models/document.models';
import {
    Organization,
    CreateOrganizationRequest,
    UpdateOrganizationRequest,
    OrganizationMember,
    OrganizationInvitation,
    InviteUserRequest,
    OrganizationStatistics,
    UpdateSubscriptionRequest
} from '../../shared/models/organization.models';
import { PaginatedResponse } from '../../shared/models/common.models';

// API Endpoint definitions with request/response types
export interface ApiEndpoints {
    // Authentication endpoints
    'POST /auth/login': {
        request: LoginRequest;
        response: AuthResponse;
    };
    'POST /auth/register': {
        request: RegisterRequest;
        response: AuthResponse;
    };
    'POST /auth/refresh': {
        request: RefreshTokenRequest;
        response: TokenResponse;
    };
    'POST /auth/logout': {
        request: void;
        response: { message: string };
    };
    'POST /auth/forgot-password': {
        request: PasswordResetRequest;
        response: { message: string };
    };
    'POST /auth/reset-password': {
        request: PasswordResetConfirmRequest;
        response: { message: string };
    };
    'POST /auth/change-password': {
        request: ChangePasswordRequest;
        response: { message: string };
    };
    'POST /auth/verify-email': {
        request: EmailVerificationRequest;
        response: { message: string };
    };
    'POST /auth/resend-verification': {
        request: { email: string };
        response: { message: string };
    };

    // MFA endpoints
    'POST /auth/mfa/setup': {
        request: void;
        response: { secret: string; qrCode: string; backupCodes: string[] };
    };
    'POST /auth/mfa/verify-setup': {
        request: MfaSetupRequest;
        response: { message: string; backupCodes: string[] };
    };
    'POST /auth/mfa/verify': {
        request: MfaVerifyRequest;
        response: AuthResponse;
    };
    'POST /auth/mfa/disable': {
        request: { password: string };
        response: { message: string };
    };
    'POST /auth/mfa/regenerate-backup-codes': {
        request: void;
        response: { backupCodes: string[] };
    };

    // User profile endpoints
    'GET /profile': {
        request: void;
        response: UserProfileResponse;
    };
    'PUT /profile': {
        request: UpdateUserRequest;
        response: User;
    };
    'POST /profile/upload-avatar': {
        request: FormData;
        response: { profilePicture: string };
    };
    'DELETE /profile/avatar': {
        request: void;
        response: { message: string };
    };

    // User management endpoints
    'GET /users': {
        request: { page?: number; limit?: number; search?: string; role?: string };
        response: PaginatedResponse<User>;
    };
    'GET /users/:id': {
        request: void;
        response: User;
    };
    'POST /users': {
        request: CreateUserRequest;
        response: User;
    };
    'PUT /users/:id': {
        request: UpdateUserRequest;
        response: User;
    };
    'DELETE /users/:id': {
        request: void;
        response: { message: string };
    };
    'POST /users/:id/activate': {
        request: void;
        response: { message: string };
    };
    'POST /users/:id/deactivate': {
        request: void;
        response: { message: string };
    };

    // Document endpoints
    'GET /documents': {
        request: DocumentFilters & { page?: number; limit?: number };
        response: DocumentListResponse;
    };
    'GET /documents/:id': {
        request: void;
        response: Document;
    };
    'POST /documents/upload': {
        request: FormData;
        response: Document;
    };
    'PUT /documents/:id': {
        request: DocumentUpdateRequest;
        response: Document;
    };
    'DELETE /documents/:id': {
        request: void;
        response: { message: string };
    };
    'GET /documents/:id/download': {
        request: { shareToken?: string };
        response: Blob;
    };
    'GET /documents/:id/preview': {
        request: { shareToken?: string };
        response: Blob;
    };

    // Document verification endpoints
    'POST /documents/:id/verify': {
        request: Omit<DocumentVerificationRequest, 'documentId'>;
        response: DocumentVerificationJob;
    };
    'GET /documents/:id/verification': {
        request: void;
        response: DocumentVerificationJob;
    };
    'GET /documents/:id/verification-status': {
        request: void;
        response: { status: string; progress: number };
    };
    'POST /documents/:id/cancel-verification': {
        request: void;
        response: { message: string };
    };

    // Document sharing endpoints
    'POST /documents/:id/share': {
        request: Omit<DocumentShareRequest, 'documentId'>;
        response: DocumentShareResponse;
    };
    'GET /documents/:id/share-info': {
        request: void;
        response: DocumentShareResponse;
    };
    'DELETE /documents/:id/share': {
        request: void;
        response: { message: string };
    };
    'GET /shared/:token': {
        request: void;
        response: Document;
    };

    // Document statistics endpoints
    'GET /documents/statistics': {
        request: { period?: 'day' | 'week' | 'month' | 'year' };
        response: DocumentStatistics;
    };

    // Organization endpoints
    'GET /organizations': {
        request: { page?: number; limit?: number; search?: string };
        response: PaginatedResponse<Organization>;
    };
    'GET /organizations/:id': {
        request: void;
        response: Organization;
    };
    'POST /organizations': {
        request: CreateOrganizationRequest;
        response: Organization;
    };
    'PUT /organizations/:id': {
        request: UpdateOrganizationRequest;
        response: Organization;
    };
    'DELETE /organizations/:id': {
        request: void;
        response: { message: string };
    };

    // Organization membership endpoints
    'GET /organizations/:id/members': {
        request: { page?: number; limit?: number; role?: string };
        response: PaginatedResponse<OrganizationMember>;
    };
    'POST /organizations/:id/invite': {
        request: InviteUserRequest;
        response: OrganizationInvitation;
    };
    'GET /organizations/:id/invitations': {
        request: { page?: number; limit?: number };
        response: PaginatedResponse<OrganizationInvitation>;
    };
    'POST /organizations/:id/invitations/:invitationId/resend': {
        request: void;
        response: { message: string };
    };
    'DELETE /organizations/:id/invitations/:invitationId': {
        request: void;
        response: { message: string };
    };
    'POST /organizations/:id/members/:userId/role': {
        request: { role: string };
        response: { message: string };
    };
    'DELETE /organizations/:id/members/:userId': {
        request: void;
        response: { message: string };
    };

    // Organization subscription endpoints
    'GET /organizations/:id/subscription': {
        request: void;
        response: { tier: string; limits: any; usage: any };
    };
    'PUT /organizations/:id/subscription': {
        request: UpdateSubscriptionRequest;
        response: { message: string };
    };
    'POST /organizations/:id/subscription/cancel': {
        request: void;
        response: { message: string };
    };

    // Organization statistics endpoints
    'GET /organizations/:id/statistics': {
        request: { period?: 'day' | 'week' | 'month' | 'year' };
        response: OrganizationStatistics;
    };

    // Invitation acceptance endpoints
    'GET /invitations/:token': {
        request: void;
        response: OrganizationInvitation;
    };
    'POST /invitations/:token/accept': {
        request: { password?: string };
        response: AuthResponse;
    };
    'POST /invitations/:token/decline': {
        request: void;
        response: { message: string };
    };

    // System endpoints
    'GET /health': {
        request: void;
        response: { status: string; timestamp: string };
    };
    'GET /version': {
        request: void;
        response: { version: string; build: string };
    };
}

// Extract endpoint paths
export type ApiEndpointPath = keyof ApiEndpoints;

// Extract HTTP methods
export type HttpMethod = ApiEndpointPath extends `${infer Method} ${string}` ? Method : never;

// Extract endpoint path without method
export type EndpointPath<T extends ApiEndpointPath> = T extends `${string} ${infer Path}` ? Path : never;

// Extract request type for endpoint
export type ApiRequest<T extends ApiEndpointPath> = ApiEndpoints[T]['request'];

// Extract response type for endpoint
export type ApiResponse<T extends ApiEndpointPath> = ApiEndpoints[T]['response'];

// Type-safe endpoint caller interface
export interface TypedApiClient {
    get<T extends ApiEndpointPath & `GET ${string}`>(
        endpoint: EndpointPath<T>,
        params?: ApiRequest<T>
    ): Promise<ApiResponse<T>>;

    post<T extends ApiEndpointPath & `POST ${string}`>(
        endpoint: EndpointPath<T>,
        data?: ApiRequest<T>
    ): Promise<ApiResponse<T>>;

    put<T extends ApiEndpointPath & `PUT ${string}`>(
        endpoint: EndpointPath<T>,
        data?: ApiRequest<T>
    ): Promise<ApiResponse<T>>;

    delete<T extends ApiEndpointPath & `DELETE ${string}`>(
        endpoint: EndpointPath<T>
    ): Promise<ApiResponse<T>>;

    patch<T extends ApiEndpointPath & `PATCH ${string}`>(
        endpoint: EndpointPath<T>,
        data?: ApiRequest<T>
    ): Promise<ApiResponse<T>>;
}

// Utility type to validate endpoint definitions
export type ValidateEndpoint<T extends ApiEndpointPath> = {
    method: T extends `${infer M} ${string}` ? M : never;
    path: EndpointPath<T>;
    request: ApiRequest<T>;
    response: ApiResponse<T>;
};

// Runtime validation schemas for common response types
export const HealthResponseSchema = z.object({
    status: z.string(),
    timestamp: z.string()
});

export const MessageResponseSchema = z.object({
    message: z.string()
});

export const VersionResponseSchema = z.object({
    version: z.string(),
    build: z.string()
});