# PMT – Project Management Tool

A full-stack, monorepo project management platform for tracking roadmaps, release cadences, productivity, and headcount reporting.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Modules & Features](#modules--features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Fork & Clone](#1-fork--clone)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Start the Database](#4-start-the-database)
  - [5. Run Migrations & Seed](#5-run-migrations--seed)
  - [6. Start the Application](#6-start-the-application)
- [Running with Docker (Full Stack)](#running-with-docker-full-stack)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Environment Variables Reference](#environment-variables-reference)

---

## Overview

PMT is a monorepo application that provides:

- **Roadmap management** – Feature tracking with timeline visualization
- **Release cadence** – Sprint planning, milestones, and release lifecycle management
- **Productivity reporting** – Team and individual productivity metrics
- **Headcount reporting** – Workforce planning and headcount tracking
- **Dashboard** – Aggregated KPIs and charts across all modules
- **Saved views** – Custom chart and filter configurations per user/role
- **Role-based access control** – Granular permissions per module

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│          React 19 + MUI v6 + ECharts            │
└─────────────────────┬───────────────────────────┘
                      │ HTTPS / REST
┌─────────────────────▼───────────────────────────┐
│              NestJS Backend (port 3001)          │
│    JWT Auth · RBAC · Swagger · Rate Limiting     │
└─────────────────────┬───────────────────────────┘
                      │ Prisma ORM
┌─────────────────────▼───────────────────────────┐
│            PostgreSQL 16 (port 5434)             │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend (`apps/backend`)
| Technology | Version | Purpose |
|---|---|---|
| NestJS | ^10.3 | API framework |
| Prisma | ^5.11 | ORM & migrations |
| PostgreSQL | 16 | Primary database |
| Passport + JWT | — | Authentication |
| Swagger | ^7.3 | API docs |
| Helmet | ^7.1 | Security headers |
| NestJS Throttler | ^5.1 | Rate limiting |
| nestjs-pino | ^4.1 | Structured logging |
| bcryptjs | ^2.4 | Password hashing |

### Frontend (`apps/frontend`)
| Technology | Version | Purpose |
|---|---|---|
| React | ^19.0 | UI framework |
| Vite | ^5.2 | Build tool |
| MUI (Material UI) | ^6.0 | Component library |
| ECharts | ^5.5 | Charts & visualization |
| Redux Toolkit | ^2.2 | State management |
| TanStack Query | ^5.28 | Server state & caching |
| React Router | ^7.0 | Client-side routing |
| Axios | ^1.6 | HTTP client |
| dnd-kit | ^6.3 | Drag and drop |

### Shared
| Package | Purpose |
|---|---|
| `packages/shared-types` | Shared TypeScript enums and types |

---

## Project Structure

```
PMT/
├── apps/
│   ├── backend/                  # NestJS API server
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema
│   │   │   ├── seed.ts           # Database seeder
│   │   │   └── migrations/       # Prisma migration history
│   │   ├── src/
│   │   │   ├── auth/             # JWT authentication & refresh tokens
│   │   │   ├── users/            # User management
│   │   │   ├── roles/            # Role & permission management
│   │   │   ├── projects/         # Project CRUD
│   │   │   ├── features/         # Feature/roadmap items
│   │   │   ├── roadmap/          # Roadmap aggregation
│   │   │   ├── release-cadence/  # Sprints, milestones, release plans
│   │   │   ├── productivity/     # Productivity records & reports
│   │   │   ├── headcount/        # Headcount records & settings
│   │   │   ├── dashboard/        # Aggregated dashboard data
│   │   │   ├── saved-views/      # User-defined chart/filter views
│   │   │   ├── health/           # Health check endpoint
│   │   │   ├── common/           # Guards, decorators, filters, middleware
│   │   │   └── prisma/           # PrismaService
│   │   └── Dockerfile
│   └── frontend/                 # React SPA
│       ├── src/
│       │   ├── app/              # Redux store, router, theme
│       │   ├── components/       # Shared UI components & layout
│       │   ├── features/         # Feature-sliced pages (auth, dashboard, roadmap, etc.)
│       │   ├── services/         # Axios API service layer
│       │   ├── hooks/            # Custom React hooks
│       │   ├── context/          # React context providers
│       │   └── types/            # Frontend-specific types
│       └── Dockerfile
├── packages/
│   └── shared-types/             # Shared enums & TypeScript types
├── scripts/
│   └── setup-db.mjs              # Automated DB setup script
├── docker-compose.yml            # Full-stack Docker orchestration
└── package.json                  # Root workspace scripts
```

---

## Modules & Features

### Auth
- JWT access tokens (15-minute expiry by default) + refresh tokens (7-day)
- Secure HTTP-only cookie-based refresh
- CSRF protection middleware
- Rate-limited login endpoint

### Users & Roles
- User CRUD with status management (`ACTIVE`, `INACTIVE`, `SUSPENDED`)
- Role-based access control (RBAC) with granular permissions per module
- Project membership model

### Projects
- Create and manage projects
- Add/remove project members with roles
- Project-scoped data isolation

### Roadmap & Features
- Feature lifecycle tracking with drag-and-drop ordering
- Timeline visualization (Gantt-style via ECharts)
- Feature drawer for detailed editing

### Release Cadence
- Release plans (`MAJOR` / `MINOR`, statuses: `DRAFT` → `PRODUCTION_LIVE`)
- Sprint calendars with auto-generation
- Milestone tracking (`BACKLOG_GROOMING`, `CODE_FREEZE`, `GO_NO_GO`, `PRODUCTION_LIVE`, etc.)
- Pre-dev milestone types support

### Productivity
- Record and report team productivity metrics
- Queryable by date range, project, and team

### Headcount
- Headcount records per project/team
- Configurable headcount settings
- Reporting and export

### Dashboard
- Aggregated KPIs across all modules
- ECharts visualizations (bar, stacked bar, line, area, pie, donut, waterfall, scatter, Gantt)

### Saved Views
- Persist custom chart configurations and filter sets
- Share views with other users

---

## Prerequisites

Make sure the following are installed before proceeding:

| Tool | Minimum Version | Download |
|---|---|---|
| Node.js | 20.x | https://nodejs.org |
| npm | 10.x | Bundled with Node.js |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Git | Any | https://git-scm.com |

---

## Getting Started

### 1. Fork & Clone

**Fork** the repository on GitHub, then clone your fork locally:

```bash
git clone https://github.com/<your-username>/PMT.git
cd PMT
```

Add the upstream remote to stay up to date:

```bash
git remote add upstream https://github.com/DNVerma88/PMT.git
```

---

### 2. Install Dependencies

Install all workspace dependencies from the root:

```bash
npm install
```

This installs dependencies for the backend, frontend, and shared-types packages simultaneously via npm workspaces.

---

### 3. Configure Environment Variables

Copy the example environment files and fill in your values:

```bash
# Root .env (used by docker-compose)
cp .env.example .env

# Backend .env
cp apps/backend/.env.example apps/backend/.env

# Frontend .env
cp apps/frontend/.env.example apps/frontend/.env
```

See the [Environment Variables Reference](#environment-variables-reference) section for all required variables.

---

### 4. Start the Database

Start a PostgreSQL instance using Docker:

```bash
npm run db:up
```

This starts a PostgreSQL 16 container (`pmt_postgres`) on port **5434**.

Verify it is running:

```bash
docker ps
```

---

### 5. Run Migrations & Seed

Run database migrations and optionally seed with demo data:

```bash
# Run all migrations
npm run db:migrate

# Seed the database with demo users, projects, and data
npm run db:seed
```

Or use the automated setup script which runs both in sequence:

```bash
npm run db:setup
```

---

### 6. Start the Application

Open **two terminal windows** and run:

**Terminal 1 – Backend (port 3001):**
```bash
npm run backend
```

**Terminal 2 – Frontend (port 5173):**
```bash
npm run frontend
```

Then open your browser at:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Swagger Docs:** http://localhost:3001/api

---

## Running with Docker (Full Stack)

To run the entire stack (PostgreSQL + Backend + Frontend) with Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

Services will be available at:

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api |
| PostgreSQL | localhost:5434 |

**Optional – pgAdmin database UI:**

```bash
docker-compose --profile tools up -d
```

pgAdmin will be available at http://localhost:5050 (default credentials: `admin@pmt.local` / `pgadmin_password`).

**Stop all services:**

```bash
docker-compose down

# To also remove the database volume (destructive – deletes all data)
docker-compose down -v
```

---

## Available Scripts

Run from the **project root**:

| Script | Description |
|---|---|
| `npm run backend` | Start backend in watch/dev mode |
| `npm run frontend` | Start frontend Vite dev server |
| `npm run build:backend` | Production build of the backend |
| `npm run build:frontend` | Production build of the frontend |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:migrate` | Run pending Prisma migrations (dev) |
| `npm run db:migrate:prod` | Deploy migrations (production) |
| `npm run db:seed` | Seed the database |
| `npm run db:reset` | Reset DB and re-run all migrations |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:setup` | Automated DB setup (migrate + seed) |
| `npm run test:backend` | Run backend unit tests |
| `npm run test:frontend` | Run frontend unit tests |
| `npm run lint:backend` | Lint backend code |
| `npm run lint:frontend` | Lint frontend code |

---

## API Documentation

The backend exposes a Swagger UI at:

```
http://localhost:3001/api
```

All endpoints are documented with request/response schemas, authentication requirements, and example payloads.

---

## Testing

**Backend tests (Jest):**
```bash
npm run test:backend

# With coverage
cd apps/backend && npm run test:cov

# E2E tests
cd apps/backend && npm run test:e2e
```

**Frontend tests (Vitest):**
```bash
npm run test:frontend

# With UI
cd apps/frontend && npm run test:ui

# With coverage
cd apps/frontend && npm run test:coverage
```

---

## Environment Variables Reference

### Root `.env` (Docker Compose)

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `pmt_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `pmt_password` | PostgreSQL password |
| `POSTGRES_DB` | `pmt_db` | PostgreSQL database name |
| `POSTGRES_PORT` | `5434` | Host port for PostgreSQL |
| `BACKEND_PORT` | `3001` | Host port for backend |
| `FRONTEND_PORT` | `8080` | Host port for frontend |
| `JWT_SECRET` | — | **Required.** Min 32 chars |
| `JWT_REFRESH_SECRET` | — | **Required.** Min 32 chars |
| `COOKIE_SECRET` | — | **Required.** Min 32 chars |
| `CSRF_SECRET` | — | **Required.** Min 32 chars |

### `apps/backend/.env`

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://pmt_user:pmt_password@localhost:5434/pmt_db` | Prisma DB connection string |
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `development` | Environment (`development` / `production`) |
| `JWT_SECRET` | `your_jwt_secret_min_32_chars` | JWT signing secret |
| `JWT_REFRESH_SECRET` | `your_refresh_secret_min_32_chars` | Refresh token signing secret |
| `JWT_EXPIRES_IN` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiry |
| `COOKIE_SECRET` | `your_cookie_secret_min_32_chars` | Cookie signing secret |
| `CSRF_SECRET` | `your_csrf_secret_min_32_chars` | CSRF token secret |

### `apps/frontend/.env`

| Variable | Example | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3001` | Backend API base URL |

> **Security note:** Never commit `.env` files with real secrets. All `.env` files are gitignored.
