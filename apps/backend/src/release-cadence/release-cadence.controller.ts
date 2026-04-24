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
import { ReleaseCadenceService } from './release-cadence.service';
import { CreateSprintCalendarDto } from './dto/create-sprint-calendar.dto';
import { ExtendSprintCalendarDto } from './dto/extend-sprint-calendar.dto';
import { CreateReleasePlanDto } from './dto/create-release-plan.dto';
import { UpdateReleasePlanDto } from './dto/update-release-plan.dto';
import { CreateReleaseMilestoneDto } from './dto/create-release-milestone.dto';
import { UpdateReleaseMilestoneDto } from './dto/update-release-milestone.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Audit } from '../common/decorators/audit-action.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Release Cadence')
@ApiCookieAuth('access_token')
@Controller({ path: 'release-cadence', version: '1' })
export class ReleaseCadenceController {
  constructor(private readonly service: ReleaseCadenceService) {}

  // ── Sprint Calendars ───────────────────────────────────────────────────────

  @Post('sprint-calendars')
  @RequirePermissions('release_cadence:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a sprint calendar with auto-generated sprints' })
  async createSprintCalendar(
    @Body() dto: CreateSprintCalendarDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createSprintCalendar(dto, user.id);
  }

  @Get('sprint-calendars')
  @RequirePermissions('release_cadence:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOperation({ summary: 'List all sprint calendars' })
  async findAllSprintCalendars(@Query('projectId') projectId?: string) {
    return this.service.findAllSprintCalendars(projectId);
  }

  @Get('sprint-calendars/:id')
  @RequirePermissions('release_cadence:read')
  @ApiOperation({ summary: 'Get sprint calendar by ID' })
  async findSprintCalendar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findSprintCalendar(id);
  }

  @Post('sprint-calendars/:id/extend')
  @RequirePermissions('release_cadence:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Append additional sprints to an existing calendar' })
  async extendSprintCalendar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendSprintCalendarDto,
  ) {
    return this.service.extendSprintCalendar(id, dto.count);
  }

  // ── Release Plans ──────────────────────────────────────────────────────────

  @Post('release-plans')
  @RequirePermissions('release_cadence:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a release plan' })
  async createReleasePlan(
    @Body() dto: CreateReleasePlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createReleasePlan(dto, user.id);
  }

  @Get('release-plans')
  @RequirePermissions('release_cadence:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['MAJOR', 'MINOR'] })
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({ summary: 'List release plans (top-level with nested children)' })
  async findAllReleasePlans(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAllReleasePlans(projectId, type, status);
  }

  @Get('release-plans/gantt')
  @RequirePermissions('release_cadence:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOperation({ summary: 'Gantt chart data: hierarchical release plans with milestones' })
  async getGanttData(
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getGanttData(projectId, startDate, endDate);
  }

  @Get('release-plans/:id')
  @RequirePermissions('release_cadence:read')
  @ApiOperation({ summary: 'Get release plan by ID' })
  async findReleasePlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findReleasePlan(id);
  }

  @Patch('release-plans/:id')
  @RequirePermissions('release_cadence:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a release plan' })
  async updateReleasePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReleasePlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateReleasePlan(id, dto, user.id);
  }

  @Delete('release-plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('release_cadence:delete')
  @Audit(AuditAction.SOFT_DELETE)
  @ApiOperation({ summary: 'Soft-delete a release plan' })
  async deleteReleasePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.service.softDeleteReleasePlan(id, user.id);
  }

  // ── Milestones ─────────────────────────────────────────────────────────────

  @Post('milestones')
  @RequirePermissions('release_cadence:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a milestone for a release plan' })
  async createMilestone(
    @Body() dto: CreateReleaseMilestoneDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createMilestone(dto, user.id);
  }

  @Patch('milestones/:id')
  @RequirePermissions('release_cadence:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a milestone' })
  async updateMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReleaseMilestoneDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateMilestone(id, dto, user.id);
  }

  @Delete('milestones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('release_cadence:delete')
  @Audit(AuditAction.DELETE)
  @ApiOperation({ summary: 'Delete a milestone' })
  async deleteMilestone(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.deleteMilestone(id);
  }
}
