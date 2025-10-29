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
    profileUpdateValidation,
    notificationPreferencesValidation,
    verificationPreferencesValidation,
    preferencesValidation,
    profilePictureUpload,
} from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

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

export default router;