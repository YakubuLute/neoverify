import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Op } from 'sequelize';
import User, { UserPreferences } from '../models/User';
import UserSession from '../models/UserSession';
import LoginHistory, { LoginStatus } from '../models/LoginHistory';
import { asyncHandler, formatValidationErrors, AppError } from '../middleware/errorHandler';
import { JwtUtils } from '../middleware/auth';
import logger from '../utils/logger';
import { config } from '../config';

// Notification preferences interface
export interface NotificationPreferences {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    verificationAlerts: boolean;
    weeklyReports: boolean;
    documentStatusUpdates: boolean;
    securityAlerts: boolean;
    marketingEmails: boolean;
}

// Verification preferences interface
export interface VerificationPreferences {
    autoVerifyDocuments: boolean;
    requireMfaForSensitiveActions: boolean;
    allowThirdPartyIntegrations: boolean;
    dataRetentionPeriod: number; // in days
    shareAnalyticsData: boolean;
    enableAuditLogging: boolean;
}

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

// Notification preferences validation rules
export const notificationPreferencesValidation = [
    body('emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('Email notifications must be a boolean'),
    body('smsNotifications')
        .optional()
        .isBoolean()
        .withMessage('SMS notifications must be a boolean'),
    body('pushNotifications')
        .optional()
        .isBoolean()
        .withMessage('Push notifications must be a boolean'),
    body('verificationAlerts')
        .optional()
        .isBoolean()
        .withMessage('Verification alerts must be a boolean'),
    body('weeklyReports')
        .optional()
        .isBoolean()
        .withMessage('Weekly reports must be a boolean'),
    body('documentStatusUpdates')
        .optional()
        .isBoolean()
        .withMessage('Document status updates must be a boolean'),
    body('securityAlerts')
        .optional()
        .isBoolean()
        .withMessage('Security alerts must be a boolean'),
    body('marketingEmails')
        .optional()
        .isBoolean()
        .withMessage('Marketing emails must be a boolean'),
];

// Verification preferences validation rules
export const verificationPreferencesValidation = [
    body('autoVerifyDocuments')
        .optional()
        .isBoolean()
        .withMessage('Auto verify documents must be a boolean'),
    body('requireMfaForSensitiveActions')
        .optional()
        .isBoolean()
        .withMessage('Require MFA for sensitive actions must be a boolean'),
    body('allowThirdPartyIntegrations')
        .optional()
        .isBoolean()
        .withMessage('Allow third party integrations must be a boolean'),
    body('dataRetentionPeriod')
        .optional()
        .isInt({ min: 30, max: 2555 }) // 30 days to 7 years
        .withMessage('Data retention period must be between 30 and 2555 days'),
    body('shareAnalyticsData')
        .optional()
        .isBoolean()
        .withMessage('Share analytics data must be a boolean'),
    body('enableAuditLogging')
        .optional()
        .isBoolean()
        .withMessage('Enable audit logging must be a boolean'),
];

// General preferences validation rules
export const preferencesValidation = [
    body('language')
        .optional()
        .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'])
        .withMessage('Language must be a supported language code'),
    body('timezone')
        .optional()
        .isString()
        .withMessage('Timezone must be a valid timezone string'),
    body('theme')
        .optional()
        .isIn(['light', 'dark', 'auto'])
        .withMessage('Theme must be light, dark, or auto'),
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
 * Get user preferences (notification, verification, and general)
 */
export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Extract preferences from user model
    const preferences = user.preferences || getDefaultPreferences();

    // Separate different types of preferences
    const notificationPreferences: NotificationPreferences = {
        emailNotifications: preferences.emailNotifications,
        smsNotifications: preferences.smsNotifications,
        pushNotifications: preferences.pushNotifications,
        verificationAlerts: preferences.verificationAlerts,
        weeklyReports: preferences.weeklyReports,
        documentStatusUpdates: preferences.documentStatusUpdates || true,
        securityAlerts: preferences.securityAlerts || true,
        marketingEmails: preferences.marketingEmails || false,
    };

    const verificationPreferences: VerificationPreferences = {
        autoVerifyDocuments: preferences.autoVerifyDocuments || false,
        requireMfaForSensitiveActions: preferences.requireMfaForSensitiveActions || true,
        allowThirdPartyIntegrations: preferences.allowThirdPartyIntegrations || false,
        dataRetentionPeriod: preferences.dataRetentionPeriod || 365,
        shareAnalyticsData: preferences.shareAnalyticsData || false,
        enableAuditLogging: preferences.enableAuditLogging || true,
    };

    const generalPreferences = {
        language: preferences.language,
        timezone: preferences.timezone,
        theme: preferences.theme,
    };

    logger.info('Preferences retrieved:', {
        userId: user.id,
    });

    res.json({
        success: true,
        data: {
            notificationPreferences,
            verificationPreferences,
            generalPreferences,
        },
    });
});

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
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
    const notificationUpdates = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Update notification preferences
    const currentPreferences = user.preferences || getDefaultPreferences();
    const updatedPreferences = {
        ...currentPreferences,
        ...notificationUpdates,
    };

    user.preferences = updatedPreferences;
    await user.save();

    logger.info('Notification preferences updated:', {
        userId: user.id,
        updatedFields: Object.keys(notificationUpdates),
    });

    res.json({
        success: true,
        data: {
            message: 'Notification preferences updated successfully',
            notificationPreferences: {
                emailNotifications: updatedPreferences.emailNotifications,
                smsNotifications: updatedPreferences.smsNotifications,
                pushNotifications: updatedPreferences.pushNotifications,
                verificationAlerts: updatedPreferences.verificationAlerts,
                weeklyReports: updatedPreferences.weeklyReports,
                documentStatusUpdates: updatedPreferences.documentStatusUpdates,
                securityAlerts: updatedPreferences.securityAlerts,
                marketingEmails: updatedPreferences.marketingEmails,
            },
        },
    });
});

/**
 * Update verification preferences
 */
export const updateVerificationPreferences = asyncHandler(async (req: Request, res: Response) => {
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
    const verificationUpdates = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Update verification preferences
    const currentPreferences = user.preferences || getDefaultPreferences();
    const updatedPreferences = {
        ...currentPreferences,
        ...verificationUpdates,
    };

    user.preferences = updatedPreferences;
    await user.save();

    logger.info('Verification preferences updated:', {
        userId: user.id,
        updatedFields: Object.keys(verificationUpdates),
    });

    res.json({
        success: true,
        data: {
            message: 'Verification preferences updated successfully',
            verificationPreferences: {
                autoVerifyDocuments: updatedPreferences.autoVerifyDocuments,
                requireMfaForSensitiveActions: updatedPreferences.requireMfaForSensitiveActions,
                allowThirdPartyIntegrations: updatedPreferences.allowThirdPartyIntegrations,
                dataRetentionPeriod: updatedPreferences.dataRetentionPeriod,
                shareAnalyticsData: updatedPreferences.shareAnalyticsData,
                enableAuditLogging: updatedPreferences.enableAuditLogging,
            },
        },
    });
});

/**
 * Update general preferences (language, timezone, theme)
 */
export const updateGeneralPreferences = asyncHandler(async (req: Request, res: Response) => {
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
    const generalUpdates = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Update general preferences
    const currentPreferences = user.preferences || getDefaultPreferences();
    const updatedPreferences = {
        ...currentPreferences,
        ...generalUpdates,
    };

    user.preferences = updatedPreferences;
    await user.save();

    logger.info('General preferences updated:', {
        userId: user.id,
        updatedFields: Object.keys(generalUpdates),
    });

    res.json({
        success: true,
        data: {
            message: 'General preferences updated successfully',
            generalPreferences: {
                language: updatedPreferences.language,
                timezone: updatedPreferences.timezone,
                theme: updatedPreferences.theme,
            },
        },
    });
});

/**
 * Reset preferences to default values
 */
export const resetPreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Reset to default preferences
    user.preferences = getDefaultPreferences();
    await user.save();

    logger.info('Preferences reset to defaults:', {
        userId: user.id,
    });

    res.json({
        success: true,
        data: {
            message: 'Preferences reset to default values successfully',
            preferences: user.preferences,
        },
    });
});

/**
 * Get default preferences
 */
function getDefaultPreferences(): UserPreferences & NotificationPreferences & VerificationPreferences {
    return {
        // General preferences
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        verificationAlerts: true,
        weeklyReports: false,
        language: 'en',
        timezone: 'UTC',
        theme: 'light',

        // Extended notification preferences
        documentStatusUpdates: true,
        securityAlerts: true,
        marketingEmails: false,

        // Verification preferences
        autoVerifyDocuments: false,
        requireMfaForSensitiveActions: true,
        allowThirdPartyIntegrations: false,
        dataRetentionPeriod: 365,
        shareAnalyticsData: false,
        enableAuditLogging: true,
    };
}

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