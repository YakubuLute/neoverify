import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import User from '../models/User';
import { asyncHandler, formatValidationErrors, AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { config } from '../config';

// Profile update validation rules
export const profileUpdateValidation = [
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
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
];

// Profile picture upload configuration
const profilePictureStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error as Error, '');
        }
    },
    filename: (req, file, cb) => {
        const userId = req.user?.id;
        const ext = path.extname(file.originalname);
        const filename = `${userId}-${Date.now()}${ext}`;
        cb(null, filename);
    },
});

const profilePictureFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
};

export const profilePictureUpload = multer({
    storage: profilePictureStorage,
    fileFilter: profilePictureFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1,
    },
});

/**
 * Get user profile information
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findByPk(userId, {
        attributes: {
            exclude: ['password', 'mfaSecret', 'mfaBackupCodes', 'emailVerificationToken', 'passwordResetToken']
        }
    });

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Calculate profile completion percentage
    const profileCompletion = calculateProfileCompletion(user);

    logger.info('Profile retrieved:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            user: user.toJSON(),
            profileCompletion,
        },
    });
});

/**
 * Update user profile information
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = formatValidationErrors(errors.array());
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: formattedErrors,
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }

    const userId = req.user!.id;
    const { firstName, lastName, email } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
            throw new AppError('Email address is already in use', 409, 'EMAIL_EXISTS');
        }

        // If email is changed, mark as unverified and send verification email
        user.email = email;
        user.isEmailVerified = false;
        // TODO: Send email verification (implement in future task)
    }

    // Update other fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    await user.save();

    // Calculate updated profile completion
    const profileCompletion = calculateProfileCompletion(user);

    logger.info('Profile updated:', {
        userId: user.id,
        email: user.email,
        updatedFields: Object.keys(req.body),
    });

    res.json({
        success: true,
        data: {
            message: 'Profile updated successfully',
            user: user.toJSON(),
            profileCompletion,
        },
    });
});

/**
 * Upload profile picture
 */
export const uploadProfilePicture = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
        throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
    }

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
        try {
            const oldPicturePath = path.join(process.cwd(), 'uploads', 'profile-pictures', path.basename(user.profilePicture));
            await fs.unlink(oldPicturePath);
        } catch (error) {
            logger.warn('Failed to delete old profile picture:', error);
        }
    }

    // Update user with new profile picture path
    const relativePath = path.join('profile-pictures', file.filename);
    user.profilePicture = relativePath;
    await user.save();

    logger.info('Profile picture uploaded:', {
        userId: user.id,
        filename: file.filename,
    });

    res.json({
        success: true,
        data: {
            message: 'Profile picture uploaded successfully',
            profilePicture: relativePath,
            profilePictureUrl: `${config.server.baseUrl}/uploads/${relativePath}`,
        },
    });
});

/**
 * Delete profile picture
 */
export const deleteProfilePicture = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.profilePicture) {
        throw new AppError('No profile picture to delete', 400, 'NO_PROFILE_PICTURE');
    }

    // Delete file from filesystem
    try {
        const picturePath = path.join(process.cwd(), 'uploads', 'profile-pictures', path.basename(user.profilePicture));
        await fs.unlink(picturePath);
    } catch (error) {
        logger.warn('Failed to delete profile picture file:', error);
    }

    // Remove from user record
    user.profilePicture = undefined;
    await user.save();

    logger.info('Profile picture deleted:', {
        userId: user.id,
    });

    res.json({
        success: true,
        data: {
            message: 'Profile picture deleted successfully',
        },
    });
});

/**
 * Calculate profile completion percentage
 */
function calculateProfileCompletion(user: User): { percentage: number; missingFields: string[] } {
    const requiredFields = [
        { field: 'firstName', value: user.firstName },
        { field: 'lastName', value: user.lastName },
        { field: 'email', value: user.email },
        { field: 'isEmailVerified', value: user.isEmailVerified },
        { field: 'profilePicture', value: user.profilePicture },
    ];

    const completedFields = requiredFields.filter(field => {
        if (field.field === 'isEmailVerified') {
            return field.value === true;
        }
        return field.value && field.value.toString().trim().length > 0;
    });

    const missingFields = requiredFields
        .filter(field => {
            if (field.field === 'isEmailVerified') {
                return field.value !== true;
            }
            return !field.value || field.value.toString().trim().length === 0;
        })
        .map(field => field.field);

    const percentage = Math.round((completedFields.length / requiredFields.length) * 100);

    return {
        percentage,
        missingFields,
    };
}