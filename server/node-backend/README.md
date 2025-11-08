# NeoVerify Backend API

Express.js backend API for the NeoVerify document verification system.

## Features

- **TypeScript**: Full TypeScript support with strict type checking
- **Express.js**: RESTful API framework
- **PostgreSQL**: Database with Sequelize ORM
- **Redis**: Caching and session management
- **JWT Authentication**: Secure token-based authentication
- **Environment Configuration**: Joi-based environment validation
- **Code Quality**: ESLint, Prettier, and Jest testing
- **Logging**: Winston structured logging
- **Security**: Helmet, CORS, rate limiting

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Redis 6+

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration values.

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

### Database Scripts

- `npm run db:create` - Create database
- `npm run db:migrate` - Run migrations
- `npm run db:migrate:undo` - Undo last migration
- `npm run db:seed` - Run seeders
- `npm run db:seed:undo` - Undo seeders

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── env.ts       # Environment validation
│   ├── database.ts  # Database configuration
│   ├── redis.ts     # Redis configuration
│   └── index.ts     # Config exports
├── services/         # Business logic services
│   └── cache.service.ts
├── utils/           # Utility functions
│   └── logger.ts    # Winston logger
├── database/        # Database files
│   ├── migrations/  # Database migrations
│   └── seeders/     # Database seeders
└── server.ts        # Application entry point
```

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

- `POSTGRES_DB_HOST`, `POSTGRES_DB_NAME`, `POSTGRES_USER`, `DB_PASSWORD` - Database connection
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT signing secrets (min 32 chars)
- `REDIS_HOST` - Redis connection

## Next Steps

This foundation provides:
- ✅ TypeScript configuration and build system
- ✅ Environment configuration with validation
- ✅ Database connection with Sequelize
- ✅ Redis connection and caching utilities
- ✅ Code quality tools (ESLint, Prettier, Jest)
- ✅ Logging infrastructure

Ready for implementing:
- Express middleware and security
- Data models and database layer
- Authentication system
- API endpoints
- External service integrations