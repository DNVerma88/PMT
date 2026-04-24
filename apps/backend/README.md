# PMT Backend

NestJS + TypeScript + Prisma + PostgreSQL REST API.

## Prerequisites

- Node.js >= 20
- Docker Desktop (for PostgreSQL)

## Environment Setup

```bash
cp .env.example .env
# Edit .env and fill in JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET with strong random strings:
# openssl rand -hex 32
```

## Database Setup (from monorepo root)

```bash
# Start PostgreSQL container
npm run db:up

# Run migrations (creates all tables)
npm run db:migrate

# Seed initial data (roles, permissions, admin user)
npm run db:seed

# OR do all three in one command:
npm run db:setup
```

## Running the Backend

```bash
# From monorepo root
npm run backend

# OR from apps/backend
npm run start:dev
```

The API will be available at: `http://localhost:3000/api/v1`  
Swagger UI: `http://localhost:3000/api/docs`

## Default Admin Credentials

| Field    | Value             |
|----------|-------------------|
| Email    | admin@pmt.local   |
| Password | Admin@2025!       |

**Change this password immediately after first login.**

## Available Scripts

| Script                  | Description                         |
|-------------------------|-------------------------------------|
| `npm run start:dev`     | Start with hot-reload               |
| `npm run build`         | Compile TypeScript to `dist/`       |
| `npm run test`          | Run unit tests                      |
| `npm run test:e2e`      | Run end-to-end tests                |
| `npm run prisma:studio` | Open Prisma Studio (DB browser)     |
| `npm run prisma:migrate`| Run pending migrations              |
| `npm run prisma:seed`   | Re-seed the database                |
| `npm run prisma:reset`  | Reset DB and re-run all migrations  |

## API Overview

All endpoints are versioned under `/api/v1`.

### Auth
| Method | Path                  | Description              |
|--------|-----------------------|--------------------------|
| GET    | /auth/csrf            | Get CSRF token (public)  |
| POST   | /auth/login           | Login (public)           |
| POST   | /auth/logout          | Logout                   |
| POST   | /auth/refresh         | Refresh access token     |
| GET    | /auth/me              | Get current user         |

### Users
| Method | Path         | Description              |
|--------|--------------|--------------------------|
| POST   | /users       | Create user (Admin)      |
| GET    | /users       | List users (paginated)   |
| GET    | /users/:id   | Get user                 |
| DELETE | /users/:id   | Soft-delete user (Admin) |

### Roles
| Method | Path         | Description              |
|--------|--------------|--------------------------|
| GET    | /roles       | List all roles           |
| GET    | /roles/:id   | Get role with permissions|

## Security Notes

### Cookie Configuration
- `access_token`: httpOnly, SameSite=Lax, 15 minutes
- `refresh_token`: httpOnly, SameSite=Lax, restricted to `/api/v1/auth/refresh`, 7 days
- `csrf_token`: NOT httpOnly (JS-readable), SameSite=Strict, used for CSRF protection

### CSP
Current CSP allows `'unsafe-inline'` for styles in development (required for MUI/emotion).  
In production, replace with nonce-based CSP:

1. Generate a nonce per request in `main.ts`
2. Inject nonce into Helmet CSP: `styleSrc: ["'self'", \`'nonce-${nonce}'\`]`
3. Configure emotion cache with the nonce: `createCache({ key: 'css', nonce })`
4. Serve the HTML with the nonce in a `<meta>` tag for the frontend to read

### Environment Variables
Never commit `.env` to version control. Use a secret manager (AWS Secrets Manager, Azure Key Vault, etc.) in production.

### Audit Logs
All create/update/delete operations on key resources are written to the `audit_logs` table. Accessible via the AuditInterceptor on routes decorated with `@Audit(AuditAction.xxx)`.
