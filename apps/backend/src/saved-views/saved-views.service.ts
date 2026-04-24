import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';
import { ShareSavedViewDto } from './dto/share-saved-view.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    sharedWith: {
      include: {
        // we'd join User here, but SavedViewShare doesn't have a User relation in schema
        // just return sharedWith as-is
      },
    },
  };

  async create(dto: CreateSavedViewDto, ownerId: string) {
    return this.prisma.savedView.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        module: dto.module,
        chartType: dto.chartType,
        config: dto.config as Prisma.InputJsonValue,
        isDefault: dto.isDefault ?? false,
        isPublic: dto.isPublic ?? false,
        ownerId,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(userId: string, module?: string) {
    return this.prisma.savedView.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { isPublic: true },
          { sharedWith: { some: { userId } } },
        ],
        ...(module ? { module } : {}),
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        sharedWith: true,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const view = await this.prisma.savedView.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        sharedWith: true,
      },
    });
    if (!view || view.deletedAt) throw new NotFoundException(`Saved view ${id} not found`);
    this.assertAccess(view, userId);
    return view;
  }

  async update(id: string, dto: UpdateSavedViewDto, userId: string) {
    const view = await this.findOne(id, userId);
    if (view.ownerId !== userId) {
      const share = view.sharedWith.find((s: any) => s.userId === userId);
      if (!share?.canEdit) throw new ForbiddenException('You do not have edit access to this view');
    }
    return this.prisma.savedView.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.chartType !== undefined ? { chartType: dto.chartType } : {}),
        ...(dto.config !== undefined ? { config: dto.config as Prisma.InputJsonValue } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        sharedWith: true,
      },
    });
  }

  async remove(id: string, userId: string, isSuperAdmin: boolean) {
    const view = await this.findOne(id, userId);
    if (!isSuperAdmin && view.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete a saved view');
    }
    await this.prisma.savedView.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async clone(id: string, userId: string): Promise<any> {
    const view = await this.findOne(id, userId);
    return this.prisma.savedView.create({
      data: {
        name: `${view.name} (copy)`,
        description: view.description,
        module: view.module,
        chartType: view.chartType,
        config: view.config as Prisma.InputJsonValue,
        isDefault: false,
        isPublic: false,
        ownerId: userId,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async share(id: string, dto: ShareSavedViewDto, requesterId: string) {
    const view = await this.findOne(id, requesterId);
    if (view.ownerId !== requesterId) {
      throw new ForbiddenException('Only the owner can share a saved view');
    }
    return this.prisma.savedViewShare.upsert({
      where: { savedViewId_userId: { savedViewId: id, userId: dto.userId } },
      create: { savedViewId: id, userId: dto.userId, canEdit: dto.canEdit ?? false },
      update: { canEdit: dto.canEdit ?? false },
    });
  }

  async unshare(id: string, targetUserId: string, requesterId: string) {
    const view = await this.findOne(id, requesterId);
    if (view.ownerId !== requesterId) {
      throw new ForbiddenException('Only the owner can manage shares');
    }
    await this.prisma.savedViewShare.deleteMany({
      where: { savedViewId: id, userId: targetUserId },
    });
  }

  private assertAccess(view: any, userId: string) {
    if (view.isPublic) return;
    if (view.ownerId === userId) return;
    const shared = view.sharedWith?.some((s: any) => s.userId === userId);
    if (!shared) throw new ForbiddenException('Access denied to this saved view');
  }
}
