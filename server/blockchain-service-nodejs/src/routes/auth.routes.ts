import { Router } from 'express';
import {
    register,
    verifyEmail,
    login,
    refreshToken,
    logout,
    requestPasswordReset,
    resetPassword,
    changePassword,
    setupMfa,
    verifyMfa,
    disableMfa,
    getMfaStatus,
    registerValidation,
    loginValidation,
    refreshTokenValidation,
    passwordResetRequestValidation,
    passwordResetValidation,
    passwordChangeValidation,
    mfaSetupValidation,
    mfaVerifyValidation,
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.post('/register', registerValidation, register);
router.get('/verify-email', verifyEmail);
router.post('/login', loginValidation, login);
router.post('/refresh-token', refreshTokenValidation, refreshToken);
router.post('/password/reset-request', passwordResetRequestValidation, requestPasswordReset);
router.post('/password/reset', passwordResetValidation, resetPassword);

// Protected routes (authentication required)
router.use(authenticateToken);

router.post('/logout', logout);
router.post('/password/change', passwordChangeValidation, changePassword);

// MFA routes
router.get('/mfa/status', getMfaStatus);
router.post('/mfa/setup', setupMfa);
router.post('/mfa/verify', mfaSetupValidation, verifyMfa);
router.post('/mfa/disable', mfaVerifyValidation, disableMfa);

export default router;