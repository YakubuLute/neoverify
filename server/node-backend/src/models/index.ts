import User from './User';
import Document from './Document';
import Organization from './Organization';
import Verification from './Verification';
import UserSession from './UserSession';
import LoginHistory from './LoginHistory';
import UserInvitation from './UserInvitation';

// Define associations between models

// User associations
User.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
});

User.hasMany(Document, {
    foreignKey: 'userId',
    as: 'documents',
});

User.hasMany(Verification, {
    foreignKey: 'userId',
    as: 'verifications',
});

User.hasMany(UserSession, {
    foreignKey: 'userId',
    as: 'sessions',
});

User.hasMany(LoginHistory, {
    foreignKey: 'userId',
    as: 'loginHistory',
});

// Organization associations
Organization.hasMany(User, {
    foreignKey: 'organizationId',
    as: 'users',
});

Organization.hasMany(Document, {
    foreignKey: 'organizationId',
    as: 'documents',
});

Organization.hasMany(Verification, {
    foreignKey: 'organizationId',
    as: 'verifications',
});

// Document associations
Document.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});

Document.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
});

Document.hasMany(Verification, {
    foreignKey: 'documentId',
    as: 'verifications',
});

// Verification associations
Verification.belongsTo(Document, {
    foreignKey: 'documentId',
    as: 'document',
});

Verification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});

Verification.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
});

// UserSession associations
UserSession.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});

UserSession.hasMany(LoginHistory, {
    foreignKey: 'sessionId',
    as: 'loginHistory',
});

// LoginHistory associations
LoginHistory.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});

LoginHistory.belongsTo(UserSession, {
    foreignKey: 'sessionId',
    as: 'session',
});

// UserInvitation associations
UserInvitation.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
});

UserInvitation.belongsTo(User, {
    foreignKey: 'invitedBy',
    as: 'inviter',
});

// Organization has many invitations
Organization.hasMany(UserInvitation, {
    foreignKey: 'organizationId',
    as: 'invitations',
});

// User has many sent invitations
User.hasMany(UserInvitation, {
    foreignKey: 'invitedBy',
    as: 'sentInvitations',
});

// Export all models
export {
    User,
    Document,
    Organization,
    Verification,
    UserSession,
    LoginHistory,
    UserInvitation,
};

// Export model interfaces and enums for use in other parts of the application
export {
    UserRole,
    UserPreferences,
    UserAttributes,
    UserCreationAttributes,
} from './User';

export {
    VerificationStatus,
    DocumentType,
    DocumentMetadata,
    VerificationResults,
    SharingSettings,
    DocumentAttributes,
    DocumentCreationAttributes,
} from './Document';

export {
    SubscriptionTier,
    OrganizationSettings,
    BillingInfo,
    UsageStats,
    OrganizationAttributes,
    OrganizationCreationAttributes,
} from './Organization';

export {
    VerificationType,
    VerificationPriority,
    AIForensicsResults,
    BlockchainResults,
    IPFSResults,
    ManualResults,
    VerificationResultsData,
    VerificationMetadata,
    VerificationAttributes,
    VerificationCreationAttributes,
} from './Verification';

export {
    UserSessionAttributes,
    UserSessionCreationAttributes,
} from './UserSession';

export {
    LoginStatus,
    LoginHistoryAttributes,
    LoginHistoryCreationAttributes,
} from './LoginHistory';

export {
    InvitationStatus,
    UserInvitationAttributes,
    UserInvitationCreationAttributes,
} from './UserInvitation';

// Default export for convenience
export default {
    User,
    Document,
    Organization,
    Verification,
    UserSession,
    LoginHistory,
    UserInvitation,
};