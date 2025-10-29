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