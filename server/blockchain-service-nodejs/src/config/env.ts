import Joi from 'joi';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // Database configuration
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),

  // Redis configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  // JWT configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Server configuration
  SERVER_BASE_URL: Joi.string().uri().default('http://localhost:3000'),

  // CORS configuration
  CORS_ORIGINS: Joi.string().default('http://localhost:4200'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // File upload
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  UPLOAD_PATH: Joi.string().default('./uploads'),

  // External services
  AI_FORENSICS_API_URL: Joi.string().uri().allow('').optional(),
  AI_FORENSICS_API_KEY: Joi.string().allow('').optional(),
  BLOCKCHAIN_SERVICE_URL: Joi.string().uri().allow('').optional(),
  IPFS_API_URL: Joi.string().uri().allow('').optional(),

  // Email configuration
  EMAIL_SERVICE: Joi.string().default('smtp'),
  EMAIL_HOST: Joi.string().allow('').optional(),
  EMAIL_PORT: Joi.number().port().optional(),
  EMAIL_USER: Joi.string().allow('').optional(),
  EMAIL_PASSWORD: Joi.string().allow('').optional(),
  EMAIL_FROM: Joi.string().email().allow('').optional(),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export interface Config {
  env: string;
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  cors: {
    origins: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  upload: {
    maxFileSize: number;
    uploadPath: string;
  };
  externalServices: {
    aiForensics?: {
      apiUrl: string;
      apiKey: string;
    };
    blockchain?: {
      serviceUrl: string;
    };
    ipfs?: {
      apiUrl: string;
    };
  };
  email: {
    service: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    from?: string;
  };
  logging: {
    level: string;
  };
}

const config: Config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    ssl: envVars.DB_SSL,
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
    db: envVars.REDIS_DB,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    origins: envVars.CORS_ORIGINS.split(',').map((origin: string) =>
      origin.trim()
    ),
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    uploadPath: envVars.UPLOAD_PATH,
  },
  externalServices: {
    ...(envVars.AI_FORENSICS_API_URL &&
      envVars.AI_FORENSICS_API_KEY &&
      envVars.AI_FORENSICS_API_URL.trim() !== '' &&
      envVars.AI_FORENSICS_API_KEY.trim() !== '' && {
      aiForensics: {
        apiUrl: envVars.AI_FORENSICS_API_URL,
        apiKey: envVars.AI_FORENSICS_API_KEY,
      },
    }),
    ...(envVars.BLOCKCHAIN_SERVICE_URL &&
      envVars.BLOCKCHAIN_SERVICE_URL.trim() !== '' && {
      blockchain: {
        serviceUrl: envVars.BLOCKCHAIN_SERVICE_URL,
      },
    }),
    ...(envVars.IPFS_API_URL &&
      envVars.IPFS_API_URL.trim() !== '' && {
      ipfs: {
        apiUrl: envVars.IPFS_API_URL,
      },
    }),
  },
  email: {
    service: envVars.EMAIL_SERVICE,
    host: envVars.EMAIL_HOST || undefined,
    port: envVars.EMAIL_PORT,
    user: envVars.EMAIL_USER || undefined,
    password: envVars.EMAIL_PASSWORD || undefined,
    from: envVars.EMAIL_FROM || undefined,
  },
  logging: {
    level: envVars.LOG_LEVEL,
  },
};

export default config;
