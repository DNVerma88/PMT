import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertWsrConfigDto } from './dto/wsr-config.dto';
import { UpsertWeeklyReportDto, WeeklyReportQueryDto } from './dto/weekly-report.dto';

// ─── Default WSR config values ───────────────────────────────────────────────

const DEFAULT_STORY_STATES = [
  { key: 'active', label: 'Active', color: '#ff9800' },
  { key: 'in_review', label: 'BA Review', color: '#2196f3' },
  { key: 'blocked', label: 'Issues', color: '#f44336' },
  { key: 'closed', label: 'Closed', color: '#4caf50' },
];

const DEFAULT_BUG_STATES = [
  { key: 'closed', label: 'Closed', color: '#4caf50' },
  { key: 'active', label: 'Active', color: '#f44336' },
  { key: 'backlog', label: 'Backlog', color: '#9e9e9e' },
  { key: 'blocked', label: 'Issues', color: '#ff5722' },
  { key: 'ready_to_test', label: 'Ready To Test', color: '#2196f3' },
];

const DEFAULT_LEAVE_TYPES = [
  { key: 'PLANNED', label: 'Planned Leave' },
  { key: 'SICK', label: 'Sick Leave' },
  { key: 'EMERGENCY', label: 'Emergency Leave' },
  { key: 'PUBLIC_HOLIDAY', label: 'Public Holiday' },
];

const DEFAULT_SECTION_ORDER = [
  'staffing', 'productivity', 'roadmap',
  'done_planned', 'achieved', 'leaves', 'appreciation', 'risk',
];

@Injectable()
export class WsrService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── WSR Config ────────────────────────────────────────────────────────────

  async getConfig(projectId: string) {
    const config = await this.prisma.wsrConfig.findUnique({ where: { projectId } });
    if (config) return config;

    // Return defaults without persisting (lazy creation)
    return this.buildDefaultConfig(projectId);
  }

  async upsertConfig(dto: UpsertWsrConfigDto, updatedBy: string) {
    const data: Record<string, any> = { updatedBy };

    if (dto.reportTitle !== undefined) data.reportTitle = dto.reportTitle;
    if (dto.clientName !== undefined) data.clientName = dto.clientName;
    if (dto.vendorName !== undefined) data.vendorName = dto.vendorName;
    if (dto.titleStaffing !== undefined) data.titleStaffing = dto.titleStaffing;
    if (dto.titleProductivity !== undefined) data.titleProductivity = dto.titleProductivity;
    if (dto.titleRoadmap !== undefined) data.titleRoadmap = dto.titleRoadmap;
    if (dto.titleDonePlanned !== undefined) data.titleDonePlanned = dto.titleDonePlanned;
    if (dto.titleAchieved !== undefined) data.titleAchieved = dto.titleAchieved;
    if (dto.titleLeaves !== undefined) data.titleLeaves = dto.titleLeaves;
    if (dto.titleAppreciation !== undefined) data.titleAppreciation = dto.titleAppreciation;
    if (dto.titleRisk !== undefined) data.titleRisk = dto.titleRisk;
    if (dto.showStaffing !== undefined) data.showStaffing = dto.showStaffing;
    if (dto.showProductivity !== undefined) data.showProductivity = dto.showProductivity;
    if (dto.showRoadmap !== undefined) data.showRoadmap = dto.showRoadmap;
    if (dto.showDonePlanned !== undefined) data.showDonePlanned = dto.showDonePlanned;
    if (dto.showAchieved !== undefined) data.showAchieved = dto.showAchieved;
    if (dto.showLeaves !== undefined) data.showLeaves = dto.showLeaves;
    if (dto.showAppreciation !== undefined) data.showAppreciation = dto.showAppreciation;
    if (dto.showRisk !== undefined) data.showRisk = dto.showRisk;
    if (dto.sectionOrder !== undefined) data.sectionOrder = dto.sectionOrder;
    if (dto.storyStateConfig !== undefined) data.storyStateConfig = dto.storyStateConfig;
    if (dto.bugStateConfig !== undefined) data.bugStateConfig = dto.bugStateConfig;
    if (dto.leaveTypeConfig !== undefined) data.leaveTypeConfig = dto.leaveTypeConfig;

    return this.prisma.wsrConfig.upsert({
      where: { projectId: dto.projectId },
      update: data,
      create: {
        ...this.buildDefaultConfig(dto.projectId),
        ...data,
      },
    });
  }

  async resetConfig(projectId: string, updatedBy: string) {
    return this.prisma.wsrConfig.upsert({
      where: { projectId },
      update: {
        ...this.buildDefaultConfig(projectId),
        updatedBy,
      },
      create: {
        ...this.buildDefaultConfig(projectId),
        projectId,
        updatedBy,
      },
    });
  }

  private buildDefaultConfig(projectId: string) {
    return {
      projectId,
      reportTitle: 'Weekly Status Report',
      clientName: null,
      vendorName: null,
      titleStaffing: 'Staffing',
      titleProductivity: 'Sprint Productivity',
      titleRoadmap: 'Roadmap',
      titleDonePlanned: 'Done and Planned Work',
      titleAchieved: 'Achieved So Far',
      titleLeaves: 'Leaves',
      titleAppreciation: 'Appreciation / Escalation',
      titleRisk: 'Risk / Concern',
      showStaffing: true,
      showProductivity: true,
      showRoadmap: true,
      showDonePlanned: true,
      showAchieved: true,
      showLeaves: true,
      showAppreciation: true,
      showRisk: true,
      sectionOrder: DEFAULT_SECTION_ORDER,
      storyStateConfig: DEFAULT_STORY_STATES,
      bugStateConfig: DEFAULT_BUG_STATES,
      leaveTypeConfig: DEFAULT_LEAVE_TYPES,
    };
  }

  // ─── Weekly Report Notes ──────────────────────────────────────────────────

  async upsertWeeklyReport(dto: UpsertWeeklyReportDto, userId: string) {
    const weekOf = new Date(dto.weekOf);
    // Normalise to Monday midnight UTC
    const day = weekOf.getUTCDay();
    const diff = (day === 0 ? -6 : 1 - day);
    weekOf.setUTCDate(weekOf.getUTCDate() + diff);
    weekOf.setUTCHours(0, 0, 0, 0);

    const data = {
      teamId: dto.teamId ?? null,
      sprintRef: dto.sprintRef ?? null,
      ...(dto.noteDonePlanned !== undefined ? { noteDonePlanned: dto.noteDonePlanned } : {}),
      ...(dto.noteAchieved !== undefined ? { noteAchieved: dto.noteAchieved } : {}),
      ...(dto.noteAppreciation !== undefined ? { noteAppreciation: dto.noteAppreciation } : {}),
      ...(dto.noteRiskConcern !== undefined ? { noteRiskConcern: dto.noteRiskConcern } : {}),
      updatedBy: userId,
    };

    return this.prisma.weeklyReport.upsert({
      where: { projectId_weekOf: { projectId: dto.projectId, weekOf } },
      update: data,
      create: { projectId: dto.projectId, weekOf, ...data, createdBy: userId },
    });
  }

  async findWeeklyReports(query: WeeklyReportQueryDto) {
    const { projectId, teamId, from, to } = query;
    return this.prisma.weeklyReport.findMany({
      where: {
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(teamId ? { teamId } : {}),
        ...(from || to
          ? {
              weekOf: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { weekOf: 'desc' },
    });
  }

  async findWeeklyReportByWeek(projectId: string, weekOf: string) {
    const date = new Date(weekOf);
    const day = date.getUTCDay();
    const diff = (day === 0 ? -6 : 1 - day);
    date.setUTCDate(date.getUTCDate() + diff);
    date.setUTCHours(0, 0, 0, 0);

    return this.prisma.weeklyReport.findFirst({
      where: { projectId, weekOf: date, deletedAt: null },
    });
  }

  // ─── WSR Assembly — fetch all data for a given week ──────────────────────

  async assembleReport(projectId: string, weekOf: string, teamId?: string) {
    const weekStart = new Date(weekOf);
    const day = weekStart.getUTCDay();
    const diff = (day === 0 ? -6 : 1 - day);
    weekStart.setUTCDate(weekStart.getUTCDate() + diff);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    // Month bounds for headcount (entire month containing the week)
    const monthStart = new Date(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), 1);
    const monthEnd = new Date(weekStart.getUTCFullYear(), weekStart.getUTCMonth() + 1, 0);

    const [config, notes, headcount, sprintSnapshot, features, releases, leaves, risks] =
      await Promise.all([
        this.getConfig(projectId),

        this.prisma.weeklyReport.findFirst({
          where: { projectId, weekOf: weekStart, deletedAt: null },
        }),

        // Staffing — last 6 months of headcount records
        this.prisma.headcountRecord.findMany({
          where: {
            projectId,
            ...(teamId ? { teamId } : {}),
            period: { gte: new Date(monthStart.getFullYear(), monthStart.getMonth() - 5, 1), lte: monthEnd },
          },
          include: { team: { select: { id: true, name: true } } },
          orderBy: { period: 'asc' },
        }),

        // Sprint Productivity — most recent snapshot
        this.prisma.sprintStateSnapshot.findFirst({
          where: {
            deletedAt: null,
            projectId,
            ...(teamId ? { teamId } : {}),
          },
          orderBy: { snapshotDate: 'desc' },
          include: { team: { select: { id: true, name: true } }, sprint: { select: { id: true, name: true, number: true } } },
        }),

        // Roadmap — active/planned features and releases
        this.prisma.feature.findMany({
          where: {
            deletedAt: null,
            projectId,
            status: { notIn: ['CANCELLED'] },
          },
          include: {
            releasePlan: { select: { id: true, name: true, version: true, plannedStart: true, plannedEnd: true, status: true } },
            sprintCalendar: { select: { id: true, name: true } },
          },
          orderBy: { sortOrder: 'asc' },
        }),

        // Releases for Roadmap section
        this.prisma.releasePlan.findMany({
          where: {
            deletedAt: null,
            projectId,
            status: { notIn: ['CANCELLED'] },
          },
          include: {
            milestones: { orderBy: { plannedDate: 'asc' } },
          },
          orderBy: { plannedStart: 'asc' },
        }),

        // Leaves — overlapping with the week
        this.prisma.leaveRecord.findMany({
          where: {
            deletedAt: null,
            projectId,
            ...(teamId ? { teamId } : {}),
            startDate: { lte: weekEnd },
            endDate: { gte: weekStart },
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            team: { select: { id: true, name: true } },
          },
          orderBy: [{ startDate: 'asc' }, { user: { lastName: 'asc' } }],
        }),

        // Risks — AT_RISK or DELAYED releases and overdue milestones
        this.prisma.releasePlan.findMany({
          where: {
            deletedAt: null,
            projectId,
            status: { in: ['AT_RISK', 'DELAYED'] },
          },
          select: { id: true, name: true, version: true, status: true, plannedEnd: true },
        }),
      ]);

    return {
      meta: {
        projectId,
        weekOf: weekStart.toISOString(),
        teamId: teamId ?? null,
        generatedAt: new Date().toISOString(),
      },
      config,
      notes: notes ?? null,
      sections: {
        staffing: headcount,
        productivity: sprintSnapshot,
        roadmap: { features, releases },
        leaves,
        risks,
      },
    };
  }
}
