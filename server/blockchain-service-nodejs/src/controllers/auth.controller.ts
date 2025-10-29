import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import User, { UserRole } from '../models/User';
import { JwtUtils } from '../middleware/auth';
import { emailService } from '../services/email.service';
import { totpService } from '../services/totp.service';
import { asyncHandler, formatValidationErrors, AppError } from '../middleware/errorHandler';
import { config } from '../config';
import logger from '../utils/logger';

// Validation rules
export const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters'),
    body('organizationId')
        .optional()
        .isUUID()
        .withMessage('Organization ID must be a valid UUID'),
];

export const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    body('totpToken')
        .optional()
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('TOTP token must be 6 digits'),
];

export const refreshTokenValidation = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required'),
];

export const passwordResetRequestValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
];

export const passwordResetValidation = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

export const passwordChangeValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

export const mfaSetupValidation = [
    body('totpToken')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('TOTP token must be 6 digits'),
];

export const mfaVerifyValidation = [
    body('totpToken')
        .optional()
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('TOTP token must be 6 digits'),
    body('backupCode')
        .optional()
        .matches(/^[A-F0-9]{4}-[A-F0-9]{4}$/)
        .withMessage('Backup code must be in format XXXX-XXXX'),
];

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
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

    const { email, password, firstName, lastName, organizationId } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        organizationId,
        role: UserRole.USER,
        emailVerificationToken,
        emailVerificationExpires,
        isEmailVerified: false,
    });

    // Send verification email
    const verificationUrl = `${config.cors.origins[0]}/auth/verify-email?token=${emailVerificationToken}`;

    try {
        await emailService.sendEmailVerification(email, {
            firstName,
            verificationUrl,
        });
    } catch (error) {
        logger.error('Failed to send verification email:', error);
        // Don't fail registration if email fails
    }

    logger.info('User registered successfully:', {
        userId: user.id,
        email: user.email,
    });

    res.status(201).json({
        success: true,
        data: {
            message: 'Registration successful. Please check your email to verify your account.',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isEmailVerified: user.isEmailVerified,
            },
        },
    });
});

/**
 * Verify email address
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
        throw new AppError('Verification token is required', 400, 'MISSING_TOKEN');
    }

    const user = await User.findByEmailVerificationToken(token);
    if (!user) {
        throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    try {
        await emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
        logger.error('Failed to send welcome email:', error);
    }

    logger.info('Email verified successfully:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'Email verified successfully. You can now log in to your account.',
        },
    });
});

/**
 * User login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
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

    const { email, password, totpToken } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user || !user.isActive) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.isLocked()) {
        throw new AppError('Account is temporarily locked due to too many failed login attempts', 423, 'ACCOUNT_LOCKED');
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
        throw new AppError('Please verify your email address before logging in', 401, 'EMAIL_NOT_VERIFIED');
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
        if (!totpToken) {
            throw new AppError('TOTP token is required', 401, 'MFA_REQUIRED');
        }

        if (!user.mfaSecret) {
            throw new AppError('MFA is not properly configured', 500, 'MFA_NOT_CONFIGURED');
        }

        const mfaResult = totpService.verifyTotpToken(user.mfaSecret, totpToken);
        if (!mfaResult.isValid) {
            await user.incrementLoginAttempts();
            throw new AppError('Invalid TOTP token', 401, 'INVALID_MFA_TOKEN');
        }
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const tokenPayload = {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        permissions: [], // TODO: Implement permissions based on role
    };

    const tokens = await JwtUtils.generateTokenPair(tokenPayload);

    logger.info('User logged in successfully:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organizationId: user.organizationId,
                mfaEnabled: user.mfaEnabled,
                preferences: user.preferences,
            },
            tokens,
        },
    });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
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

    const { refreshToken } = req.body;

    try {
        const tokens = await JwtUtils.rotateRefreshToken(refreshToken);

        res.json({
            success: true,
            data: {
                message: 'Token refreshed successfully',
                tokens,
            },
        });
    } catch (error) {
        throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
});

/**
 * User logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.token;
    const userId = req.user?.id;

    if (token) {
        // Blacklist the current access token
        await JwtUtils.blacklistToken(token);
    }

    if (userId) {
        // Invalidate all refresh tokens for the user
        await JwtUtils.invalidateAllUserTokens(userId);
    }

    logger.info('User logged out successfully:', {
        userId,
    });

    res.json({
        success: true,
        data: {
            message: 'Logout successful',
        },
    });
});

/**
 * Request password reset
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
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

    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user || !user.isActive) {
        // Don't reveal if user exists for security
        res.json({
            success: true,
            data: {
                message: 'If an account with that email exists, a password reset link has been sent.',
            },
        });
        return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email
    const resetUrl = `${config.cors.origins[0]}/auth/reset-password?token=${resetToken}`;

    try {
        await emailService.sendPasswordReset(email, {
            firstName: user.firstName,
            resetUrl,
        });
    } catch (error) {
        logger.error('Failed to send password reset email:', error);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        throw new AppError('Failed to send password reset email', 500, 'EMAIL_SEND_FAILED');
    }

    logger.info('Password reset requested:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'If an account with that email exists, a password reset link has been sent.',
        },
    });
});

/**
 * Reset password with token
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
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

    const { token, password } = req.body;

    const user = await User.findByPasswordResetToken(token);
    if (!user) {
        throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    // Update password
    await user.setPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Invalidate all existing tokens
    await JwtUtils.invalidateAllUserTokens(user.id);

    logger.info('Password reset successfully:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'Password reset successfully. Please log in with your new password.',
        },
    });
});

/**
 * Change password (authenticated user)
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Validate current password
    const isCurrentPasswordValid = await user.validatePassword(currentPassword);
    if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // Update password
    await user.setPassword(newPassword);
    await user.save();

    // Invalidate all existing tokens except current one
    await JwtUtils.invalidateAllUserTokens(user.id);

    logger.info('Password changed successfully:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'Password changed successfully. Please log in again with your new password.',
        },
    });
});

/**
 * Setup MFA (TOTP)
 */
export const setupMfa = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.mfaEnabled) {
        throw new AppError('MFA is already enabled for this account', 400, 'MFA_ALREADY_ENABLED');
    }

    // Generate TOTP setup data
    const setupData = await totpService.generateTotpSetup(user.email, user.getFullName());

    // Store the secret temporarily (not enabled yet)
    user.mfaSecret = setupData.secret;
    await user.save();

    logger.info('MFA setup initiated:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'MFA setup initiated. Please scan the QR code and verify with a TOTP token.',
            qrCodeUrl: setupData.qrCodeUrl,
            manualEntryKey: setupData.manualEntryKey,
            backupCodes: totpService.generatePlainBackupCodes(), // Return plain codes for user to save
        },
    });
});

/**
 * Verify and enable MFA
 */
export const verifyMfa = asyncHandler(async (req: Request, res: Response) => {
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

    const { totpToken } = req.body;
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.mfaEnabled) {
        throw new AppError('MFA is already enabled for this account', 400, 'MFA_ALREADY_ENABLED');
    }

    if (!user.mfaSecret) {
        throw new AppError('MFA setup not initiated. Please start MFA setup first.', 400, 'MFA_NOT_INITIATED');
    }

    // Verify TOTP token
    const mfaResult = totpService.verifyTotpToken(user.mfaSecret, totpToken);
    if (!mfaResult.isValid) {
        throw new AppError('Invalid TOTP token', 400, 'INVALID_MFA_TOKEN');
    }

    // Enable MFA and generate backup codes
    const plainBackupCodes = totpService.generatePlainBackupCodes();
    const hashedBackupCodes = totpService.hashBackupCodes(plainBackupCodes);

    user.mfaEnabled = true;
    user.mfaBackupCodes = hashedBackupCodes;
    await user.save();

    logger.info('MFA enabled successfully:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'MFA enabled successfully. Please save your backup codes in a secure location.',
            backupCodes: plainBackupCodes,
        },
    });
});

/**
 * Disable MFA
 */
export const disableMfa = asyncHandler(async (req: Request, res: Response) => {
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

    const { totpToken, backupCode } = req.body;
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.mfaEnabled) {
        throw new AppError('MFA is not enabled for this account', 400, 'MFA_NOT_ENABLED');
    }

    let isValid = false;

    // Verify either TOTP token or backup code
    if (totpToken && user.mfaSecret) {
        const mfaResult = totpService.verifyTotpToken(user.mfaSecret, totpToken);
        isValid = mfaResult.isValid;
    } else if (backupCode && user.mfaBackupCodes) {
        isValid = totpService.verifyBackupCode(user.mfaBackupCodes, backupCode);
    }

    if (!isValid) {
        throw new AppError('Invalid TOTP token or backup code', 400, 'INVALID_MFA_VERIFICATION');
    }

    // Disable MFA
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = [];
    await user.save();

    logger.info('MFA disabled successfully:', {
        userId: user.id,
        email: user.email,
    });

    res.json({
        success: true,
        data: {
            message: 'MFA disabled successfully.',
        },
    });
});

/**
 * Get MFA status
 */
export const getMfaStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
        success: true,
        data: {
            mfaEnabled: user.mfaEnabled,
            backupCodesCount: user.mfaBackupCodes?.length || 0,
        },
    });
});