export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  avatar?: string;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  ORG_ADMIN = 'org_admin',
  ISSUER = 'issuer',
  VERIFIER = 'verifier',
  AUDITOR = 'auditor'
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isActive: boolean;
  plan: BillingPlan;
  createdAt: Date;
  updatedAt: Date;
}

export enum BillingPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export interface SignUpRequest {
  organizationName: string;
  domain: string;
  adminName: string;
  adminEmail: string;
  password: string;
  confirmPassword: string;
  recaptchaToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  recaptchaToken?: string;
}

export interface MfaVerificationRequest {
  email: string;
  totpCode: string;
  sessionToken: string;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  token: string;
  refreshToken: string;
  requiresMfa?: boolean;
  sessionToken?: string;
}

export interface InviteUserRequest {
  email: string;
  name: string;
  role: UserRole;
  message?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiScope[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export enum ApiScope {
  ISSUE_DOCUMENTS = 'documents:issue',
  VERIFY_DOCUMENTS = 'documents:verify',
  READ_DOCUMENTS = 'documents:read',
  MANAGE_USERS = 'users:manage',
  READ_ANALYTICS = 'analytics:read'
}