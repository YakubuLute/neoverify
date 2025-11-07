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

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create organization
 *     description: Creates a new organization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, domain]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: "Acme Corporation"
 *               domain:
 *                 type: string
 *                 example: "acme.com"
 *               description:
 *                 type: string
 *                 example: "Leading technology company"
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowedFileTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["pdf", "docx", "jpg"]
 *                   maxFileSize:
 *                     type: integer
 *                     example: 10485760
 *                   requireMfa:
 *                     type: boolean
 *                     example: true
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Validation error or organization already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization
 *     description: Retrieves organization details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Organization'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Organizations]
 *     summary: Update organization
 *     description: Updates organization information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: "Acme Corporation Updated"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               domain:
 *                 type: string
 *                 example: "acme-corp.com"
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Organizations]
 *     summary: Deactivate organization
 *     description: Deactivates an organization (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/organizations/{id}/settings:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization settings
 *     description: Retrieves organization settings and configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         allowedFileTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["pdf", "docx", "jpg"]
 *                         maxFileSize:
 *                           type: integer
 *                           example: 10485760
 *                         requireMfa:
 *                           type: boolean
 *                           example: true
 *                         verificationSettings:
 *                           type: object
 *                           properties:
 *                             autoVerify:
 *                               type: boolean
 *                             defaultType:
 *                               type: string
 *                         billingSettings:
 *                           type: object
 *                           properties:
 *                             subscriptionTier:
 *                               type: string
 *                             billingCycle:
 *                               type: string
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Organizations]
 *     summary: Update organization settings
 *     description: Updates organization settings and configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allowedFileTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["pdf", "docx", "jpg", "png"]
 *               maxFileSize:
 *                 type: integer
 *                 example: 20971520
 *               requireMfa:
 *                 type: boolean
 *                 example: true
 *               verificationSettings:
 *                 type: object
 *                 properties:
 *                   autoVerify:
 *                     type: boolean
 *                   defaultType:
 *                     type: string
 *     responses:
 *       200:
 *         description: Organization settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/organizations/{id}/users:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization users
 *     description: Retrieves list of users in the organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, user, viewer]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: Organization users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/User'
 *                               - type: object
 *                                 properties:
 *                                   organizationRole:
 *                                     type: string
 *                                     enum: [admin, user, viewer]
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/organizations/{id}/users/invite:
 *   post:
 *     tags: [Organizations]
 *     summary: Invite user to organization
 *     description: Sends an invitation to join the organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "newuser@example.com"
 *               role:
 *                 type: string
 *                 enum: [admin, user, viewer]
 *                 example: "user"
 *               message:
 *                 type: string
 *                 example: "Welcome to our organization!"
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         invitationId:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/organizations/{id}/users/{userId}/role:
 *   put:
 *     tags: [Organizations]
 *     summary: Update user role
 *     description: Updates a user's role within the organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, user, viewer]
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/organizations/{id}/users/{userId}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Remove user from organization
 *     description: Removes a user from the organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/organizations/{id}/analytics:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization analytics
 *     description: Retrieves analytics and metrics for the organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for analytics period
 *     responses:
 *       200:
 *         description: Organization analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         totalDocuments:
 *                           type: integer
 *                         totalVerifications:
 *                           type: integer
 *                         storageUsed:
 *                           type: integer
 *                         verificationStats:
 *                           type: object
 *                           properties:
 *                             successful:
 *                               type: integer
 *                             failed:
 *                               type: integer
 *                             pending:
 *                               type: integer
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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