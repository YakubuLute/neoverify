import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { UserInvitation, User, Organization, UserRole } from '../models';
import logger from '../utils/logger';

// Interfaces for request bodies
interface AcceptInvitationRequest {
    token: string;
    firstName?: string;
    lastName?: string;
    password?: string;
}

// Validation middleware
export const acceptInvitationValidation = [
    body('token')
        .isLength({ min: 1 })
        .withMessage('Invitation token is required'),
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters'),
    body('password')
        .optional()
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters'),
];

export const invitationTokenValidation = [
    param('token')
        .isLength({ min: 1 })
        .withMessage('Invitation token is required'),
];

/**
 * Get invitation details by token
 */
export const getInvitationDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid invitation token',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { token } = req.params;

        const invitation = await UserInvitation.findByToken(token);
        if (!invitation) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'INVITATION_NOT_FOUND',
                    message: 'Invitation not found or has expired',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Get organization details
        const organization = await Organization.findByPk(invitation.organizationId, {
            attributes: ['id', 'name', 'domain', 'description', 'website'],
        });

        // Get inviter details
        const inviter = await User.findByPk(invitation.invitedBy, {
            attributes: ['id', 'firstName', 'lastName', 'email'],
        });

        res.json({
            success: true,
            data: {
                invitation: {
                    id: invitation.id,
                    email: invitation.email,
                    role: invitation.role,
                    message: invitation.message,
                    expiresAt: invitation.expiresAt,
                    createdAt: invitation.createdAt,
                },
                organization: organization?.toJSON(),
                inviter: inviter?.toJSON(),
            },
        });
    } catch (error) {
        logger.error('Error fetching invitation details:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while fetching invitation details',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Accept invitation and join organization
 */
export const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
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

        const { token, firstName, lastName, password } = req.body as AcceptInvitationRequest;

        const invitation = await UserInvitation.findByToken(token);
        if (!invitation) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'INVITATION_NOT_FOUND',
                    message: 'Invitation not found or has expired',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        if (!invitation.canBeAccepted()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVITATION_CANNOT_BE_ACCEPTED',
                    message: 'Invitation cannot be accepted (expired or already processed)',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        // Check if user already exists
        let user = await User.findByEmail(invitation.email);

        if (user) {
            // User exists - check if they're already in an organization
            if (user.organizationId) {
                res.status(409).json({
                    success: false,
                    error: {
                        code: 'USER_ALREADY_IN_ORGANIZATION',
                        message: 'User is already a member of an organization',
                        timestamp: new Date().toISOString(),
                        requestId: req.headers['x-request-id'] || 'unknown',
                    },
                });
                return;
            }

            // Update existing user to join organization
            await user.update({
                organizationId: invitation.organizationId,
                role: invitation.role,
                isActive: true,
            });
        } else {
            // User doesn't exist - create new user
            if (!firstName || !lastName || !password) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_USER_DATA',
                        message: 'First name, last name, and password are required for new users',
                        timestamp: new Date().toISOString(),
                        requestId: req.headers['x-request-id'] || 'unknown',
                    },
                });
                return;
            }

            user = await User.create({
                email: invitation.email,
                firstName,
                lastName,
                password,
                organizationId: invitation.organizationId,
                role: invitation.role,
                isEmailVerified: true, // Auto-verify email for invited users
                isActive: true,
            });
        }

        // Accept the invitation
        await invitation.accept();

        // Update organization user count
        const organization = await Organization.findByPk(invitation.organizationId);
        if (organization) {
            organization.usageStats.activeUsers = await User.count({
                where: { organizationId: invitation.organizationId, isActive: true },
            });
            await organization.save();
        }

        logger.info('Invitation accepted successfully', {
            invitationId: invitation.id,
            userId: user.id,
            organizationId: invitation.organizationId,
            email: invitation.email,
        });

        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                organization: organization?.toJSON(),
                message: 'Invitation accepted successfully',
            },
        });
    } catch (error) {
        logger.error('Error accepting invitation:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while accepting invitation',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};

/**
 * Decline invitation
 */
export const declineInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid invitation token',
                    details: errors.array(),
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        const { token } = req.params;

        const invitation = await UserInvitation.findByToken(token);
        if (!invitation) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'INVITATION_NOT_FOUND',
                    message: 'Invitation not found or has expired',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] || 'unknown',
                },
            });
            return;
        }

        await invitation.decline();

        logger.info('Invitation declined', {
            invitationId: invitation.id,
            organizationId: invitation.organizationId,
            email: invitation.email,
        });

        res.json({
            success: true,
            data: {
                message: 'Invitation declined successfully',
            },
        });
    } catch (error) {
        logger.error('Error declining invitation:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred while declining invitation',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown',
            },
        });
    }
};