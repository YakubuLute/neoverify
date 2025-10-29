import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import logger from '../utils/logger';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export interface EmailVerificationData {
    firstName: string;
    verificationUrl: string;
}

export interface PasswordResetData {
    firstName: string;
    resetUrl: string;
}

export class EmailService {
    private transporter: Transporter;

    constructor() {
        this.transporter = this.createTransporter();
    }

    private createTransporter(): Transporter {
        if (config.email.service === 'smtp' && config.email.host) {
            return nodemailer.createTransporter({
                host: config.email.host,
                port: config.email.port || 587,
                secure: config.email.port === 465,
                auth: config.email.user && config.email.password ? {
                    user: config.email.user,
                    pass: config.email.password,
                } : undefined,
            });
        }

        // Fallback to console logging for development
        return nodemailer.createTransporter({
            streamTransport: true,
            newline: 'unix',
            buffer: true,
        });
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
            const mailOptions = {
                from: config.email.from || 'noreply@neoverify.com',
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            };

            const result = await this.transporter.sendMail(mailOptions);

            if (config.env === 'development') {
                logger.info('Email sent (development mode):', {
                    to: options.to,
                    subject: options.subject,
                    messageId: result.messageId,
                });

                // Log email content in development
                if (result.message) {
                    logger.debug('Email content:', result.message.toString());
                }
            } else {
                logger.info('Email sent successfully:', {
                    to: options.to,
                    subject: options.subject,
                    messageId: result.messageId,
                });
            }
        } catch (error) {
            logger.error('Failed to send email:', {
                error: error instanceof Error ? error.message : error,
                to: options.to,
                subject: options.subject,
            });
            throw new Error('Failed to send email');
        }
    }

    async sendEmailVerification(email: string, data: EmailVerificationData): Promise<void> {
        const subject = 'Verify Your NeoVerify Account';
        const html = this.generateEmailVerificationTemplate(data);
        const text = `Hi ${data.firstName},\n\nPlease verify your email address by clicking the following link:\n${data.verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe NeoVerify Team`;

        await this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    async sendPasswordReset(email: string, data: PasswordResetData): Promise<void> {
        const subject = 'Reset Your NeoVerify Password';
        const html = this.generatePasswordResetTemplate(data);
        const text = `Hi ${data.firstName},\n\nYou requested to reset your password. Click the following link to reset it:\n${data.resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe NeoVerify Team`;

        await this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
        const subject = 'Welcome to NeoVerify!';
        const html = this.generateWelcomeTemplate(firstName);
        const text = `Hi ${firstName},\n\nWelcome to NeoVerify! Your account has been successfully verified.\n\nYou can now start uploading and verifying your documents with our advanced AI-powered verification system.\n\nBest regards,\nThe NeoVerify Team`;

        await this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    private generateEmailVerificationTemplate(data: EmailVerificationData): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>NeoVerify</h1>
        </div>
        <div class="content">
            <h2>Hi ${data.firstName},</h2>
            <p>Thank you for signing up for NeoVerify! Please verify your email address to complete your account setup.</p>
            <p>Click the button below to verify your email:</p>
            <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${data.verificationUrl}">${data.verificationUrl}</a></p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with NeoVerify, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2024 NeoVerify. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    private generatePasswordResetTemplate(data: PasswordResetData): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>NeoVerify</h1>
        </div>
        <div class="content">
            <h2>Hi ${data.firstName},</h2>
            <p>You requested to reset your password for your NeoVerify account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${data.resetUrl}">${data.resetUrl}</a></p>
            <div class="warning">
                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            </div>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>© 2024 NeoVerify. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    private generateWelcomeTemplate(firstName: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to NeoVerify</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .feature { background: #f0f9ff; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to NeoVerify!</h1>
        </div>
        <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Congratulations! Your NeoVerify account has been successfully verified and is now ready to use.</p>
            <p>With NeoVerify, you can:</p>
            <div class="feature">
                <strong>🔍 AI-Powered Verification:</strong> Upload documents and get instant AI-powered authenticity verification.
            </div>
            <div class="feature">
                <strong>🔒 Blockchain Security:</strong> Your documents are secured with blockchain technology for immutable proof.
            </div>
            <div class="feature">
                <strong>📊 Comprehensive Reports:</strong> Get detailed verification reports with confidence scores.
            </div>
            <div class="feature">
                <strong>👥 Team Collaboration:</strong> Invite team members and manage document verification workflows.
            </div>
            <p>Ready to get started? Log in to your account and upload your first document!</p>
            <p>If you have any questions, our support team is here to help.</p>
        </div>
        <div class="footer">
            <p>© 2024 NeoVerify. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    }
}

// Export singleton instance
export const emailService = new EmailService();