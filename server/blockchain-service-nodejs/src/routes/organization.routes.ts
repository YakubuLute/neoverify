import { Router } from 'express';
import {
    createOrganization,
    getOrganization,
    updateOrganization,
    getOrganizationSettings,
    updateOrganizationSettings,
    deactivateOrganization,
    getOrganizationAnalytics,
    getOrganizationUsers,
    inviteUser,
    updateUserRole,
    removeUser,
    cancelInvitation,
    createOrganizationValidation,
    updateOrganizationValidation,
    organizationIdValidation,
    inviteUserValidation,
    updateUserRoleValidation,
    userIdValidation,
} from '../controllers/organization.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All organization routes require authentication
router.use(authenticateToken);

// Organization management routes
router.post('/', createOrganizationValidation, createOrganization);
router.get('/:id', organizationIdValidation, getOrganization);
router.put('/:id', updateOrganizationValidation, updateOrganization);
router.delete('/:id', organizationIdValidation, deactivateOrganization);

// Organization settings routes
router.get('/:id/settings', organizationIdValidation, getOrganizationSettings);
router.put('/:id/settings', organizationIdValidation, updateOrganizationSettings);

// Organization analytics routes
router.get('/:id/analytics', organizationIdValidation, getOrganizationAnalytics);

// User management routes
router.get('/:id/users', organizationIdValidation, getOrganizationUsers);
router.post('/:id/users/invite', inviteUserValidation, inviteUser);
router.put('/:id/users/:userId/role', updateUserRoleValidation, updateUserRole);
router.delete('/:id/users/:userId', userIdValidation, removeUser);

// Invitation management routes
router.delete('/:id/invitations/:invitationId', organizationIdValidation, cancelInvitation);

export default router;