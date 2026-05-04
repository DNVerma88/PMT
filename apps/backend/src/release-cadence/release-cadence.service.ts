import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSprintCalendarDto } from './dto/create-sprint-calendar.dto';
import { CreateReleasePlanDto } from './dto/create-release-plan.dto';
import { UpdateReleasePlanDto } from './dto/update-release-plan.dto';
import { CreateReleaseMilestoneDto } from './dto/create-release-milestone.dto';
import { UpdateReleaseMilestoneDto } from './dto/update-release-milestone.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReleaseCadenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Sprint Calendars ───────────────────────────────────────────────────────

  async createSprintCalendar(dto: CreateSprintCalendarDto, createdById: string) {
    const sprint1Start = new Date(dto.startDate);
    const sprint1End   = new Date(dto.firstSprintEnd);

    // Calendar-day interval between sprint start and end (inclusive)
    const intervalMs   = sprint1End.getTime() - sprint1Start.getTime();
    const intervalDays = Math.round(intervalMs / 86_400_000) + 1; // inclusive

    if (intervalDays < 1) {
      throw new BadRequestException('firstSprintEnd must be on or after startDate');
    }

    const sprintCalendar = await this.prisma.sprintCalendar.create({
      data: {
        name: dto.name,
        projectId: dto.projectId ?? null,
        startDate: sprint1Start,
        sprintLength: intervalDays, // store actual calendar span
        codeFreezeOffset:    dto.codeFreezeOffset    ?? null,
        regressionOffset:    dto.regressionOffset    ?? null,
        regressionEndOffset: dto.regressionEndOffset ?? null,
        goNoGoOffset:        dto.goNoGoOffset        ?? null,
        sprints: {
          create: Array.from({ length: dto.sprintCount }, (_, i) => {
            const sprintStart = new Date(sprint1Start);
            sprintStart.setDate(sprint1Start.getDate() + i * intervalDays);
            const sprintEnd = new Date(sprint1End);
            sprintEnd.setDate(sprint1End.getDate() + i * intervalDays);
            return {
              name: `Sprint ${i + 1}`,
              number: i + 1,
              startDate: sprintStart,
              endDate: sprintEnd,
            };
          }),
        },
      },
      include: { sprints: { orderBy: { number: 'asc' } } },
    });

    return sprintCalendar;
  }

  async findAllSprintCalendars(projectId?: string) {
    return this.prisma.sprintCalendar.findMany({
      where: projectId ? { projectId } : undefined,
      include: { sprints: { orderBy: { number: 'asc' } } },
      orderBy: { startDate: 'asc' },
    });
  }

  async findSprintCalendar(id: string) {
    const calendar = await this.prisma.sprintCalendar.findUnique({
      where: { id },
      include: { sprints: { orderBy: { number: 'asc' } } },
    });
    if (!calendar) throw new NotFoundException(`Sprint calendar ${id} not found`);
    return calendar;
  }

  async extendSprintCalendar(id: string, count: number) {
    const calendar = await this.findSprintCalendar(id);
    const sprints = calendar.sprints;
    if (!sprints.length) throw new NotFoundException('Calendar has no sprints to extend from');

    const last      = sprints[sprints.length - 1];
    const interval  = calendar.sprintLength;   // inclusive calendar days per sprint
    const lastEndMs = new Date(last.endDate).getTime();
    const nextNum   = last.number + 1;

    await this.prisma.sprint.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        name:      `Sprint ${nextNum + i}`,
        number:    nextNum + i,
        // each new sprint starts 1 day after the previous one ends
        startDate: new Date(lastEndMs + (1 + i * interval) * 86_400_000),
        endDate:   new Date(lastEndMs + ((i + 1) * interval) * 86_400_000),
        sprintCalendarId: id,
      })),
    });

    return this.findSprintCalendar(id);
  }

  // ── Release Plans ──────────────────────────────────────────────────────────

  async createReleasePlan(dto: CreateReleasePlanDto, createdById: string) {
    if (dto.type === 'MINOR' && dto.parentId) {
      const parent = await this.prisma.releasePlan.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.deletedAt) {
        throw new NotFoundException(`Parent release plan ${dto.parentId} not found`);
      }
    }

    try {
      return await this.prisma.releasePlan.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          version: dto.version,
          type: dto.type,
          status: dto.status ?? 'DRAFT',
          projectId: dto.projectId ?? null,
          teamId: dto.teamId ?? null,
          cadenceMode: dto.cadenceMode ?? 'DATE_RANGE',
          plannedStart: new Date(dto.plannedStart),
          plannedEnd: new Date(dto.plannedEnd),
          actualStart: dto.actualStart ? new Date(dto.actualStart) : null,
          actualEnd: dto.actualEnd ? new Date(dto.actualEnd) : null,
          parentId: dto.parentId ?? null,
          createdBy: createdById,
        },
        include: {
          milestones: { orderBy: { plannedDate: 'asc' } },
          children: {
            where: { deletedAt: null },
            include: { milestones: { orderBy: { plannedDate: 'asc' } } },
          },
          project: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Version ${dto.version} already exists in this project`);
      }
      throw e;
    }
  }

  async findAllReleasePlans(projectId?: string, type?: string, status?: string) {
    const where: Prisma.ReleasePlanWhereInput = {
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
      ...(type ? { type: type as any } : {}),
      ...(status ? { status: status as any } : {}),
      parentId: null, // top-level only; children embedded via `children` relation
    };

    return this.prisma.releasePlan.findMany({
      where,
      include: {
        milestones: { orderBy: { plannedDate: 'asc' } },
        children: {
          where: { deletedAt: null },
          include: { milestones: { orderBy: { plannedDate: 'asc' } } },
          orderBy: { plannedStart: 'asc' },
        },
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { plannedStart: 'asc' },
    });
  }

  async findReleasePlan(id: string) {
    const plan = await this.prisma.releasePlan.findUnique({
      where: { id },
      include: {
        milestones: { orderBy: { plannedDate: 'asc' } },
        children: {
          where: { deletedAt: null },
          include: { milestones: { orderBy: { plannedDate: 'asc' } } },
          orderBy: { plannedStart: 'asc' },
        },
        parent: { select: { id: true, name: true, version: true } },
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    });
    if (!plan || plan.deletedAt) throw new NotFoundException(`Release plan ${id} not found`);
    return plan;
  }

  async updateReleasePlan(id: string, dto: UpdateReleasePlanDto, updatedById: string) {
    const existing = await this.findReleasePlan(id);
    try {
      const updated = await this.prisma.releasePlan.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.version !== undefined ? { version: dto.version } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),
          ...(dto.cadenceMode !== undefined ? { cadenceMode: dto.cadenceMode } : {}),
          ...(dto.plannedStart !== undefined ? { plannedStart: new Date(dto.plannedStart) } : {}),
          ...(dto.plannedEnd !== undefined ? { plannedEnd: new Date(dto.plannedEnd) } : {}),
          ...(dto.actualStart !== undefined ? { actualStart: dto.actualStart ? new Date(dto.actualStart) : null } : {}),
          ...(dto.actualEnd !== undefined ? { actualEnd: dto.actualEnd ? new Date(dto.actualEnd) : null } : {}),
          updatedBy: updatedById,
        },
        include: {
          milestones: { orderBy: { plannedDate: 'asc' } },
          project: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true } },
        },
      });

      // Fire notification if status changed to DELAYED or AT_RISK
      if (dto.status && dto.status !== existing.status) {
        this.notifications
          .onReleaseStatusChanged(
            updated.id,
            updated.name,
            updated.version,
            updated.projectId,
            dto.status,
          )
          .catch(() => undefined);
      }

      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Version already exists in this project');
      }
      throw e;
    }
  }

  async softDeleteReleasePlan(id: string, deletedById: string) {
    await this.findReleasePlan(id);
    await this.prisma.releasePlan.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedById },
    });
  }

  // ── Release Milestones ─────────────────────────────────────────────────────

  async createMilestone(dto: CreateReleaseMilestoneDto, createdById: string) {
    await this.findReleasePlan(dto.releasePlanId);
    try {
      return await this.prisma.releaseMilestone.create({
        data: {
          releasePlanId: dto.releasePlanId,
          type: dto.type,
          status: dto.status ?? 'NOT_STARTED',
          plannedDate: new Date(dto.plannedDate),
          actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
          notes: dto.notes ?? null,
          createdBy: createdById,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A milestone of this type already exists for this release');
      }
      throw e;
    }
  }

  async updateMilestone(id: string, dto: UpdateReleaseMilestoneDto, updatedById: string) {
    const existing = await this.prisma.releaseMilestone.findUnique({
      where: { id },
      include: { releasePlan: { select: { id: true, name: true, version: true, projectId: true } } },
    });
    if (!existing) throw new NotFoundException(`Milestone ${id} not found`);

    const updated = await this.prisma.releaseMilestone.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.plannedDate !== undefined ? { plannedDate: new Date(dto.plannedDate) } : {}),
        ...(dto.actualDate !== undefined ? { actualDate: dto.actualDate ? new Date(dto.actualDate) : null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedBy: updatedById,
      },
    });

    // Fire notification when status changes
    if (dto.status && dto.status !== existing.status) {
      this.notifications
        .onMilestoneStatusChanged(
          id,
          existing.type,
          existing.releasePlan.name,
          existing.releasePlan.version,
          existing.releasePlan.projectId,
          dto.status,
        )
        .catch(() => undefined);
    }

    return updated;
  }

  async deleteMilestone(id: string) {
    const existing = await this.prisma.releaseMilestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Milestone ${id} not found`);
    await this.prisma.releaseMilestone.delete({ where: { id } });
  }

  // ── Gantt aggregation ──────────────────────────────────────────────────────

  async getGanttData(projectId?: string, startDate?: string, endDate?: string) {
    const where: Prisma.ReleasePlanWhereInput = {
      deletedAt: null,
      parentId: null,
      ...(projectId ? { projectId } : {}),
      ...(startDate || endDate
        ? {
            OR: [
              {
                plannedStart: {
                  gte: startDate ? new Date(startDate) : undefined,
                  lte: endDate ? new Date(endDate) : undefined,
                },
              },
              {
                plannedEnd: {
                  gte: startDate ? new Date(startDate) : undefined,
                },
              },
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
          include: { milestones: { orderBy: { plannedDate: 'asc' } } },
          orderBy: { plannedStart: 'asc' },
        },
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { plannedStart: 'asc' },
    });

    return plans;
  }
}
