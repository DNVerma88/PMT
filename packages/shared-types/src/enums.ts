// ─── User / Auth ──────────────────────────────────────────────────────────────

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum SystemRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  DELIVERY_MANAGER = 'DELIVERY_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  ENGINEERING_MANAGER = 'ENGINEERING_MANAGER',
  TEAM_LEAD = 'TEAM_LEAD',
  VIEWER = 'VIEWER',
}

// ─── Release / Roadmap ────────────────────────────────────────────────────────

export enum ReleaseType {
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
}

export enum ReleaseStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DELAYED = 'DELAYED',
  AT_RISK = 'AT_RISK',
}

export enum MilestoneType {
  DEVELOPMENT_START = 'DEVELOPMENT_START',
  DEVELOPMENT_END = 'DEVELOPMENT_END',
  CODE_FREEZE = 'CODE_FREEZE',
  REGRESSION_START = 'REGRESSION_START',
  REGRESSION_END = 'REGRESSION_END',
  GO_NO_GO = 'GO_NO_GO',
  PRODUCTION_LIVE = 'PRODUCTION_LIVE',
}

export enum MilestoneStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
  AT_RISK = 'AT_RISK',
  SKIPPED = 'SKIPPED',
}

export enum CadenceMode {
  SPRINT_BASED = 'SPRINT_BASED',
  GROUPED_SPRINT = 'GROUPED_SPRINT',
  DATE_RANGE = 'DATE_RANGE',
}

export enum TimeScale {
  SPRINT = 'SPRINT',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  CUSTOM = 'CUSTOM',
}

// ─── Charts / Views ───────────────────────────────────────────────────────────

export enum ChartType {
  BAR = 'BAR',
  STACKED_BAR = 'STACKED_BAR',
  LINE = 'LINE',
  AREA = 'AREA',
  PIE = 'PIE',
  DONUT = 'DONUT',
  WATERFALL = 'WATERFALL',
  SCATTER = 'SCATTER',
  GANTT = 'GANTT',
}

export enum DashboardModule {
  ROADMAP = 'ROADMAP',
  RELEASE_CADENCE = 'RELEASE_CADENCE',
  PRODUCTIVITY = 'PRODUCTIVITY',
  HEADCOUNT = 'HEADCOUNT',
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SOFT_DELETE = 'SOFT_DELETE',
  RESTORE = 'RESTORE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

// ─── Productivity ─────────────────────────────────────────────────────────────

export enum WorkType {
  FEATURE = 'FEATURE',
  BUG = 'BUG',
  CHORE = 'CHORE',
  TECH_DEBT = 'TECH_DEBT',
  AUTOMATION = 'AUTOMATION',
  DOCUMENTATION = 'DOCUMENTATION',
}

// ─── Permissions (resource:action format) ─────────────────────────────────────

export enum PermissionResource {
  USERS = 'users',
  ROLES = 'roles',
  PROJECTS = 'projects',
  TEAMS = 'teams',
  RELEASE_PLANS = 'release_plans',
  RELEASE_MILESTONES = 'release_milestones',
  SPRINT_CALENDARS = 'sprint_calendars',
  PRODUCTIVITY_METRICS = 'productivity_metrics',
  HEADCOUNT = 'headcount',
  SAVED_VIEWS = 'saved_views',
  AUDIT_LOGS = 'audit_logs',
  EXPORTS = 'exports',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // full access
  EXPORT = 'export',
  SHARE = 'share',
}
