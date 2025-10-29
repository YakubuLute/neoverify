import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import logger from '../utils/logger';

export interface TotpSetupData {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
    manualEntryKey: string;
}

export interface TotpVerificationResult {
    isValid: boolean;
    window?: number;
}

export class TotpService {
    private readonly serviceName = 'NeoVerify';
    private readonly issuer = 'NeoVerify';

    /**
     * Generate TOTP secret and setup data for a user
     */
    async generateTotpSetup(userEmail: string, userName: string): Promise<TotpSetupData> {
        try {
            // Generate secret
            const secret = speakeasy.generateSecret({
                name: `${this.serviceName} (${userEmail})`,
                issuer: this.issuer,
                length: 32,
            });

            if (!secret.base32) {
                throw new Error('Failed to generate TOTP secret');
            }

            // Generate QR code URL
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

            // Generate backup codes
            const backupCodes = this.generateBackupCodes();

            return {
                secret: secret.base32,
                qrCodeUrl,
                backupCodes,
                manualEntryKey: secret.base32,
            };
        } catch (error) {
            logger.error('Failed to generate TOTP setup:', {
                error: error instanceof Error ? error.message : error,
                userEmail,
            });
            throw new Error('Failed to generate TOTP setup');
        }
    }

    /**
     * Verify TOTP token
     */
    verifyTotpToken(secret: string, token: string, window = 2): TotpVerificationResult {
        try {
            const verified = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token,
                window, // Allow some time drift
            });

            return {
                isValid: verified,
                window: verified ? window : undefined,
            };
        } catch (error) {
            logger.warn('TOTP verification failed:', {
                error: error instanceof Error ? error.message : error,
            });
            return { isValid: false };
        }
    }

    /**
     * Verify backup code
     */
    verifyBackupCode(backupCodes: string[], providedCode: string): boolean {
        try {
            // Hash the provided code to compare with stored hashed codes
            const hashedProvidedCode = this.hashBackupCode(providedCode);
            return backupCodes.includes(hashedProvidedCode);
        } catch (error) {
            logger.warn('Backup code verification failed:', {
                error: error instanceof Error ? error.message : error,
            });
            return false;
        }
    }

    /**
     * Remove used backup code from the list
     */
    removeUsedBackupCode(backupCodes: string[], usedCode: string): string[] {
        const hashedUsedCode = this.hashBackupCode(usedCode);
        return backupCodes.filter(code => code !== hashedUsedCode);
    }

    /**
     * Generate new backup codes
     */
    generateBackupCodes(count = 10): string[] {
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
            // Generate 8-character alphanumeric code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
            codes.push(this.hashBackupCode(formattedCode));
        }

        return codes;
    }

    /**
     * Get plain text backup codes for display (only during generation)
     */
    generatePlainBackupCodes(count = 10): string[] {
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
            codes.push(formattedCode);
        }

        return codes;
    }

    /**
     * Hash backup codes for secure storage
     */
    hashBackupCodes(plainCodes: string[]): string[] {
        return plainCodes.map(code => this.hashBackupCode(code));
    }

    /**
     * Generate current TOTP token (for testing purposes)
     */
    generateCurrentToken(secret: string): string {
        return speakeasy.totp({
            secret,
            encoding: 'base32',
        });
    }

    /**
     * Validate TOTP secret format
     */
    isValidSecret(secret: string): boolean {
        try {
            // Check if it's a valid base32 string by using speakeasy's built-in validation
            speakeasy.totp({
                secret,
                encoding: 'base32',
            });
            return secret.length >= 16; // At least 16 characters for base32
        } catch (error) {
            return false;
        }
    }

    /**
     * Hash a single backup code
     */
    private hashBackupCode(code: string): string {
        return crypto.createHash('sha256').update(code).digest('hex');
    }
}

// Export singleton instance
export const totpService = new TotpService();