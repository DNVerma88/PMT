import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(projectId?: string) {
    const now = new Date();
    const thirtyDaysOut = new Date(now);
    thirtyDaysOut.setDate(now.getDate() + 30);

    const where = projectId ? { projectId } : {};

    const [
      activeReleasesCount,
      upcomingMilestones,
      latestProductivityRecords,
      headcountStats,
      recentAuditLogs,
    ] = await Promise.all([
      // Active releases
      this.prisma.releasePlan.count({
        where: { ...where, status: 'IN_PROGRESS', deletedAt: null },
      }),

      // Milestones due in next 30 days
      this.prisma.releaseMilestone.findMany({
        where: {
          plannedDate: { gte: now, lte: thirtyDaysOut },
          status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
          ...(projectId
            ? { releasePlan: { projectId } }
            : {}),
        },
        include: {
          releasePlan: {
            select: {
              id: true,
              name: true,
              version: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { plannedDate: 'asc' },
        take: 10,
      }),

      // Latest productivity records (last 5)
      this.prisma.productivityRecord.findMany({
        where: { ...(projectId ? { projectId } : {}) },
        include: {
          metricDef: { select: { name: true, unit: true } },
          team: { select: { name: true } },
          sprint: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Current headcount summary
      this.prisma.headcountRecord.findFirst({
        where: { ...(projectId ? { projectId } : {}) },
        orderBy: { period: 'desc' },
        select: { period: true },
      }),

      // Recent audit activity
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          userId: true,
          createdAt: true,
        },
      }),
    ]);

    // Get headcount totals for the latest period
    let headcountSummary = { total: 0, added: 0, removed: 0, openRoles: 0 };
    if (headcountStats?.period) {
      const records = await this.prisma.headcountRecord.findMany({
        where: { period: headcountStats.period, ...(projectId ? { projectId } : {}) },
      });
      headcountSummary = {
        total: records.reduce((s, r) => s + r.closingCount, 0),
        added: records.reduce((s, r) => s + r.addedCount, 0),
        removed: records.reduce((s, r) => s + r.removedCount, 0),
        openRoles: records.reduce((s, r) => s + Math.max(0, (r.plannedCount ?? 0) - r.closingCount), 0),
      };
    }

    // Count releases by status
    const releasesByStatus = await this.prisma.releasePlan.groupBy({
      by: ['status'],
      where: { ...where, deletedAt: null },
      _count: { _all: true },
    });

    return {
      activeReleasesCount,
      releasesByStatus: releasesByStatus.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
      upcomingMilestones,
      latestProductivityRecords,
      headcountSummary,
      recentAuditLogs,
    };
  }
}
