import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoadmapService {
  constructor(private readonly prisma: PrismaService) {}

  async getGanttData(projectId?: string, startDate?: string, endDate?: string, status?: string) {
    const where: Prisma.ReleasePlanWhereInput = {
      deletedAt: null,
      parentId: null,
      ...(projectId ? { projectId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(startDate || endDate
        ? {
            OR: [
              { plannedStart: { gte: startDate ? new Date(startDate) : undefined } },
              { plannedEnd: { lte: endDate ? new Date(endDate) : undefined } },
            ],
          }
        : {}),
    };

    const plans = await this.prisma.releasePlan.findMany({
      where,
      include: {
        milestones: { orderBy: { plannedDate: 'asc' } },
        children: {
          where: { deletedAt: null },
          include: {
            milestones: { orderBy: { plannedDate: 'asc' } },
            team: { select: { id: true, name: true } },
          },
          orderBy: { plannedStart: 'asc' },
        },
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { plannedStart: 'asc' },
    });

    return this.buildGanttRows(plans);
  }

  private buildGanttRows(plans: any[]): GanttRow[] {
    const rows: GanttRow[] = [];

    for (const plan of plans) {
      const majorRow: GanttRow = {
        id: plan.id,
        name: `${plan.version} — ${plan.name}`,
        type: 'major',
        status: plan.status,
        plannedStart: plan.plannedStart,
        plannedEnd: plan.plannedEnd,
        actualStart: plan.actualStart,
        actualEnd: plan.actualEnd,
        projectId: plan.projectId,
        projectName: plan.project?.name,
        teamId: plan.teamId,
        teamName: plan.team?.name,
        milestones: plan.milestones,
        children: [],
      };

      for (const child of plan.children ?? []) {
        majorRow.children!.push({
          id: child.id,
          name: `${child.version} — ${child.name}`,
          type: 'minor',
          status: child.status,
          plannedStart: child.plannedStart,
          plannedEnd: child.plannedEnd,
          actualStart: child.actualStart,
          actualEnd: child.actualEnd,
          projectId: plan.projectId,
          projectName: plan.project?.name,
          teamId: child.teamId,
          teamName: child.team?.name,
          milestones: child.milestones,
          children: [],
        });
      }

      rows.push(majorRow);
    }

    return rows;
  }

  async getSummary(projectId?: string) {
    const where: Prisma.ReleasePlanWhereInput = {
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
    };

    const [total, byStatus, upcoming] = await Promise.all([
      this.prisma.releasePlan.count({ where }),
      this.prisma.releasePlan.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.releasePlan.findMany({
        where: { ...where, plannedEnd: { gte: new Date() } },
        orderBy: { plannedEnd: 'asc' },
        take: 5,
        select: {
          id: true,
          name: true,
          version: true,
          status: true,
          plannedEnd: true,
          project: { select: { name: true } },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((g) => ({ status: g.status, count: g._count._all })),
      upcoming,
    };
  }
}

export interface GanttRow {
  id: string;
  name: string;
  type: 'major' | 'minor';
  status: string;
  plannedStart: Date;
  plannedEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  projectId: string;
  projectName?: string;
  teamId: string | null;
  teamName?: string;
  milestones: any[];
  children?: GanttRow[];
}
