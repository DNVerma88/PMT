import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateFeatureDto, createdById: string) {
    return this.prisma.feature.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        projectId: dto.projectId ?? null,
        teamId: dto.teamId ?? null,
        category: dto.category ?? null,
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status ?? 'PLANNED',
        releasePlanId: dto.releasePlanId ?? null,
        sprintCalendarId: dto.sprintCalendarId ?? null,
        phase1Label: dto.phase1Label ?? 'Development',
        phase1StartSprint: dto.phase1StartSprint ?? null,
        phase1EndSprint: dto.phase1EndSprint ?? null,
        phase1Color: dto.phase1Color ?? '#ff9800',
        phase2Label: dto.phase2Label ?? 'QA / Release',
        phase2StartSprint: dto.phase2StartSprint ?? null,
        phase2EndSprint: dto.phase2EndSprint ?? null,
        phase2Color: dto.phase2Color ?? '#4caf50',
        createdBy: createdById,
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(projectId?: string, sprintCalendarId?: string) {
    const where: Prisma.FeatureWhereInput = {
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
      ...(sprintCalendarId ? { sprintCalendarId } : {}),
    };
    return this.prisma.feature.findMany({
      where,
      include: this.defaultInclude(),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const feature = await this.prisma.feature.findFirst({
      where: { id, deletedAt: null },
      include: this.defaultInclude(),
    });
    if (!feature) throw new NotFoundException(`Feature ${id} not found`);
    return feature;
  }

  async update(id: string, dto: UpdateFeatureDto, updatedById: string) {
    await this.findOne(id);
    return this.prisma.feature.update({
      where: { id },
      data: { ...dto, updatedBy: updatedById },
      include: this.defaultInclude(),
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.prisma.feature.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Timeline ────────────────────────────────────────────────────────────────

  /**
   * Returns all features for a sprint calendar together with the full sprint list
   * and a month-grouped header structure — everything the frontend needs to render
   * the timeline grid in a single request.
   */
  async getTimeline(sprintCalendarId: string, projectId?: string) {
    const [calendar, features] = await Promise.all([
      this.prisma.sprintCalendar.findUnique({
        where: { id: sprintCalendarId },
        include: { sprints: { orderBy: { number: 'asc' } } },
      }),
      this.prisma.feature.findMany({
        where: {
          deletedAt: null,
          sprintCalendarId,
          ...(projectId ? { projectId } : {}),
        },
        include: this.defaultInclude(),
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);

    if (!calendar) throw new NotFoundException(`Sprint calendar ${sprintCalendarId} not found`);

    // Build month → sprint number groups for the column header
    const monthMap = new Map<
      string,
      { label: string; year: number; month: number; sprintNumbers: number[] }
    >();

    for (const sprint of calendar.sprints) {
      const d = new Date(sprint.startDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          label: d.toLocaleString('en', { month: 'short' }),
          year: d.getFullYear(),
          month: d.getMonth(),
          sprintNumbers: [],
        });
      }
      monthMap.get(key)!.sprintNumbers.push(sprint.number);
    }

    return {
      sprints: calendar.sprints.map((s) => ({
        id: s.id,
        number: s.number,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
      months: Array.from(monthMap.values()),
      features: features.map((f) => ({
        ...f,
        teamName: (f as any).team?.name ?? null,
        releasePlanName: (f as any).releasePlan
          ? `${(f as any).releasePlan.version} — ${(f as any).releasePlan.name}`
          : null,
      })),
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private defaultInclude() {
    return {
      team: { select: { id: true, name: true } },
      releasePlan: { select: { id: true, name: true, version: true } },
      sprintCalendar: { select: { id: true, name: true } },
    };
  }
}
