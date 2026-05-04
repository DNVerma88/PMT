import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Cross-project KPI summary ───────────────────────────────────────────────

  async getSummary() {
    const [
      totalProjects,
      activeProjects,
      totalReleases,
      totalMembers,
    ] = await Promise.all([
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.project.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.releasePlan.count({ where: { deletedAt: null } }),
      this.prisma.projectMember.count(),
    ]);

    const releaseStatusCounts = await this.prisma.releasePlan.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const milestoneStatusCounts = await this.prisma.releaseMilestone.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return {
      totalProjects,
      activeProjects,
      totalReleases,
      totalMembers,
      releaseStatusBreakdown: Object.fromEntries(
        releaseStatusCounts.map((r) => [r.status, r._count._all]),
      ),
      milestoneStatusBreakdown: Object.fromEntries(
        milestoneStatusCounts.map((m) => [m.status, m._count._all]),
      ),
    };
  }

  // ─── Release health matrix (per project) ────────────────────────────────────

  async getReleaseHealth() {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        releasePlans: {
          where: { deletedAt: null, parentId: null },
          select: {
            id: true,
            name: true,
            version: true,
            status: true,
            plannedEnd: true,
            actualEnd: true,
            milestones: {
              select: { type: true, status: true, plannedDate: true, actualDate: true },
            },
          },
          orderBy: { plannedEnd: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();

    return projects.map((project) => {
      const releases = project.releasePlans.map((r) => {
        const overdueMilestones = r.milestones.filter(
          (m) => m.status !== 'COMPLETED' && new Date(m.plannedDate) < now,
        ).length;

        return {
          id: r.id,
          name: r.name,
          version: r.version,
          status: r.status,
          plannedEnd: r.plannedEnd,
          actualEnd: r.actualEnd,
          totalMilestones: r.milestones.length,
          completedMilestones: r.milestones.filter((m) => m.status === 'COMPLETED').length,
          overdueMilestones,
          health:
            r.status === 'DELAYED'
              ? 'red'
              : r.status === 'AT_RISK' || overdueMilestones > 0
              ? 'amber'
              : 'green',
        };
      });

      return {
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        releases,
        overallHealth:
          releases.some((r) => r.health === 'red')
            ? 'red'
            : releases.some((r) => r.health === 'amber')
            ? 'amber'
            : 'green',
      };
    });
  }

  // ─── Headcount totals by project (last 3 periods) ───────────────────────────

  async getHeadcountSummary() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const records = await this.prisma.headcountRecord.findMany({
      where: { period: { gte: threeMonthsAgo } },
      select: {
        period: true,
        closingCount: true,
        plannedCount: true,
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { period: 'asc' },
    });

    // Aggregate by project + period
    const map = new Map<string, { projectId: string; projectName: string; projectCode: string; period: string; closing: number; planned: number }>();

    for (const r of records) {
      if (!r.project) continue;
      const key = `${r.project.id}::${r.period.toISOString().slice(0, 7)}`;
      const existing = map.get(key);
      const periodStr = r.period.toISOString().slice(0, 7);
      if (existing) {
        existing.closing += r.closingCount;
        existing.planned += r.plannedCount ?? 0;
      } else {
        map.set(key, {
          projectId: r.project.id,
          projectName: r.project.name,
          projectCode: r.project.code,
          period: periodStr,
          closing: r.closingCount,
          planned: r.plannedCount ?? 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  // ─── Productivity trend by project (last 3 months actual vs planned) ────────

  async getProductivityTrend() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const records = await this.prisma.productivityRecord.findMany({
      where: { period: { gte: threeMonthsAgo }, projectId: { not: null } },
      select: {
        period: true,
        planned: true,
        actual: true,
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { period: 'asc' },
    });

    const map = new Map<string, { projectId: string; projectName: string; projectCode: string; period: string; planned: number; actual: number }>();

    for (const r of records) {
      if (!r.project) continue;
      const key = `${r.project.id}::${r.period.toISOString().slice(0, 7)}`;
      const existing = map.get(key);
      const periodStr = r.period.toISOString().slice(0, 7);
      const planned = Number(r.planned ?? 0);
      const actual = Number(r.actual);
      if (existing) {
        existing.planned += planned;
        existing.actual += actual;
      } else {
        map.set(key, {
          projectId: r.project.id,
          projectName: r.project.name,
          projectCode: r.project.code,
          period: periodStr,
          planned,
          actual,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  // ─── Upcoming milestones across all projects (next 30 days) ─────────────────

  async getUpcomingMilestones(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const milestones = await this.prisma.releaseMilestone.findMany({
      where: {
        plannedDate: { gte: new Date(), lte: cutoff },
        status: { notIn: ['COMPLETED', 'SKIPPED'] as any },
      },
      include: {
        releasePlan: {
          select: {
            name: true,
            version: true,
            status: true,
            project: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { plannedDate: 'asc' },
      take: 50,
    });

    return milestones.map((m) => ({
      milestoneId: m.id,
      type: m.type,
      status: m.status,
      plannedDate: m.plannedDate,
      releaseName: m.releasePlan.name,
      releaseVersion: m.releasePlan.version,
      releaseStatus: m.releasePlan.status,
      project: m.releasePlan.project,
      daysUntilDue: Math.ceil((m.plannedDate.getTime() - Date.now()) / 86400000),
    }));
  }

  // ─── At-risk items (overdue milestones + delayed releases) ──────────────────

  async getRisks() {
    const now = new Date();

    const [overdueMilestones, delayedReleases] = await Promise.all([
      this.prisma.releaseMilestone.findMany({
        where: {
          plannedDate: { lt: now },
          status: { notIn: ['COMPLETED', 'SKIPPED'] as any },
        },
        include: {
          releasePlan: {
            select: {
              name: true,
              version: true,
              project: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { plannedDate: 'asc' },
        take: 50,
      }),
      this.prisma.releasePlan.findMany({
        where: {
          status: { in: ['DELAYED', 'AT_RISK'] as any },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          version: true,
          status: true,
          plannedEnd: true,
          project: { select: { id: true, name: true, code: true } },
        },
        orderBy: { plannedEnd: 'asc' },
        take: 50,
      }),
    ]);

    return {
      overdueMilestones: overdueMilestones.map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        plannedDate: m.plannedDate,
        release: m.releasePlan.name,
        version: m.releasePlan.version,
        project: m.releasePlan.project,
        daysOverdue: Math.ceil((Date.now() - m.plannedDate.getTime()) / 86400000),
      })),
      delayedReleases: delayedReleases.map((r) => ({
        id: r.id,
        name: r.name,
        version: r.version,
        status: r.status,
        plannedEnd: r.plannedEnd,
        project: r.project,
      })),
    };
  }
}
