import {
    DataTypes,
    Model,
    Optional,
    Association,
    HasManyGetAssociationsMixin,
    BelongsToGetAssociationMixin,
    BelongsToSetAssociationMixin,
    Op,
} from 'sequelize';
import bcrypt from 'bcryptjs';
import database from '../config/database';

// User role enumeration
export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    USER = 'user',
    VIEWER = 'viewer',
}

// User preferences interface
export interface UserPreferences {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    verificationAlerts: boolean;
    weeklyReports: boolean;
    language: string;
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
}

// User attributes interface
export interface UserAttributes {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    mfaEnabled: boolean;
    mfaSecret?: string;
    mfaBackupCodes?: string[];
    lastLoginAt?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    organizationId?: string;
    role: UserRole;
    preferences: UserPreferences;
    profilePicture?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

// Optional attributes for creation
export interface UserCreationAttributes
    extends Optional<
        UserAttributes,
        | 'id'
        | 'isEmailVerified'
        | 'mfaEnabled'
        | 'loginAttempts'
        | 'role'
        | 'preferences'
        | 'isActive'
        | 'createdAt'
        | 'updatedAt'
        | 'deletedAt'
    > { }

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: string;
    public email!: string;
    public password!: string;
    public firstName!: string;
    public lastName!: string;
    public isEmailVerified!: boolean;
    public emailVerificationToken?: string;
    public emailVerificationExpires?: Date;
    public passwordResetToken?: string;
    public passwordResetExpires?: Date;
    public mfaEnabled!: boolean;
    public mfaSecret?: string;
    public mfaBackupCodes?: string[];
    public lastLoginAt?: Date;
    public loginAttempts!: number;
    public lockUntil?: Date;
    public organizationId?: string;
    public role!: UserRole;
    public preferences!: UserPreferences;
    public profilePicture?: string;
    public isActive!: boolean;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt?: Date;

    // Associations
    public getOrganization!: BelongsToGetAssociationMixin<any>;
    public setOrganization!: BelongsToSetAssociationMixin<any, string>;
    public getDocuments!: HasManyGetAssociationsMixin<any>;

    public static associations: {
        organization: Association<User, any>;
        documents: Association<User, any>;
    };

    // Instance methods
    public async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }

    public async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    public async setPassword(password: string): Promise<void> {
        this.password = await this.hashPassword(password);
    }

    public getFullName(): string {
        return `${this.firstName} ${this.lastName}`.trim();
    }

    public isLocked(): boolean {
        return !!(this.lockUntil && this.lockUntil > new Date());
    }

    public async incrementLoginAttempts(): Promise<void> {
        // If we have a previous lock that has expired, restart at 1
        if (this.lockUntil && this.lockUntil < new Date()) {
            this.loginAttempts = 1;
            this.lockUntil = undefined;
        } else {
            this.loginAttempts += 1;
            // Lock account after 5 failed attempts for 30 minutes
            if (this.loginAttempts >= 5) {
                this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
            }
        }
        await this.save();
    }

    public async resetLoginAttempts(): Promise<void> {
        this.loginAttempts = 0;
        this.lockUntil = undefined;
        this.lastLoginAt = new Date();
        await this.save();
    }

    public toJSON(): Partial<UserAttributes> {
        const values = { ...this.get() };
        // Remove sensitive fields from JSON output
        delete values.password;
        delete values.mfaSecret;
        delete values.mfaBackupCodes;
        delete values.emailVerificationToken;
        delete values.passwordResetToken;
        return values;
    }

    // Static methods
    public static async findByEmail(email: string): Promise<User | null> {
        return this.findOne({
            where: { email: email.toLowerCase() },
        });
    }

    public static async findByEmailVerificationToken(token: string): Promise<User | null> {
        return this.findOne({
            where: {
                emailVerificationToken: token,
                emailVerificationExpires: {
                    [DataTypes.Op.gt]: new Date(),
                },
            },
        });
    }

    public static async findByPasswordResetToken(token: string): Promise<User | null> {
        return this.findOne({
            where: {
                passwordResetToken: token,
                passwordResetExpires: {
                    [DataTypes.Op.gt]: new Date(),
                },
            },
        });
    }
}

// Initialize the model
User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
            set(value: string) {
                this.setDataValue('email', value.toLowerCase());
            },
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [8, 128],
            },
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [1, 50],
            },
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [1, 50],
            },
        },
        isEmailVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        emailVerificationToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        emailVerificationExpires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        passwordResetToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        passwordResetExpires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        mfaEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        mfaSecret: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        mfaBackupCodes: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
            defaultValue: [],
        },
        lastLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        loginAttempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        lockUntil: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        organizationId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'organizations',
                key: 'id',
            },
        },
        role: {
            type: DataTypes.ENUM(...Object.values(UserRole)),
            defaultValue: UserRole.USER,
        },
        preferences: {
            type: DataTypes.JSONB,
            defaultValue: {
                emailNotifications: true,
                smsNotifications: false,
                pushNotifications: true,
                verificationAlerts: true,
                weeklyReports: false,
                language: 'en',
                timezone: 'UTC',
                theme: 'light',
            },
        },
        profilePicture: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        sequelize: database.getSequelize(),
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        paranoid: true, // Enable soft deletes
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['email'],
            },
            {
                fields: ['organization_id'],
            },
            {
                fields: ['role'],
            },
            {
                fields: ['is_active'],
            },
            {
                fields: ['email_verification_token'],
            },
            {
                fields: ['password_reset_token'],
            },
        ],
        hooks: {
            beforeCreate: async (user: User) => {
                if (user.password) {
                    user.password = await user.hashPassword(user.password);
                }
            },
            beforeUpdate: async (user: User) => {
                if (user.changed('password') && user.password) {
                    user.password = await user.hashPassword(user.password);
                }
            },
        },
    }
);

export default User;