// Re-export shared enums for convenience
export * from '@pmt/shared-types';

// ─── API response shapes ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  correlationId: string | null;
  timestamp: string;
  path: string;
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReleasePlan {
  id: string;
  name: string;
  description: string | null;
  version: string;
  type: 'MAJOR' | 'MINOR';
  status: string;
  projectId: string;
  teamId: string | null;
  cadenceMode: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  milestones?: ReleaseMilestone[];
}

export interface ReleaseMilestone {
  id: string;
  releasePlanId: string;
  type: string;
  status: string;
  plannedDate: string;
  actualDate: string | null;
  notes: string | null;
}

export interface HeadcountRecord {
  id: string;
  projectId: string | null;
  teamId: string | null;
  role: string | null;
  period: string;
  openingCount: number;
  addedCount: number;
  removedCount: number;
  closingCount: number;
  plannedCount: number | null;
  createdAt: string;
}

export interface ProductivityRecord {
  id: string;
  metricDefId: string;
  projectId: string | null;
  teamId: string | null;
  sprintId: string | null;
  period: string;
  planned: number | null;
  actual: number;
  createdAt: string;
}

export interface SavedView {
  id: string;
  name: string;
  description: string | null;
  module: string;
  chartType: string;
  config: Record<string, unknown>;
  isDefault: boolean;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Chart configuration ──────────────────────────────────────────────────────

export interface ChartConfig {
  type: string;
  title?: string;
  filters?: Record<string, unknown>;
  dimensions?: string[];
  metrics?: string[];
  timeScale?: string;
  dateRange?: { start: string; end: string };
}
