import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Audit } from '../common/decorators/audit-action.decorator';
import type { RequestUser } from '../common/types/request-user.type';
import type { PaginatedResponse } from '../common/types/api.types';

@ApiTags('Users')
@ApiCookieAuth('access_token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermissions('users:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, currentUser.id);
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users with pagination and search' })
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get a single user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermissions('users:delete')
  @Audit(AuditAction.SOFT_DELETE)
  @ApiOperation({ summary: 'Soft-delete a user (Admin only)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    await this.usersService.softDelete(id, currentUser.id);
  }
}
