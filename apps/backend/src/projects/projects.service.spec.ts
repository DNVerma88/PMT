import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProject = {
  id: 'project-uuid-1',
  name: 'Test Project',
  code: 'TST',
  description: null,
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  headcountPastMonths: 6,
  headcountFutureMonths: 3,
  members: [],
  _count: { members: 0, teams: 0, releasePlans: 0 },
};

const prismaServiceMock = {
  project: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  projectMember: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  team: {
    updateMany: jest.fn(),
  },
  releasePlan: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ConflictException if project with same name/code exists', async () => {
      prismaServiceMock.project.findFirst.mockResolvedValueOnce(mockProject);
      await expect(
        service.create({ name: 'Test Project', code: 'TST' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create project when no conflict', async () => {
      prismaServiceMock.project.findFirst.mockResolvedValueOnce(null);
      prismaServiceMock.project.create.mockResolvedValueOnce(mockProject);
      const result = await service.create({ name: 'New', code: 'NEW' }, 'user-1');
      expect(result).toEqual(mockProject);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if caller is not project ADMIN', async () => {
      prismaServiceMock.project.findFirst.mockResolvedValueOnce(mockProject);
      // Not a member
      prismaServiceMock.projectMember.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.update('project-uuid-1', { name: 'Updated' }, 'user-2', ['USER']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow system ADMIN to update without membership', async () => {
      prismaServiceMock.project.findFirst.mockResolvedValueOnce(mockProject);
      prismaServiceMock.project.update.mockResolvedValueOnce(mockProject);
      const result = await service.update('project-uuid-1', { name: 'Updated' }, 'user-1', ['ADMIN']);
      expect(result).toEqual(mockProject);
    });
  });

  describe('softDelete', () => {
    it('should cascade soft-delete teams and release plans in transaction', async () => {
      prismaServiceMock.project.findFirst.mockResolvedValueOnce(mockProject);
      prismaServiceMock.projectMember.findUnique.mockResolvedValueOnce({
        role: 'ADMIN',
      });
      prismaServiceMock.team.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaServiceMock.releasePlan.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaServiceMock.project.update.mockResolvedValueOnce(mockProject);

      await service.softDelete('project-uuid-1', 'user-1', []);
      expect(prismaServiceMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException for unknown id', async () => {
      prismaServiceMock.project.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
