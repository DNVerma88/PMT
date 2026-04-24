# PMT Frontend

React 19 + TypeScript + MUI v6 + ECharts + Redux Toolkit + TanStack Query.

## Prerequisites

- Node.js >= 20
- PMT Backend running on `http://localhost:3000`

## Environment Setup

```bash
cp .env.example .env.local
# Adjust VITE_API_BASE_URL if your backend is on a different host
```

## Running the Frontend

```bash
# From monorepo root
npm run frontend

# OR from apps/frontend
npm run dev
```

The app will be available at: `http://localhost:5173`

The Vite dev server automatically proxies `/api` requests to `http://localhost:3000`, so cookies work correctly (same-origin).

## Build

```bash
npm run build
# Output in dist/
```

## Available Scripts

| Script              | Description                     |
|---------------------|---------------------------------|
| `npm run dev`       | Start Vite dev server           |
| `npm run build`     | Production build                |
| `npm run preview`   | Preview production build        |
| `npm run test`      | Run Vitest unit tests           |
| `npm run typecheck` | TypeScript type check           |
| `npm run lint`      | ESLint check                    |

## Architecture

```
src/
├── app/            # Root providers: router, Redux store, MUI theme, React Query
├── features/       # Feature modules (auth, roadmap, release-cadence, etc.)
├── components/
│   ├── layout/     # AppShell, Sidebar, Topbar
│   ├── guards/     # ProtectedRoute, RoleGuard
│   └── common/     # ErrorBoundary, LoadingSpinner, EmptyState
├── hooks/          # Shared hooks (useAuth, useCurrentUser, usePermission, etc.)
├── services/       # API clients (axios + CSRF interceptor, auth.service)
├── types/          # TypeScript types (re-exports @pmt/shared-types + domain types)
└── utils/          # Date formatting, sanitization, enum formatting
```

## Security Notes

### Auth
- JWT is stored in **httpOnly cookies** — never accessible via JavaScript.
- CSRF protection uses double-submit cookie pattern:
  1. App calls `GET /api/v1/auth/csrf` on startup → stores token in Redux (memory only)
  2. Axios interceptor adds `X-CSRF-Token` header on all mutating requests
  3. Backend validates header === cookie on every mutation

### XSS Prevention
- `DOMPurify.sanitize()` is used for any user-provided HTML
- No `dangerouslySetInnerHTML` without sanitization
- MUI `sx` prop for styling (no raw `style` injection)
- ECharts renders to canvas/SVG — no HTML injection surface

### Route Guards
- `ProtectedRoute`: redirects to `/login` if not authenticated
- `RoleGuard`: restricts access based on roles (client-side UX only; backend enforces authz)

### CSP
The backend sets Content-Security-Policy headers. In development, `'unsafe-inline'` is allowed for MUI/emotion styles. See `apps/backend/README.md` for production CSP configuration.

## Charting

- **Standard charts** (bar, line, area, pie, stacked bar, waterfall, scatter): ECharts via `echarts-for-react`
- **Gantt / timeline / roadmap**: ECharts custom series (Stage 3)
- All charts are accessible with ARIA labels and keyboard navigation

## Code Splitting

Routes are lazy-loaded via `React.lazy()` with `Suspense`. The build produces separate chunks for React, MUI, ECharts, Redux, and React Router.
