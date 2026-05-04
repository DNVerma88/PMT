import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveDto, LeaveQueryDto, UpdateLeaveDto } from './dto/leave.dto';

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeaveDto, createdBy: string) {
    return this.prisma.leaveRecord.create({
      data: {
        userId: dto.userId,
        projectId: dto.projectId ?? null,
        teamId: dto.teamId ?? null,
        leaveType: dto.leaveType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        halfDay: dto.halfDay ?? false,
        notes: dto.notes ?? null,
        createdBy,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(query: LeaveQueryDto) {
    const { projectId, teamId, userId, from, to } = query;

    // Overlap filter: leave starts before 'to' AND ends after 'from'
    const where = {
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
      ...(teamId ? { teamId } : {}),
      ...(userId ? { userId } : {}),
      ...(from || to
        ? {
            AND: [
              ...(to ? [{ startDate: { lte: new Date(to) } }] : []),
              ...(from ? [{ endDate: { gte: new Date(from) } }] : []),
            ],
          }
        : {}),
    };

    return this.prisma.leaveRecord.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { user: { lastName: 'asc' } }],
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.leaveRecord.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    });
    if (!record) throw new NotFoundException('Leave record not found');
    return record;
  }

  async update(id: string, dto: UpdateLeaveDto, updatedBy: string) {
    await this.findOne(id);
    return this.prisma.leaveRecord.update({
      where: { id },
      data: {
        ...(dto.userId ? { userId: dto.userId } : {}),
        ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),
        ...(dto.leaveType ? { leaveType: dto.leaveType } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.halfDay !== undefined ? { halfDay: dto.halfDay } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedBy,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.leaveRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
