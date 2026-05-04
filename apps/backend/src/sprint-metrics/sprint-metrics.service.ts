import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSprintSnapshotDto,
  SprintSnapshotQueryDto,
  UpdateSprintSnapshotDto,
} from './dto/sprint-metrics.dto';

@Injectable()
export class SprintMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSprintSnapshotDto, userId: string) {
    return this.prisma.sprintStateSnapshot.create({
      data: {
        projectId: dto.projectId ?? null,
        teamId: dto.teamId ?? null,
        sprintId: dto.sprintId ?? null,
        snapshotDate: new Date(dto.snapshotDate),
        sprintName: dto.sprintName ?? null,
        storyStateCounts: dto.storyStateCounts,
        bugStateCounts: dto.bugStateCounts,
        bugCountAtSprintStart: dto.bugCountAtSprintStart ?? null,
        notes: dto.notes ?? null,
        createdBy: userId,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true, number: true } },
      },
    });
  }

  async findAll(query: SprintSnapshotQueryDto) {
    const { projectId, teamId, sprintId, from, to, page = 1, limit = 50 } = query;

    const where = {
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
      ...(teamId ? { teamId } : {}),
      ...(sprintId ? { sprintId } : {}),
      ...(from || to
        ? {
            snapshotDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.sprintStateSnapshot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { snapshotDate: 'desc' },
        include: {
          project: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true } },
          sprint: { select: { id: true, name: true, number: true } },
        },
      }),
      this.prisma.sprintStateSnapshot.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** Get the most recent snapshot for a project/team */
  async findLatest(projectId?: string, teamId?: string) {
    return this.prisma.sprintStateSnapshot.findFirst({
      where: {
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(teamId ? { teamId } : {}),
      },
      orderBy: { snapshotDate: 'desc' },
      include: {
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true, number: true } },
      },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.sprintStateSnapshot.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true, number: true } },
      },
    });
    if (!record) throw new NotFoundException('Sprint snapshot not found');
    return record;
  }

  async update(id: string, dto: UpdateSprintSnapshotDto, userId: string) {
    await this.findOne(id);
    return this.prisma.sprintStateSnapshot.update({
      where: { id },
      data: {
        ...(dto.snapshotDate ? { snapshotDate: new Date(dto.snapshotDate) } : {}),
        ...(dto.sprintName !== undefined ? { sprintName: dto.sprintName } : {}),
        ...(dto.storyStateCounts !== undefined ? { storyStateCounts: dto.storyStateCounts } : {}),
        ...(dto.bugStateCounts !== undefined ? { bugStateCounts: dto.bugStateCounts } : {}),
        ...(dto.bugCountAtSprintStart !== undefined ? { bugCountAtSprintStart: dto.bugCountAtSprintStart } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedBy: userId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sprintStateSnapshot.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
