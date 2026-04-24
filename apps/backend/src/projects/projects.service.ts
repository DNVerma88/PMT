import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Verify caller is ADMIN member of the project OR has the system ADMIN role.
   *  Throws ForbiddenException if neither is true.  */
  private async assertProjectAdmin(
    projectId: string,
    callerId: string,
    callerRoles: string[],
  ): Promise<void> {
    if (callerRoles.includes('ADMIN')) return; // system admin bypasses check

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: callerId } },
    });
    if (!membership || membership.role !== 'ADMIN') {
      throw new ForbiddenException('You must be a project admin to perform this action');
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateProjectDto, createdById: string) {
    const existing = await this.prisma.project.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }], deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('A project with that name or code already exists');
    }
    return this.prisma.project.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        createdBy: createdById,
      },
      include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { members: true, teams: true, releasePlans: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { members: true, teams: true, releasePlans: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        teams: { where: { deletedAt: null } },
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  /** Return only projects the given user is a member of */
  async findForUser(userId: string) {
    return this.prisma.project.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        members: { some: { userId } },
      },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    updatedById: string,
    callerRoles: string[] = [],
  ) {
    await this.findOne(id);
    await this.assertProjectAdmin(id, updatedById, callerRoles);
    return this.prisma.project.update({
      where: { id },
      data: { ...dto, updatedBy: updatedById },
      include: { _count: { select: { members: true } } },
    });
  }

  async softDelete(id: string, callerId: string, callerRoles: string[] = []) {
    await this.findOne(id);
    await this.assertProjectAdmin(id, callerId, callerRoles);

    const now = new Date();
    // Cascade soft-delete: deactivate teams and release plans in a transaction
    await this.prisma.$transaction([
      this.prisma.team.updateMany({
        where: { projectId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.releasePlan.updateMany({
        where: { projectId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.project.update({
        where: { id },
        data: { deletedAt: now },
      }),
    ]);
  }

  // ── Members ─────────────────────────────────────────────────────────────────

  async addMember(projectId: string, dto: AddProjectMemberDto) {
    await this.findOne(projectId);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException('User is already a member of this project');

    return this.prisma.projectMember.create({
      data: { projectId, userId: dto.userId, role: dto.role ?? 'MEMBER' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async updateMemberRole(projectId: string, userId: string, role: string) {
    await this.findOne(projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found in this project');
    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    await this.findOne(projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found in this project');
    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async listMembers(projectId: string) {
    await this.findOne(projectId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
