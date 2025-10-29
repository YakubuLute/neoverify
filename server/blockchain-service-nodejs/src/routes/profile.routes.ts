import { Router } from 'express';
import {
    getProfile,
    updateProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    profileUpdateValidation,
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

export default router;