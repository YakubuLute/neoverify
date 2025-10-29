import { Router } from 'express';
import {
    getProfile,
    updateProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    getPreferences,
    updateNotificationPreferences,
    updateVerificationPreferences,
    updateGeneralPreferences,
    resetPreferences,
    getSecuritySettings,
    getActiveSessions,
    terminateSession,
    terminateAllOtherSessions,
    getLoginHistory,
    deactivateAccount,
    exportUserData,
    profileUpdateValidation,
    notificationPreferencesValidation,
    verificationPreferencesValidation,
    preferencesValidation,
    deactivateAccountValidation,
    profilePictureUpload,
} from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All profile routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get user profile
 *     description: Retrieves complete user profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Profile]
 *     summary: Update user profile
 *     description: Updates user profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *               language:
 *                 type: string
 *                 example: "en"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
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
 * /api/profile/picture:
 *   post:
 *     tags: [Profile]
 *     summary: Upload profile picture
 *     description: Uploads a new profile picture
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [profilePicture]
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture image file
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
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
 *                         profilePictureUrl:
 *                           type: string
 *                           example: "/uploads/profiles/user123_profile.jpg"
 *       400:
 *         description: Invalid file or validation error
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
 *   delete:
 *     tags: [Profile]
 *     summary: Delete profile picture
 *     description: Removes the current profile picture
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/profile/preferences:
 *   get:
 *     tags: [Profile]
 *     summary: Get user preferences
 *     description: Retrieves all user preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
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
 *                         notifications:
 *                           type: object
 *                           properties:
 *                             email:
 *                               type: boolean
 *                             push:
 *                               type: boolean
 *                             sms:
 *                               type: boolean
 *                             verificationComplete:
 *                               type: boolean
 *                             documentShared:
 *                               type: boolean
 *                         verification:
 *                           type: object
 *                           properties:
 *                             autoVerify:
 *                               type: boolean
 *                             defaultVerificationType:
 *                               type: string
 *                             requireMfa:
 *                               type: boolean
 *                         general:
 *                           type: object
 *                           properties:
 *                             theme:
 *                               type: string
 *                             language:
 *                               type: string
 *                             timezone:
 *                               type: string
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/profile/preferences/notifications:
 *   put:
 *     tags: [Profile]
 *     summary: Update notification preferences
 *     description: Updates user notification preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: boolean
 *                 example: true
 *               push:
 *                 type: boolean
 *                 example: true
 *               sms:
 *                 type: boolean
 *                 example: false
 *               verificationComplete:
 *                 type: boolean
 *                 example: true
 *               documentShared:
 *                 type: boolean
 *                 example: true
 *               securityAlerts:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
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
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/profile/preferences/verification:
 *   put:
 *     tags: [Profile]
 *     summary: Update verification preferences
 *     description: Updates user verification preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoVerify:
 *                 type: boolean
 *                 example: true
 *               defaultVerificationType:
 *                 type: string
 *                 enum: [ai_forensics, blockchain, hybrid]
 *                 example: "hybrid"
 *               requireMfa:
 *                 type: boolean
 *                 example: false
 *               retainResults:
 *                 type: boolean
 *                 example: true
 *               shareResults:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Verification preferences updated successfully
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
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/profile/security:
 *   get:
 *     tags: [Profile]
 *     summary: Get security settings
 *     description: Retrieves user security settings and status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security settings retrieved successfully
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
 *                         mfaEnabled:
 *                           type: boolean
 *                         lastPasswordChange:
 *                           type: string
 *                           format: date-time
 *                         activeSessions:
 *                           type: integer
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *                         loginAttempts:
 *                           type: integer
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/profile/security/sessions:
 *   get:
 *     tags: [Profile]
 *     summary: Get active sessions
 *     description: Retrieves list of active user sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sessionId:
 *                             type: string
 *                           deviceInfo:
 *                             type: string
 *                           ipAddress:
 *                             type: string
 *                           location:
 *                             type: string
 *                           lastActivity:
 *                             type: string
 *                             format: date-time
 *                           isCurrent:
 *                             type: boolean
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/profile/security/sessions/{sessionId}:
 *   delete:
 *     tags: [Profile]
 *     summary: Terminate session
 *     description: Terminates a specific user session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to terminate
 *     responses:
 *       200:
 *         description: Session terminated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Session not found
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
 * /api/profile/security/sessions/terminate-all:
 *   post:
 *     tags: [Profile]
 *     summary: Terminate all other sessions
 *     description: Terminates all user sessions except the current one
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All other sessions terminated successfully
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
 *                         terminatedSessions:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/profile/security/login-history:
 *   get:
 *     tags: [Profile]
 *     summary: Get login history
 *     description: Retrieves user login history
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Login history retrieved successfully
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
 *                         history:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               timestamp:
 *                                 type: string
 *                                 format: date-time
 *                               ipAddress:
 *                                 type: string
 *                               userAgent:
 *                                 type: string
 *                               location:
 *                                 type: string
 *                               success:
 *                                 type: boolean
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/profile/security/export-data:
 *   get:
 *     tags: [Profile]
 *     summary: Export user data
 *     description: Exports all user data for GDPR compliance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Complete user data export
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *               description: Zipped user data export
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Profile information routes
router.get('/', getProfile);
router.put('/', profileUpdateValidation, updateProfile);

// Profile picture routes
router.post('/picture', profilePictureUpload.single('profilePicture'), uploadProfilePicture);
router.delete('/picture', deleteProfilePicture);

// Preferences routes
router.get('/preferences', getPreferences);
router.put('/preferences/notifications', notificationPreferencesValidation, updateNotificationPreferences);
router.put('/preferences/verification', verificationPreferencesValidation, updateVerificationPreferences);
router.put('/preferences/general', preferencesValidation, updateGeneralPreferences);
router.post('/preferences/reset', resetPreferences);

// Security management routes
router.get('/security', getSecuritySettings);
router.get('/security/sessions', getActiveSessions);
router.delete('/security/sessions/:sessionId', terminateSession);
router.post('/security/sessions/terminate-all', terminateAllOtherSessions);
router.get('/security/login-history', getLoginHistory);
router.post('/security/deactivate', deactivateAccountValidation, deactivateAccount);
router.get('/security/export-data', exportUserData);

export default router;