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

// Account deactivation validation rules
export const deactivateAccountValidation = [
    body('confirmPassword')
        .notEmpty()
        .withMessage('Password confirmation is required'),
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
        documentStatusUpdates: true, // Default value
        securityAlerts: true, // Default value
        marketingEmails: false, // Default value
    };

    const verificationPreferences: VerificationPreferences = {
        autoVerifyDocuments: false, // Default value
        requireMfaForSensitiveActions: true, // Default value
        allowThirdPartyIntegrations: false, // Default value
        dataRetentionPeriod: 365, // Default value
        shareAnalyticsData: false, // Default value
        enableAuditLogging: true, // Default value
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
 * Get security settings overview
 */
export const getSecuritySettings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get active sessions count
    const activeSessions = await UserSession.count({
        where: {
            userId,
            isActive: true,
            expiresAt: {
                [Op.gt]: new Date(),
            },
        },
    });

    // Get recent login attempts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentLoginAttempts = await LoginHistory.count({
        where: {
            userId,
            createdAt: {
                [Op.gte]: thirtyDaysAgo,
            },
        },
    });

    // Get failed login attempts (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const failedLoginAttempts = await LoginHistory.count({
        where: {
            userId,
            status: {
                [Op.ne]: LoginStatus.SUCCESS,
            },
            createdAt: {
                [Op.gte]: sevenDaysAgo,
            },
        },
    });

    const securitySettings = {
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.isEmailVerified,
        accountLocked: user.isLocked(),
        activeSessions,
        recentLoginAttempts,
        failedLoginAttempts,
        lastLoginAt: user.lastLoginAt,
        passwordLastChanged: user.updatedAt, // Approximate - would need separate field for exact tracking
        loginAttempts: user.loginAttempts,
        lockUntil: user.lockUntil,
    };

    logger.info('Security settings retrieved:', {
        userId: user.id,
    });

    res.json({
        success: true,
        data: {
            securitySettings,
        },
    });
});

/**
 * Get active sessions
 */
export const getActiveSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const currentSessionToken = req.token;

    const sessions = await UserSession.findAll({
        where: {
            userId,
            isActive: true,
            expiresAt: {
                [Op.gt]: new Date(),
            },
        },
        order: [['lastActivityAt', 'DESC']],
        attributes: {
            exclude: ['sessionToken', 'refreshToken'],
        },
    });

    // Mark current session
    const sessionsWithCurrent = sessions.map(session => ({
        ...session.toJSON(),
        isCurrent: session.sessionToken === currentSessionToken,
    }));

    logger.info('Active sessions retrieved:', {
        userId,
        sessionCount: sessions.length,
    });

    res.json({
        success: true,
        data: {
            sessions: sessionsWithCurrent,
        },
    });
});

/**
 * Terminate a specific session
 */
export const terminateSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const currentSessionToken = req.token;

    const session = await UserSession.findOne({
        where: {
            id: sessionId,
            userId,
            isActive: true,
        },
    });

    if (!session) {
        throw new AppError('Session not found or already terminated', 404, 'SESSION_NOT_FOUND');
    }

    // Prevent terminating current session
    if (session.sessionToken === currentSessionToken) {
        throw new AppError('Cannot terminate current session', 400, 'CANNOT_TERMINATE_CURRENT_SESSION');
    }

    // Deactivate session
    session.deactivate();
    await session.save();

    // Blacklist the session token
    await JwtUtils.blacklistToken(session.sessionToken);

    // Log the session termination
    await LoginHistory.create({
        userId,
        status: LoginStatus.LOGOUT,
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: session.id,
    });

    logger.info('Session terminated:', {
        userId,
        sessionId: session.id,
        terminatedBy: 'user',
    });

    res.json({
        success: true,
        data: {
            message: 'Session terminated successfully',
        },
    });
});

/**
 * Terminate all other sessions (except current)
 */
export const terminateAllOtherSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const currentSessionToken = req.token;

    // Find all active sessions except current
    const sessions = await UserSession.findAll({
        where: {
            userId,
            isActive: true,
            sessionToken: {
                [Op.ne]: currentSessionToken,
            },
        },
    });

    // Deactivate all sessions
    const sessionTokens = sessions.map(session => session.sessionToken);
    await UserSession.update(
        { isActive: false },
        {
            where: {
                userId,
                isActive: true,
                sessionToken: {
                    [Op.ne]: currentSessionToken,
                },
            },
        }
    );

    // Blacklist all session tokens
    for (const token of sessionTokens) {
        await JwtUtils.blacklistToken(token);
    }

    // Log the mass session termination
    await LoginHistory.create({
        userId,
        status: LoginStatus.LOGOUT,
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
    });

    logger.info('All other sessions terminated:', {
        userId,
        terminatedCount: sessions.length,
    });

    res.json({
        success: true,
        data: {
            message: `${sessions.length} sessions terminated successfully`,
            terminatedCount: sessions.length,
        },
    });
});

/**
 * Get login history
 */
export const getLoginHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { count, rows: loginHistory } = await LoginHistory.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        attributes: {
            exclude: ['userId'],
        },
    });

    const totalPages = Math.ceil(count / limit);

    logger.info('Login history retrieved:', {
        userId,
        page,
        limit,
        totalRecords: count,
    });

    res.json({
        success: true,
        data: {
            loginHistory,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords: count,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        },
    });
});

/**
 * Deactivate account
 */
export const deactivateAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { confirmPassword } = req.body;

    if (!confirmPassword) {
        throw new AppError('Password confirmation is required', 400, 'PASSWORD_REQUIRED');
    }

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify password
    const isPasswordValid = await user.validatePassword(confirmPassword);
    if (!isPasswordValid) {
        throw new AppError('Invalid password', 400, 'INVALID_PASSWORD');
    }

    // Deactivate user account
    user.isActive = false;
    await user.save();

    // Terminate all active sessions
    await UserSession.update(
        { isActive: false },
        {
            where: {
                userId,
                isActive: true,
            },
        }
    );

    // Invalidate all tokens
    await JwtUtils.invalidateAllUserTokens(userId);

    logger.info('Account deactivated:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'Account deactivated successfully',
        },
    });
});

/**
 * Export user data (GDPR compliance)
 */
export const exportUserData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findByPk(userId, {
        attributes: {
            exclude: ['password', 'mfaSecret', 'mfaBackupCodes', 'emailVerificationToken', 'passwordResetToken'],
        },
    });

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user sessions
    const sessions = await UserSession.findAll({
        where: { userId },
        attributes: {
            exclude: ['sessionToken', 'refreshToken'],
        },
    });

    // Get login history
    const loginHistory = await LoginHistory.findAll({
        where: { userId },
        attributes: {
            exclude: ['userId'],
        },
    });

    // TODO: Add documents, verifications, and other user data when those models are available

    const exportData = {
        profile: user.toJSON(),
        sessions: sessions.map(session => session.toJSON()),
        loginHistory: loginHistory.map(entry => entry.toJSON()),
        exportedAt: new Date().toISOString(),
    };

    logger.info('User data exported:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'User data exported successfully',
            exportData,
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