/// <reference types="jest" />

import { User, Organization, UserRole, SubscriptionTier } from '../index';

// Simple unit tests for model methods without database
describe('Database Models Unit Tests', () => {
    describe('User Model', () => {
        it('should have correct default values', () => {
            expect(UserRole.USER).toBe('user');
            expect(UserRole.ADMIN).toBe('admin');
            expect(UserRole.MANAGER).toBe('manager');
            expect(UserRole.VIEWER).toBe('viewer');
        });

        it('should create user instance with proper methods', () => {
            // Test that the User class has the expected methods
            expect(typeof User.findByEmail).toBe('function');
            expect(typeof User.findByEmailVerificationToken).toBe('function');
            expect(typeof User.findByPasswordResetToken).toBe('function');
        });
    });

    describe('Organization Model', () => {
        it('should have correct subscription tiers', () => {
            expect(SubscriptionTier.FREE).toBe('free');
            expect(SubscriptionTier.BASIC).toBe('basic');
            expect(SubscriptionTier.PROFESSIONAL).toBe('professional');
            expect(SubscriptionTier.ENTERPRISE).toBe('enterprise');
        });

        it('should have default settings method', () => {
            const defaultSettings = Organization.getDefaultSettings();

            expect(defaultSettings).toBeDefined();
            expect(defaultSettings.allowPublicDocuments).toBe(false);
            expect(defaultSettings.requireEmailVerification).toBe(true);
            expect(defaultSettings.maxDocumentSize).toBe(50 * 1024 * 1024); // 50MB
            expect(Array.isArray(defaultSettings.allowedFileTypes)).toBe(true);
            expect(defaultSettings.passwordPolicy).toBeDefined();
            expect(defaultSettings.emailNotifications).toBeDefined();
        });

        it('should have default billing info method', () => {
            const email = 'test@example.com';
            const billingInfo = Organization.getDefaultBillingInfo(email);

            expect(billingInfo).toBeDefined();
            expect(billingInfo.billingEmail).toBe(email);
            expect(billingInfo.subscriptionStatus).toBe('active');
        });

        it('should have default usage stats method', () => {
            const usageStats = Organization.getDefaultUsageStats();

            expect(usageStats).toBeDefined();
            expect(usageStats.documentsUploaded).toBe(0);
            expect(usageStats.verificationsPerformed).toBe(0);
            expect(usageStats.storageUsed).toBe(0);
            expect(usageStats.apiCallsThisMonth).toBe(0);
            expect(usageStats.activeUsers).toBe(0);
            expect(usageStats.lastResetDate).toBeInstanceOf(Date);
        });
    });

    describe('Model Instance Methods', () => {
        it('should test User instance methods without database', () => {
            // Create a mock user instance to test methods
            const mockUser = {
                firstName: 'John',
                lastName: 'Doe',
                lockUntil: null,
                loginAttempts: 0,
            };

            // Test getFullName method logic
            const getFullName = User.prototype.getFullName;
            const fullName = getFullName.call(mockUser);
            expect(fullName).toBe('John Doe');

            // Test isLocked method logic
            const isLocked = User.prototype.isLocked;
            expect(isLocked.call(mockUser)).toBe(false);

            // Test with future lock time
            const lockedUser = { ...mockUser, lockUntil: new Date(Date.now() + 10000) };
            expect(isLocked.call(lockedUser)).toBe(true);

            // Test with past lock time
            const expiredLockUser = { ...mockUser, lockUntil: new Date(Date.now() - 10000) };
            expect(isLocked.call(expiredLockUser)).toBe(false);
        });

        it('should test Organization subscription limits', () => {
            const mockOrg = {
                subscriptionTier: SubscriptionTier.FREE,
            };

            const getSubscriptionLimits = Organization.prototype.getSubscriptionLimits;
            const limits = getSubscriptionLimits.call(mockOrg);

            expect(limits.maxDocuments).toBe(10);
            expect(limits.maxStorage).toBe(100 * 1024 * 1024); // 100MB
            expect(limits.maxVerifications).toBe(5);
            expect(limits.maxUsers).toBe(1);
            expect(limits.maxApiCalls).toBe(100);

            // Test professional tier
            const proOrg = { subscriptionTier: SubscriptionTier.PROFESSIONAL };
            const proLimits = getSubscriptionLimits.call(proOrg);
            expect(proLimits.maxDocuments).toBe(1000);
            expect(proLimits.maxStorage).toBe(10 * 1024 * 1024 * 1024); // 10GB

            // Test enterprise tier (unlimited)
            const enterpriseOrg = { subscriptionTier: SubscriptionTier.ENTERPRISE };
            const enterpriseLimits = getSubscriptionLimits.call(enterpriseOrg);
            expect(enterpriseLimits.maxDocuments).toBe(-1);
            expect(enterpriseLimits.maxStorage).toBe(-1);
        });
    });
});