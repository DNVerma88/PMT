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
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Audit } from '../common/decorators/audit-action.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Projects')
@ApiCookieAuth('access_token')
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  // ── Project CRUD ────────────────────────────────────────────────────────────

  @Post()
  @RequirePermissions('projects:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a new project (admin only)' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'List all projects' })
  findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'List projects the current user belongs to' })
  findMy(@CurrentUser() user: RequestUser) {
    return this.service.findForUser(user.id);
  }

  @Get(':id')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('projects:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update project (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user.id, user.roles ?? []);
  }

  @Delete(':id')
  @RequirePermissions('projects:delete')
  @Audit(AuditAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete project (admin only)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.softDelete(id, user.id, user.roles ?? []);
  }

  // ── Members ─────────────────────────────────────────────────────────────────

  @Get(':id/members')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'List members of a project' })
  listMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listMembers(id);
  }

  @Post(':id/members')
  @RequirePermissions('projects:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Add a user to a project' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.service.addMember(id, dto);
  }

  @Patch(':id/members/:userId')
  @RequirePermissions('projects:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a member role in a project' })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: string,
  ) {
    return this.service.updateMemberRole(id, userId, role);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('projects:update')
  @Audit(AuditAction.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user from a project' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.removeMember(id, userId);
  }
}
