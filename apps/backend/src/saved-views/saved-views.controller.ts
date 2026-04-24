import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { SavedViewsService } from './saved-views.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';
import { ShareSavedViewDto } from './dto/share-saved-view.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Audit } from '../common/decorators/audit-action.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Saved Views')
@ApiCookieAuth('access_token')
@Controller({ path: 'saved-views', version: '1' })
export class SavedViewsController {
  constructor(private readonly service: SavedViewsService) {}

  @Post()
  @RequirePermissions('saved_views:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a new saved view' })
  async create(@Body() dto: CreateSavedViewDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermissions('saved_views:read')
  @ApiQuery({ name: 'module', required: false })
  @ApiOperation({ summary: 'List saved views accessible to the current user' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('module') module?: string,
  ) {
    return this.service.findAll(user.id, module);
  }

  @Get(':id')
  @RequirePermissions('saved_views:read')
  @ApiOperation({ summary: 'Get a saved view by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.service.findOne(id, user.id);
  }

  @Patch(':id')
  @RequirePermissions('saved_views:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a saved view' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedViewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('saved_views:delete')
  @Audit(AuditAction.SOFT_DELETE)
  @ApiOperation({ summary: 'Soft-delete a saved view' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    const isSuperAdmin = user.roles.includes('SUPER_ADMIN');
    await this.service.remove(id, user.id, isSuperAdmin);
  }

  @Post(':id/clone')
  @RequirePermissions('saved_views:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Clone a saved view (creates a private copy)' })
  async clone(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.service.clone(id, user.id);
  }

  @Post(':id/share')
  @RequirePermissions('saved_views:update')
  @ApiOperation({ summary: 'Share a saved view with another user' })
  async share(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShareSavedViewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.share(id, dto, user.id);
  }

  @Delete(':id/share/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('saved_views:update')
  @ApiOperation({ summary: 'Remove share access from a user' })
  async unshare(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.service.unshare(id, targetUserId, user.id);
  }
}
