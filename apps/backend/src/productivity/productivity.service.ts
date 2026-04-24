import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductivityRecordDto } from './dto/create-productivity-record.dto';
import { UpdateProductivityRecordDto } from './dto/update-productivity-record.dto';
import { ProductivityQueryDto } from './dto/productivity-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductivityService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Metric Definitions ─────────────────────────────────────────────────────

  async findAllMetricDefs() {
    return this.prisma.productivityMetricDefinition.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── Records CRUD ───────────────────────────────────────────────────────────

  async createRecord(dto: CreateProductivityRecordDto, createdById: string) {
    const metricDef = await this.prisma.productivityMetricDefinition.findUnique({
      where: { id: dto.metricDefId },
    });
    if (!metricDef) throw new NotFoundException(`Metric definition ${dto.metricDefId} not found`);

    return this.prisma.productivityRecord.create({
      data: {
        metricDefId: dto.metricDefId,
        projectId: dto.projectId ?? null,
        teamId: dto.teamId ?? null,
        sprintId: dto.sprintId ?? null,
        releasePlanId: dto.releasePlanId ?? null,
        role: dto.role ?? null,
        workType: dto.workType ?? null,
        period: new Date(dto.period),
        planned: dto.planned !== undefined ? dto.planned : null,
        actual: dto.actual,
        notes: dto.notes ?? null,
        createdBy: createdById,
      },
      include: {
        metricDef: true,
        team: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true, number: true } },
      },
    });
  }

  async findRecords(query: ProductivityQueryDto) {
    const {
      projectId,
      teamId,
      metricDefId,
      periodFrom,
      periodTo,
      workType,
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.ProductivityRecordWhereInput = {
      ...(projectId ? { projectId } : {}),
      ...(teamId ? { teamId } : {}),
      ...(metricDefId ? { metricDefId } : {}),
      ...(workType ? { workType } : {}),
      ...(periodFrom || periodTo
        ? {
            period: {
              gte: periodFrom ? new Date(periodFrom) : undefined,
              lte: periodTo ? new Date(periodTo) : undefined,
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      this.prisma.productivityRecord.findMany({
        where,
        include: {
          metricDef: { select: { id: true, name: true, key: true, unit: true } },
          team: { select: { id: true, name: true } },
          sprint: { select: { id: true, name: true, number: true } },
        },
        orderBy: { period: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.productivityRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findRecord(id: string) {
    const record = await this.prisma.productivityRecord.findUnique({
      where: { id },
      include: {
        metricDef: true,
        team: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true, number: true } },
      },
    });
    if (!record) throw new NotFoundException(`Productivity record ${id} not found`);
    return record;
  }

  async updateRecord(id: string, dto: UpdateProductivityRecordDto, updatedById: string) {
    await this.findRecord(id);
    return this.prisma.productivityRecord.update({
      where: { id },
      data: {
        ...(dto.metricDefId !== undefined ? { metricDefId: dto.metricDefId } : {}),
        ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),
        ...(dto.sprintId !== undefined ? { sprintId: dto.sprintId } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.workType !== undefined ? { workType: dto.workType } : {}),
        ...(dto.period !== undefined ? { period: new Date(dto.period) } : {}),
        ...(dto.planned !== undefined ? { planned: dto.planned } : {}),
        ...(dto.actual !== undefined ? { actual: dto.actual } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedBy: updatedById,
      },
      include: {
        metricDef: { select: { id: true, name: true, key: true, unit: true } },
        team: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true, number: true } },
      },
    });
  }

  async deleteRecord(id: string) {
    await this.findRecord(id);
    await this.prisma.productivityRecord.delete({ where: { id } });
  }

  // ── Aggregations ───────────────────────────────────────────────────────────

  async getVelocityTrend(projectId?: string, teamId?: string, metricKey?: string, sprintCount = 10) {
    const metricDef = metricKey
      ? await this.prisma.productivityMetricDefinition.findUnique({ where: { key: metricKey } })
      : null;

    const where: Prisma.ProductivityRecordWhereInput = {
      ...(projectId ? { projectId } : {}),
      ...(teamId ? { teamId } : {}),
      ...(metricDef ? { metricDefId: metricDef.id } : {}),
      sprintId: { not: null },
    };

    const records = await this.prisma.productivityRecord.findMany({
      where,
      include: {
        sprint: { select: { id: true, name: true, number: true, startDate: true, endDate: true } },
        metricDef: { select: { id: true, name: true, key: true, unit: true } },
      },
      orderBy: { period: 'desc' },
      take: sprintCount * 10,
    });

    // Group by sprint
    const bySprintMap = new Map<string, { sprint: any; planned: number; actual: number }>();
    for (const r of records) {
      if (!r.sprint) continue;
      const key = r.sprint.id;
      if (!bySprintMap.has(key)) {
        bySprintMap.set(key, { sprint: r.sprint, planned: 0, actual: 0 });
      }
      const entry = bySprintMap.get(key)!;
      entry.actual += Number(r.actual);
      if (r.planned) entry.planned += Number(r.planned);
    }

    return Array.from(bySprintMap.values())
      .sort((a, b) => a.sprint.number - b.sprint.number)
      .slice(-sprintCount);
  }

  async getWorkTypeBreakdown(projectId?: string, teamId?: string, periodFrom?: string, periodTo?: string) {
    const where: Prisma.ProductivityRecordWhereInput = {
      ...(projectId ? { projectId } : {}),
      ...(teamId ? { teamId } : {}),
      workType: { not: null },
      ...(periodFrom || periodTo
        ? { period: { gte: periodFrom ? new Date(periodFrom) : undefined, lte: periodTo ? new Date(periodTo) : undefined } }
        : {}),
    };

    const records = await this.prisma.productivityRecord.groupBy({
      by: ['workType'],
      where,
      _sum: { actual: true },
      _count: { _all: true },
    });

    return records.map((r) => ({
      workType: r.workType,
      totalActual: Number(r._sum.actual ?? 0),
      recordCount: r._count._all,
    }));
  }
}
