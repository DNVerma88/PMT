import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHeadcountRecordDto } from './dto/create-headcount-record.dto';
import { UpdateHeadcountRecordDto } from './dto/update-headcount-record.dto';
import { HeadcountQueryDto } from './dto/headcount-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class HeadcountService {
  constructor(private readonly prisma: PrismaService) {}

  async createRecord(dto: CreateHeadcountRecordDto, createdById: string) {
    return this.prisma.headcountRecord.create({
      data: {
        projectId: dto.projectId ?? null,
        teamId: dto.teamId ?? null,
        role: dto.role ?? null,
        period: new Date(dto.period),
        openingCount: dto.openingCount,
        addedCount: dto.addedCount ?? 0,
        removedCount: dto.removedCount ?? 0,
        closingCount: dto.closingCount,
        plannedCount: dto.plannedCount ?? null,
        notes: dto.notes ?? null,
        createdBy: createdById,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    });
  }

  async findRecords(query: HeadcountQueryDto) {
    const { projectId, teamId, periodFrom, periodTo, page = 1, limit = 100 } = query;

    const where: Prisma.HeadcountRecordWhereInput = {
      ...(projectId ? { projectId } : {}),
      ...(teamId ? { teamId } : {}),
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
      this.prisma.headcountRecord.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: [{ period: 'asc' }, { team: { name: 'asc' } }],
        skip,
        take: limit,
      }),
      this.prisma.headcountRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findRecord(id: string) {
    const record = await this.prisma.headcountRecord.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    });
    if (!record) throw new NotFoundException(`Headcount record ${id} not found`);
    return record;
  }

  async updateRecord(id: string, dto: UpdateHeadcountRecordDto, updatedById: string) {
    await this.findRecord(id);
    return this.prisma.headcountRecord.update({
      where: { id },
      data: {
        ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.period !== undefined ? { period: new Date(dto.period) } : {}),
        ...(dto.openingCount !== undefined ? { openingCount: dto.openingCount } : {}),
        ...(dto.addedCount !== undefined ? { addedCount: dto.addedCount } : {}),
        ...(dto.removedCount !== undefined ? { removedCount: dto.removedCount } : {}),
        ...(dto.closingCount !== undefined ? { closingCount: dto.closingCount } : {}),
        ...(dto.plannedCount !== undefined ? { plannedCount: dto.plannedCount } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedBy: updatedById,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    });
  }

  async deleteRecord(id: string) {
    await this.findRecord(id);
    await this.prisma.headcountRecord.delete({ where: { id } });
  }

  // ── Aggregations ───────────────────────────────────────────────────────────

  async getTimeSeries(projectId?: string, teamId?: string, periodFrom?: string, periodTo?: string) {
    const where: Prisma.HeadcountRecordWhereInput = {
      ...(projectId ? { projectId } : {}),
      ...(teamId ? { teamId } : {}),
      ...(periodFrom || periodTo
        ? { period: { gte: periodFrom ? new Date(periodFrom) : undefined, lte: periodTo ? new Date(periodTo) : undefined } }
        : {}),
    };

    const records = await this.prisma.headcountRecord.findMany({
      where,
      include: { team: { select: { id: true, name: true } } },
      orderBy: { period: 'asc' },
    });

    // Group by period, aggregate across teams
    const byPeriod = new Map<string, { period: Date; opening: number; closing: number; added: number; removed: number; planned: number }>();
    for (const r of records) {
      const key = r.period.toISOString().slice(0, 7);
      if (!byPeriod.has(key)) {
        byPeriod.set(key, { period: r.period, opening: 0, closing: 0, added: 0, removed: 0, planned: 0 });
      }
      const entry = byPeriod.get(key)!;
      entry.opening += r.openingCount;
      entry.closing += r.closingCount;
      entry.added += r.addedCount;
      entry.removed += r.removedCount;
      entry.planned += r.plannedCount ?? 0;
    }

    return Array.from(byPeriod.values());
  }

  async getWaterfallData(projectId?: string, teamId?: string, periodFrom?: string, periodTo?: string) {
    const series = await this.getTimeSeries(projectId, teamId, periodFrom, periodTo);
    return series.map((s, i) => ({
      period: s.period,
      opening: s.opening,
      added: s.added,
      removed: s.removed,
      closing: s.closing,
      netChange: s.added - s.removed,
      planned: s.planned,
    }));
  }

  async getTeamBreakdown(projectId?: string, period?: string) {
    const targetPeriod = period ? new Date(period) : undefined;
    const where: Prisma.HeadcountRecordWhereInput = {
      ...(projectId ? { projectId } : {}),
      ...(targetPeriod ? { period: targetPeriod } : {}),
    };

    return this.prisma.headcountRecord.groupBy({
      by: ['teamId'],
      where,
      _sum: { closingCount: true, plannedCount: true },
    });
  }

  async getSummaryStats(projectId?: string) {
    const latestPeriod = await this.prisma.headcountRecord.findFirst({
      where: projectId ? { projectId } : undefined,
      orderBy: { period: 'desc' },
      select: { period: true },
    });

    if (!latestPeriod) return { total: 0, added: 0, removed: 0, planned: 0, openRoles: 0 };

    const records = await this.prisma.headcountRecord.findMany({
      where: {
        period: latestPeriod.period,
        ...(projectId ? { projectId } : {}),
      },
    });

    const total = records.reduce((sum, r) => sum + r.closingCount, 0);
    const added = records.reduce((sum, r) => sum + r.addedCount, 0);
    const removed = records.reduce((sum, r) => sum + r.removedCount, 0);
    const planned = records.reduce((sum, r) => sum + (r.plannedCount ?? 0), 0);
    const openRoles = Math.max(0, planned - total);

    return { total, added, removed, planned, openRoles, period: latestPeriod.period };
  }
}
