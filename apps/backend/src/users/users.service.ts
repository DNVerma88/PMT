import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import type { PaginatedResponse } from '../common/types/api.types';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, createdById: string): Promise<UserResponseDto> {
    // Check for duplicate email/username
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'username';
      throw new ConflictException(`A user with that ${field} already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: dto.status ?? 'ACTIVE',
        createdBy: createdById,
        userRoles: dto.roleIds?.length
          ? {
              create: dto.roleIds.map((roleId) => ({
                roleId,
                grantedBy: createdById,
              })),
            }
          : undefined,
      },
      include: { userRoles: { include: { role: true } } },
    });

    return this.toResponseDto(user);
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<UserResponseDto>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { userRoles: { include: { role: true } } },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => this.toResponseDto(u)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) throw new NotFoundException('User not found');
    return this.toResponseDto(user);
  }

  async softDelete(id: string, deletedById: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    if (user.id === deletedById) throw new BadRequestException('Cannot delete your own account');

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedById, status: 'INACTIVE' },
    });
  }

  private toResponseDto(
    user: Prisma.UserGetPayload<{ include: { userRoles: { include: { role: true } } } }>,
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.name),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
