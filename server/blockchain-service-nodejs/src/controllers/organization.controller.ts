import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { Organization, User, Document, UserRole, SubscriptionTier } from '../models';
import logger from '../utils/logger';

// Interfaces for request bodies
interface CreateOrganizationRequest {
    name: string;
    domain: string;
    description?: string;
    website?: string;
    industry?: string;
    size?: string;
    country?: string;
    timezone?: string;
    subscriptionTier?: SubscriptionTier;
}

interface UpdateOrganizationRequest {
    name?: string;
    description?: string;
    website?: string;
    industry?: string;
    size?: string;
    country?: string;
    timezone?: string;
}

interface UpdateOrganizationSettingsRequest {
    allowPublicDocuments?: boolean;
    requireEmailVerification?: boolean;
    enableMfaForAllUsers?: boolean;
    maxDocumentSize?: number;
    allowedFileTypes?: string[];
    autoVerifyDocuments?: boolean;
    retentionPeriod?: number;
    passwordPolicy?: {
        minLength?: number;
        requireUppercase?: boolean;
        requireLowercase?: boolean;
        requireNumbers?: boolean;
        requireSpecialChars?: boolean;
        maxAge?: number;
    };
    emailNotifications?: {
        documentUploaded?: boolean;
        verificationCompleted?: boolean;
        userInvited?: boolean;
        weeklyReports?: boolean;
    };
    apiRateLimit?: number;
    webhookUrl?: string;
    webhookSecret?: string;
    logoUrl?: string;
    primaryColor?: string;
    customDomain?: string;
}

// Validation middleware
export const createOrganizationValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Organization name must be between 1 and 100 characters'),
    body('domain')
        .trim()
        .isLength({ min: 1, max: 100 })
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Domain must contain only lowercase letters, numbers, and hyphens'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters'),
    body('website')
        .optional()
        .isURL()
        .withMessage('Website must be a valid URL'),
    body('industry')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Industry must not exceed 100 characters'),
    body('size')
        .optional()
        .isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
        .withMessage('Invalid organization size'),
    body('country')
        .optional()
        .isISO31661Alpha2()
        .withMessage('Country must be a valid ISO 3166-1 alpha-2 code'),
    body('timezone')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Timezone must be a valid timezone identifier'),
    body('subscriptionTier')
        .optional()
        .isIn(Object.values(SubscriptionTier))
        .withMessage('Invalid subscription tier'),
];

export const updateOrganizationValidation = [
    param('id')
        .isUUID()
        .withMessage('Organization ID must be a valid UUID'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Organization name must be between 1 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters'),
    body('website')
        .optional()
        .isURL()
        .withMessage('Website must be a valid URL'),
    body('industry')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Industry must not exceed 100 characters'),
    body('size')
        .optional()
        .isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
        .withMessage('Invalid organization size'),
    body('country')
        .optional()
        .isISO31661Alpha2()
        .withMessage('Country must be a valid ISO 3166-1 alpha-2 code'),
    body('timezone')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Timezone must be a valid timezone identifier'),
];

export const organizationIdValidation = [
    param('id')
        .isUUID()
        .withMessage('Organization ID must be a valid UUID'),
];

// Helper function to check if user has admin access to organization
const checkOrganizationAccess = async (userId: string, organizationId: string, requiredRole: UserRole = UserRole.ADMIN): Promise<boolean> => {
    const user = await User.findByPk(userId);
    if (!user) return false;

    // Check if user belongs to the organization and has required role
    if (user.organizationId !== organizationId) return false;

    // Role hierarchy: ADMIN > MANAGER > USER > VIEWER
    const roleHierarchy = {
        [UserRole.ADMIN]: 4,
        [UserRole.MANAGER]: 3,
        [UserRole.USER]: 2,
        [UserRole.VIEWER]: 1,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};

/**
 * Create a new organization
 */
export const createOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const {
            name,
            domain,
            description,
            website,
            industry,
            size,
            country,
            timezone = 'UTC',
            subscriptionTier = SubscriptionTier.FREE,
        } = req.body as CreateOrganizationRequest;

        // Check if domain is already taken
        const existingOrg = await Organization.findByDomain(domain);
        if (existingOrg) {
            res.status(409).json({
                success: false,
                error: {
                    code: 'DOMAIN_ALREADY_EXISTS',
                    message: 'An organization with this domain already exists',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user is already part of an organization
        const user = await User.findByPk(userId);
        if (user?.organizationId) {
            res.status(409).json({
                success: false,
                error: {
                    code: 'USER_ALREADY_IN_ORGANIZATION',
                    message: 'User is already part of an organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Create organization
        const organization = await Organization.create({
            name,
            domain,
            description,
            website,
            industry,
            size,
            country,
            timezone,
            subscriptionTier,
            settings: Organization.getDefaultSettings(),
            billingInfo: Organization.getDefaultBillingInfo(user!.email),
            usageStats: Organization.getDefaultUsageStats(),
            isActive: true,
            trialEndsAt: subscriptionTier === SubscriptionTier.FREE ?
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days trial
                undefined,
        });

        // Update user to be admin of the new organization
        await user!.update({
            organizationId: organization.id,
            role: UserRole.ADMIN,
        });

        logger.info('Organization created successfully', {
            organizationId: organization.id,
            userId,
            domain,
        });

        res.status(201).json({
            success: true,
            data: {
                organization: organization.toJSON(),
            },
        });
    } catch (error) {
        logger.error('Error creating organization:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while creating the organization',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Get organization details
 */
export const getOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid organization ID',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.VIEWER);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const organization = await Organization.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'users',
                    attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
                },
            ],
        });

        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_NOT_FOUND',
                    message: 'Organization not found',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        res.json({
            success: true,
            data: {
                organization: organization.toJSON(),
            },
        });
    } catch (error) {
        logger.error('Error fetching organization:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while fetching the organization',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};/*
*
 * Update organization details
 */
export const updateOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has admin access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.ADMIN);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to update this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const organization = await Organization.findByPk(id);
        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_NOT_FOUND',
                    message: 'Organization not found',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const updateData = req.body as UpdateOrganizationRequest;
        await organization.update(updateData);

        logger.info('Organization updated successfully', {
            organizationId: id,
            userId,
            updatedFields: Object.keys(updateData),
        });

        res.json({
            success: true,
            data: {
                organization: organization.toJSON(),
            },
        });
    } catch (error) {
        logger.error('Error updating organization:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while updating the organization',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Get organization settings
 */
export const getOrganizationSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid organization ID',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has manager access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.MANAGER);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to organization settings',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const organization = await Organization.findByPk(id);
        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_NOT_FOUND',
                    message: 'Organization not found',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        res.json({
            success: true,
            data: {
                settings: organization.settings,
                subscriptionTier: organization.subscriptionTier,
                usageStats: organization.usageStats,
                subscriptionLimits: organization.getSubscriptionLimits(),
            },
        });
    } catch (error) {
        logger.error('Error fetching organization settings:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while fetching organization settings',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Update organization settings
 */
export const updateOrganizationSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has admin access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.ADMIN);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to update organization settings',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const organization = await Organization.findByPk(id);
        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_NOT_FOUND',
                    message: 'Organization not found',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const settingsUpdate = req.body as UpdateOrganizationSettingsRequest;

        // Merge with existing settings
        const updatedSettings = {
            ...organization.settings,
            ...settingsUpdate,
        };

        // If password policy is being updated, merge with existing policy
        if (settingsUpdate.passwordPolicy) {
            updatedSettings.passwordPolicy = {
                ...organization.settings.passwordPolicy,
                ...settingsUpdate.passwordPolicy,
            };
        }

        // If email notifications are being updated, merge with existing notifications
        if (settingsUpdate.emailNotifications) {
            updatedSettings.emailNotifications = {
                ...organization.settings.emailNotifications,
                ...settingsUpdate.emailNotifications,
            };
        }

        await organization.update({ settings: updatedSettings });

        logger.info('Organization settings updated successfully', {
            organizationId: id,
            userId,
            updatedFields: Object.keys(settingsUpdate),
        });

        res.json({
            success: true,
            data: {
                settings: organization.settings,
            },
        });
    } catch (error) {
        logger.error('Error updating organization settings:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while updating organization settings',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Deactivate organization
 */
export const deactivateOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid organization ID',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has admin access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.ADMIN);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to deactivate this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const organization = await Organization.findByPk(id);
        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_NOT_FOUND',
                    message: 'Organization not found',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Deactivate organization and all its users
        await organization.update({ isActive: false });

        // Deactivate all users in the organization
        await User.update(
            { isActive: false },
            { where: { organizationId: id } }
        );

        logger.info('Organization deactivated successfully', {
            organizationId: id,
            userId,
        });

        res.json({
            success: true,
            data: {
                message: 'Organization deactivated successfully',
            },
        });
    } catch (error) {
        logger.error('Error deactivating organization:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while deactivating the organization',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Get organization analytics and usage statistics
 */
export const getOrganizationAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid organization ID',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has manager access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.MANAGER);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to organization analytics',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const organization = await Organization.findByPk(id);
        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_NOT_FOUND',
                    message: 'Organization not found',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Get additional analytics data
        const [totalUsers, activeUsers, totalDocuments, recentDocuments] = await Promise.all([
            User.count({ where: { organizationId: id } }),
            User.count({
                where: {
                    organizationId: id,
                    isActive: true,
                    lastLoginAt: {
                        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                }
            }),
            Document.count({ where: { organizationId: id } }),
            Document.count({
                where: {
                    organizationId: id,
                    createdAt: {
                        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                }
            }),
        ]);

        const analytics = {
            usageStats: organization.usageStats,
            subscriptionLimits: organization.getSubscriptionLimits(),
            subscriptionTier: organization.subscriptionTier,
            totalUsers,
            activeUsers,
            totalDocuments,
            recentDocuments,
            storageUsagePercentage: organization.getSubscriptionLimits().maxStorage > 0 ?
                (organization.usageStats.storageUsed / organization.getSubscriptionLimits().maxStorage) * 100 : 0,
            documentLimitPercentage: organization.getSubscriptionLimits().maxDocuments > 0 ?
                (organization.usageStats.documentsUploaded / organization.getSubscriptionLimits().maxDocuments) * 100 : 0,
            verificationLimitPercentage: organization.getSubscriptionLimits().maxVerifications > 0 ?
                (organization.usageStats.verificationsPerformed / organization.getSubscriptionLimits().maxVerifications) * 100 : 0,
        };

        res.json({
            success: true,
            data: {
                analytics,
            },
        });
    } catch (error) {
        logger.error('Error fetching organization analytics:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while fetching organization analytics',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};// Im
port additional models for user invitation functionality
import { UserInvitation, InvitationStatus } from '../models';
import crypto from 'crypto';

// Additional interfaces for user invitation
interface InviteUserRequest {
    email: string;
    role: UserRole;
    message?: string;
}

interface UpdateUserRoleRequest {
    role: UserRole;
}

// Additional validation middleware
export const inviteUserValidation = [
    param('id')
        .isUUID()
        .withMessage('Organization ID must be a valid UUID'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('role')
        .isIn(Object.values(UserRole))
        .withMessage('Invalid user role'),
    body('message')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Message must not exceed 500 characters'),
];

export const updateUserRoleValidation = [
    param('id')
        .isUUID()
        .withMessage('Organization ID must be a valid UUID'),
    param('userId')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
    body('role')
        .isIn(Object.values(UserRole))
        .withMessage('Invalid user role'),
];

export const userIdValidation = [
    param('id')
        .isUUID()
        .withMessage('Organization ID must be a valid UUID'),
    param('userId')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
];

/**
 * Get organization users with their roles
 */
export const getOrganizationUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid organization ID',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has manager access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.MANAGER);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to view organization users',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const users = await User.findAll({
            where: { organizationId: id },
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
            order: [['createdAt', 'ASC']],
        });

        // Get pending invitations
        const pendingInvitations = await UserInvitation.findAll({
            where: {
                organizationId: id,
                status: InvitationStatus.PENDING,
                expiresAt: {
                    [Op.gt]: new Date(),
                },
            },
            include: [
                {
                    model: User,
                    as: 'inviter',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json({
            success: true,
            data: {
                users: users.map(user => user.toJSON()),
                pendingInvitations: pendingInvitations.map(invitation => invitation.toJSON()),
            },
        });
    } catch (error) {
        logger.error('Error fetching organization users:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while fetching organization users',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Invite a user to the organization
 */
export const inviteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has admin access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.ADMIN);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to invite users to this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { email, role, message } = req.body as InviteUserRequest;

        // Check if organization exists
        const organization = await Organization.findByPk(id);
        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_NOT_FOUND',
                    message: 'Organization not found',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user is already a member of the organization
        const existingUser = await User.findOne({
            where: { email, organizationId: id },
        });

        if (existingUser) {
            res.status(409).json({
                success: false,
                error: {
                    code: 'USER_ALREADY_MEMBER',
                    message: 'User is already a member of this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if there's already a pending invitation
        const existingInvitation = await UserInvitation.findPendingByEmail(email, id);
        if (existingInvitation) {
            res.status(409).json({
                success: false,
                error: {
                    code: 'INVITATION_ALREADY_PENDING',
                    message: 'There is already a pending invitation for this email',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check subscription limits
        const userCount = await User.count({ where: { organizationId: id } });
        const limits = organization.getSubscriptionLimits();
        if (limits.maxUsers > 0 && userCount >= limits.maxUsers) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'USER_LIMIT_EXCEEDED',
                    message: 'Organization has reached its user limit for the current subscription tier',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create invitation
        const invitation = await UserInvitation.create({
            organizationId: id,
            invitedBy: userId,
            email,
            role,
            token,
            expiresAt,
            message,
        });

        // TODO: Send invitation email (implement email service)
        // await emailService.sendInvitationEmail(email, organization.name, token, message);

        logger.info('User invitation created successfully', {
            invitationId: invitation.id,
            organizationId: id,
            invitedBy: userId,
            email,
            role,
        });

        res.status(201).json({
            success: true,
            data: {
                invitation: invitation.toJSON(),
                message: 'Invitation sent successfully',
            },
        });
    } catch (error) {
        logger.error('Error inviting user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while inviting the user',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Update user role in organization
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id, userId: targetUserId } = req.params;
        const currentUserId = req.user?.id;

        if (!currentUserId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if current user has admin access to this organization
        const hasAccess = await checkOrganizationAccess(currentUserId, id, UserRole.ADMIN);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to update user roles in this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Prevent users from changing their own role
        if (currentUserId === targetUserId) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'CANNOT_CHANGE_OWN_ROLE',
                    message: 'You cannot change your own role',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { role } = req.body as UpdateUserRoleRequest;

        // Find the target user
        const targetUser = await User.findOne({
            where: { id: targetUserId, organizationId: id },
        });

        if (!targetUser) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found in this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Update user role
        await targetUser.update({ role });

        logger.info('User role updated successfully', {
            organizationId: id,
            targetUserId,
            updatedBy: currentUserId,
            newRole: role,
            previousRole: targetUser.role,
        });

        res.json({
            success: true,
            data: {
                user: targetUser.toJSON(),
                message: 'User role updated successfully',
            },
        });
    } catch (error) {
        logger.error('Error updating user role:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while updating user role',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Remove user from organization
 */
export const removeUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { id, userId: targetUserId } = req.params;
        const currentUserId = req.user?.id;

        if (!currentUserId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if current user has admin access to this organization
        const hasAccess = await checkOrganizationAccess(currentUserId, id, UserRole.ADMIN);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to remove users from this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Prevent users from removing themselves
        if (currentUserId === targetUserId) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'CANNOT_REMOVE_SELF',
                    message: 'You cannot remove yourself from the organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Find the target user
        const targetUser = await User.findOne({
            where: { id: targetUserId, organizationId: id },
        });

        if (!targetUser) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found in this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Remove user from organization (set organizationId to null and deactivate)
        await targetUser.update({
            organizationId: null,
            role: UserRole.USER,
            isActive: false,
        });

        logger.info('User removed from organization successfully', {
            organizationId: id,
            targetUserId,
            removedBy: currentUserId,
        });

        res.json({
            success: true,
            data: {
                message: 'User removed from organization successfully',
            },
        });
    } catch (error) {
        logger.error('Error removing user from organization:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while removing user from organization',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Cancel user invitation
 */
export const cancelInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, invitationId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user has admin access to this organization
        const hasAccess = await checkOrganizationAccess(userId, id, UserRole.ADMIN);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to cancel invitations for this organization',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const invitation = await UserInvitation.findOne({
            where: { id: invitationId, organizationId: id },
        });

        if (!invitation) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'INVITATION_NOT_FOUND',
                    message: 'Invitation not found',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        await invitation.cancel();

        logger.info('Invitation cancelled successfully', {
            invitationId,
            organizationId: id,
            cancelledBy: userId,
        });

        res.json({
            success: true,
            data: {
                message: 'Invitation cancelled successfully',
            },
        });
    } catch (error) {
        logger.error('Error cancelling invitation:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while cancelling invitation',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};