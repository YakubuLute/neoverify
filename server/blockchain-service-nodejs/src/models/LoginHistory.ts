import {
    DataTypes,
    Model,
    Optional,
    Association,
    BelongsToGetAssociationMixin,
} from 'sequelize';
import database from '../config/database';
import User from './User';

// Login attempt status enumeration
export enum LoginStatus {
    SUCCESS = 'success',
    FAILED_INVALID_CREDENTIALS = 'failed_invalid_credentials',
    FAILED_ACCOUNT_LOCKED = 'failed_account_locked',
    FAILED_EMAIL_NOT_VERIFIED = 'failed_email_not_verified',
    FAILED_MFA_REQUIRED = 'failed_mfa_required',
    FAILED_INVALID_MFA = 'failed_invalid_mfa',
    LOGOUT = 'logout',
}

// Login history attributes interface
export interface LoginHistoryAttributes {
    id: string;
    userId: string;
    status: LoginStatus;
    ipAddress: string;
    userAgent: string;
    deviceInfo?: string;
    location?: string;
    failureReason?: string;
    sessionId?: string;
    createdAt?: Date;
}

// Optional attributes for creation
export interface LoginHistoryCreationAttributes
    extends Optional<
        LoginHistoryAttributes,
        'id' | 'deviceInfo' | 'location' | 'failureReason' | 'sessionId' | 'createdAt'
    > { }

class LoginHistory extends Model<LoginHistoryAttributes, LoginHistoryCreationAttributes> implements LoginHistoryAttributes {
    public id!: string;
    public userId!: string;
    public status!: LoginStatus;
    public ipAddress!: string;
    public userAgent!: string;
    public deviceInfo?: string;
    public location?: string;
    public failureReason?: string;
    public sessionId?: string;

    // Timestamps
    public readonly createdAt!: Date;

    // Associations
    public getUser!: BelongsToGetAssociationMixin<User>;

    public static associations: {
        user: Association<LoginHistory, User>;
    };

    // Instance methods
    public isSuccessful(): boolean {
        return this.status === LoginStatus.SUCCESS;
    }

    public isFailed(): boolean {
        return this.status !== LoginStatus.SUCCESS && this.status !== LoginStatus.LOGOUT;
    }
}

// Initialize the model
LoginHistory.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        status: {
            type: DataTypes.ENUM(...Object.values(LoginStatus)),
            allowNull: false,
        },
        ipAddress: {
            type: DataTypes.INET,
            allowNull: false,
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        deviceInfo: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        failureReason: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        sessionId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'user_sessions',
                key: 'id',
            },
        },
    },
    {
        sequelize: database.getSequelize(),
        modelName: 'LoginHistory',
        tableName: 'login_history',
        timestamps: true,
        updatedAt: false, // Only track creation time
        underscored: true,
        indexes: [
            {
                fields: ['user_id'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['ip_address'],
            },
            {
                fields: ['created_at'],
            },
            {
                fields: ['session_id'],
            },
        ],
    }
);

export default LoginHistory;