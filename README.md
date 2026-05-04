# PMT – Project Management Tool

A full-stack, monorepo project management platform for tracking roadmaps, release cadences, productivity, headcount, sprint metrics, leaves, and automated Weekly Status Reports.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Modules & Features](#modules--features)
- [Database Schema](#database-schema)
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

- **Roadmap management** – Feature tracking with Gantt timeline visualization
- **Release cadence** – Sprint planning, milestones, and release lifecycle management
- **Productivity reporting** – Team productivity metrics and records
- **Headcount reporting** – Workforce planning with projection charts and configurable windows
- **Sprint Metrics** – Per-sprint story/bug state snapshot tracking with donut charts
- **Leaves** – Leave record logging and weekly overlap reporting
- **Weekly Status Report (WSR)** – Auto-assembled, configurable weekly status page pulling live data from all modules
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
| Prisma | ^5.22 | ORM & migrations |
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
| ECharts (`echarts-for-react`) | ^5.5 | Charts & visualization |
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
│   │   │   ├── projects/         # Project CRUD & headcount window settings
│   │   │   ├── features/         # Feature/roadmap items
│   │   │   ├── roadmap/          # Roadmap aggregation & Gantt endpoint
│   │   │   ├── release-cadence/  # Sprints, milestones, release plans
│   │   │   ├── productivity/     # Productivity records & reports
│   │   │   ├── headcount/        # Headcount records, analytics & settings
│   │   │   ├── sprint-metrics/   # Sprint state snapshots (stories + bugs)
│   │   │   ├── leaves/           # Leave records & weekly overlap queries
│   │   │   ├── wsr/              # Weekly Status Report config, notes & assembly
│   │   │   ├── dashboard/        # Aggregated dashboard data
│   │   │   ├── saved-views/      # User-defined chart/filter views
│   │   │   ├── exports/          # Excel, CSV, PDF export generation
│   │   │   ├── health/           # Health check endpoint
│   │   │   ├── common/           # Guards, decorators, filters, middleware
│   │   │   └── prisma/           # PrismaService
│   │   └── Dockerfile
│   └── frontend/                 # React SPA
│       ├── src/
│       │   ├── app/              # Redux store, router, theme
│       │   ├── components/       # Shared UI components & layout
│       │   ├── features/
│       │   │   ├── auth/         # Login page
│       │   │   ├── dashboard/    # KPI dashboard
│       │   │   ├── roadmap/      # Gantt timeline + feature timeline
│       │   │   ├── release-cadence/ # Sprints & release management
│       │   │   ├── productivity/ # Productivity records
│       │   │   ├── headcount/    # HC projection chart + waterfall
│       │   │   ├── sprint-metrics/  # Sprint snapshot donut charts
│       │   │   ├── leaves/       # Leave table + log dialog
│       │   │   ├── wsr/          # Weekly Status Report assembly page
│       │   │   └── exports/      # Export dialog (Excel/CSV/PDF)
│       │   ├── services/         # Axios API service layer
│       │   ├── hooks/            # Custom React hooks
│       │   ├── context/          # React context providers (Project, Auth)
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
- Create and manage projects with project-scoped data isolation
- Add/remove project members with roles
- Persisted headcount chart window settings (`headcountPastMonths`, `headcountFutureMonths`)

### Roadmap & Features
- Feature lifecycle tracking with drag-and-drop ordering
- Gantt timeline visualization via ECharts custom renderer
- Milestone diamonds overlaid on release bars (production live, code freeze, go/no-go, etc.)
- Feature drawer for detailed editing

### Release Cadence
- Release plans (`MAJOR` / `MINOR`, full status lifecycle through to `PRODUCTION_LIVE`)
- Sprint calendars with auto-generation
- Pre-dev milestone types support

### Productivity
- Record and report team productivity metrics
- Queryable by date range, project, and team

### Headcount
- Monthly headcount records with opening/closing/added/removed/planned counts
- **Staffing Projection chart** – stacked bar (Active + Open Positions) + dashed Target line, with forward/back-fill for missing months
- **Waterfall chart** – net headcount change over time
- Configurable window (past months / future months) saved per project
- KPI stat cards: Total HC, Added, Removed, Open Roles, Target HC
- Export to Excel/CSV/PDF

### Sprint Metrics *(new)*
- Log per-sprint story state and bug state count snapshots
- Donut charts for story states and bug states (colours configurable per project)
- Snapshot history table with edit/delete
- `GET /sprint-metrics/latest` — latest snapshot per project/team

### Leaves *(new)*
- Log leave records per user with type (`PLANNED`, `UNPLANNED`, `SICK`, custom), start/end dates, half-day flag
- Date range filter for weekly/monthly overlap queries
- Autocomplete user picker

### Weekly Status Report (WSR) *(new)*
- **Configuration** – Per-project settings stored in `WsrConfig`:
  - Section visibility toggles and custom titles (Staffing, Sprint Productivity, Roadmap, Done/Planned, Achieved, Leaves, Appreciation, Risk/Concern)
  - Configurable story state keys/labels/colours, bug state keys/labels/colours, leave type keys/labels
- **Notes** – Inline click-to-edit text sections with auto-save debounce, persisted in `WeeklyReport` model keyed by `projectId + weekOf`
- **Assembly** – `GET /wsr/report` assembles live data from all modules for a given week:
  - **Staffing** – Headcount time-series chart using the same window as the Headcount module (`headcountPastMonths`/`headcountFutureMonths`). Solid bars = actual months; lighter bars = projected.
  - **Sprint Productivity** – Story and bug donut charts from the latest sprint snapshot
  - **Roadmap** – Full Gantt timeline from `GET /roadmap/gantt`, including release hierarchy and status colours
  - **Leaves** – Table of leaves overlapping the selected week
- **Export** – WSR data included in Excel (5 sheets), CSV, and PDF exports

### Dashboard
- Aggregated KPIs across all modules
- ECharts visualizations: bar, stacked bar, line, area, pie, donut, waterfall, scatter, Gantt

### Exports
- Excel (`.xlsx`), CSV, and PDF export for all major modules
- WSR export includes: Staffing, Sprint Productivity, Roadmap, Leaves, WSR Notes sheets

### Saved Views
- Persist custom chart configurations and filter sets
- Share views with other users

---

## Database Schema

The Prisma schema (`apps/backend/prisma/schema.prisma`) defines the following main models:

| Model | Table | Description |
|---|---|---|
| `User` | `users` | Application users |
| `Role` | `roles` | RBAC roles |
| `Permission` | `permissions` | Granular permission keys |
| `Project` | `projects` | Projects with HC window settings |
| `ProjectMember` | `project_members` | User–project membership |
| `Team` | `teams` | Teams within projects |
| `Feature` | `features` | Roadmap feature items |
| `ReleasePlan` | `release_plans` | Release definitions |
| `Sprint` | `sprints` | Sprint calendars |
| `Milestone` | `milestones` | Sprint/release milestones |
| `ProductivityRecord` | `productivity_records` | Productivity entries |
| `HeadcountRecord` | `headcount_records` | Monthly HC records |
| `SprintStateSnapshot` | `sprint_state_snapshots` | Sprint story/bug state counts |
| `LeaveRecord` | `leave_records` | Employee leave records |
| `WsrConfig` | `wsr_configs` | Per-project WSR configuration |
| `WeeklyReport` | `weekly_reports` | WSR weekly notes (keyed by project + weekOf) |
| `AuditLog` | `audit_logs` | System audit trail |
| `SavedView` | `saved_views` | Persisted user views |

### Key migrations
| Migration | Description |
|---|---|
| `20260421060544_init` | Initial schema — all core models |
| `20260421084711_add_phase_offsets` | Phase offset fields on milestones |
| `20260421095139_make_project_optional` | Optional project relation on several models |
| `20260421145801_add_project_members` | ProjectMember model |
| `20260421160621_add_headcount_settings` | `headcountPastMonths` / `headcountFutureMonths` on Project |
| `20260422061630_phase4_audit_log_integrity` | Audit log integrity fields |
| `20260422071831_feature_timeline` | Feature `plannedStart` / `plannedEnd` dates |
| `20260423062731_add_pre_dev_milestone_types` | Pre-dev milestone enum values |
| `20260504152318_add_sprint_metrics_leaves_wsr` | `SprintStateSnapshot`, `LeaveRecord`, `WsrConfig`, `WeeklyReport` models |

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

# Seed the database with demo users, projects, roles and permissions
npm run db:seed
```

Or use the automated setup script which runs both in sequence:

```bash
npm run db:setup
```

> **Note:** The seed script creates default roles (`SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`, `DEVELOPER`, `VIEWER`) with full permission sets including `sprint_metrics`, `leaves`, and `wsr` resources.

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

### Key API Endpoints

| Module | Method | Path | Description |
|---|---|---|---|
| Auth | POST | `/auth/login` | Obtain JWT tokens |
| Auth | POST | `/auth/refresh` | Refresh access token |
| Auth | POST | `/auth/logout` | Revoke refresh token |
| Projects | GET/POST | `/projects` | List / create projects |
| Headcount | GET | `/headcount/analytics/time-series` | HC data for projection chart |
| Headcount | GET | `/headcount/analytics/waterfall` | Net change waterfall data |
| Headcount | GET | `/headcount/analytics/summary` | Current HC KPI summary |
| Sprint Metrics | POST | `/sprint-metrics` | Log sprint snapshot |
| Sprint Metrics | GET | `/sprint-metrics` | List snapshots `{ items, total, page, limit }` |
| Sprint Metrics | GET | `/sprint-metrics/latest` | Latest snapshot per project/team |
| Leaves | POST | `/leaves` | Log a leave record |
| Leaves | GET | `/leaves` | List leave records (plain array) |
| WSR | GET | `/wsr/config` | Get WSR configuration |
| WSR | PUT | `/wsr/config` | Upsert WSR configuration |
| WSR | POST | `/wsr/config/reset` | Reset config to defaults |
| WSR | GET/PUT | `/wsr/notes` | Get / upsert weekly report notes |
| WSR | GET | `/wsr/report` | Assemble full WSR for a given week |
| Roadmap | GET | `/roadmap/gantt` | Gantt rows with children & milestones |
| Exports | POST | `/exports/excel` | Generate Excel export |
| Exports | POST | `/exports/csv` | Generate CSV export |
| Exports | POST | `/exports/pdf` | Generate PDF export |

> **Response envelope note:**
> - Most endpoints: `{ data: T[], meta: { total, page, limit, totalPages } }`
> - `GET /leaves`: plain `LeaveRecord[]` array (no wrapper)
> - `GET /sprint-metrics`: `{ items: T[], total, page, limit }` (uses `items` key)

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
| `EXPORT_STORAGE_PATH` | `/tmp/pmt-exports` | Directory for generated export files |

### `apps/frontend/.env`

| Variable | Example | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3001` | Backend API base URL |

> **Security note:** Never commit `.env` files with real secrets. All `.env` files are gitignored.
