import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { RoleGuard } from '../components/guards/RoleGuard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { LoginPage } from '../features/auth/LoginPage';

// Lazy-loaded feature pages (code splitting)
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const RoadmapPage = lazy(() => import('../features/roadmap/RoadmapPage').then(m => ({ default: m.RoadmapPage })));
const ReleaseCadencePage = lazy(() => import('../features/release-cadence/ReleaseCadencePage').then(m => ({ default: m.ReleaseCadencePage })));
const ProductivityPage = lazy(() => import('../features/productivity/ProductivityPage').then(m => ({ default: m.ProductivityPage })));
const HeadcountPage = lazy(() => import('../features/headcount/HeadcountPage').then(m => ({ default: m.HeadcountPage })));
const SavedViewsPage = lazy(() => import('../features/saved-views/SavedViewsPage').then(m => ({ default: m.SavedViewsPage })));
const NotificationsPage = lazy(() => import('../features/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ExportsPage = lazy(() => import('../features/exports/ExportsPage').then(m => ({ default: m.ExportsPage })));
const PortfolioPage = lazy(() => import('../features/portfolio/PortfolioPage').then(m => ({ default: m.PortfolioPage })));
const IntegrationsPage = lazy(() => import('../features/integrations/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const AdminPage = lazy(() => import('../features/admin/AdminPage').then(m => ({ default: m.AdminPage })));
const ProjectsPage = lazy(() => import('../features/projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const SprintMetricsPage = lazy(() => import('../features/sprint-metrics/SprintMetricsPage').then(m => ({ default: m.SprintMetricsPage })));
const LeavesPage = lazy(() => import('../features/leaves/LeavesPage').then(m => ({ default: m.LeavesPage })));
const WsrPage = lazy(() => import('../features/wsr/WsrPage').then(m => ({ default: m.WsrPage })));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullPage />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper>,
      },
      {
        path: 'roadmap',
        element: <SuspenseWrapper><RoadmapPage /></SuspenseWrapper>,
      },
      {
        path: 'release-cadence',
        element: <SuspenseWrapper><ReleaseCadencePage /></SuspenseWrapper>,
      },
      {
        path: 'productivity',
        element: <SuspenseWrapper><ProductivityPage /></SuspenseWrapper>,
      },
      {
        path: 'headcount',
        element: <SuspenseWrapper><HeadcountPage /></SuspenseWrapper>,
      },
      {
        path: 'saved-views',
        element: <SuspenseWrapper><SavedViewsPage /></SuspenseWrapper>,
      },
      {
        path: 'notifications',
        element: <SuspenseWrapper><NotificationsPage /></SuspenseWrapper>,
      },
      {
        path: 'exports',
        element: <SuspenseWrapper><ExportsPage /></SuspenseWrapper>,
      },
      {
        path: 'portfolio',
        element: <SuspenseWrapper><PortfolioPage /></SuspenseWrapper>,
      },
      {
        path: 'integrations',
        element: <SuspenseWrapper><IntegrationsPage /></SuspenseWrapper>,
      },
      {
        path: 'admin',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <SuspenseWrapper><AdminPage /></SuspenseWrapper>
          </RoleGuard>
        ),
      },
      {
        path: 'projects',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <SuspenseWrapper><ProjectsPage /></SuspenseWrapper>
          </RoleGuard>
        ),
      },
      {
        path: 'sprint-metrics',
        element: <SuspenseWrapper><SprintMetricsPage /></SuspenseWrapper>,
      },
      {
        path: 'leaves',
        element: <SuspenseWrapper><LeavesPage /></SuspenseWrapper>,
      },
      {
        path: 'wsr',
        element: <SuspenseWrapper><WsrPage /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
