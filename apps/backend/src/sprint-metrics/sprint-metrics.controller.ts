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
import { SprintMetricsService } from './sprint-metrics.service';
import {
  CreateSprintSnapshotDto,
  SprintSnapshotQueryDto,
  UpdateSprintSnapshotDto,
} from './dto/sprint-metrics.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Audit } from '../common/decorators/audit-action.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Sprint Metrics')
@ApiCookieAuth('access_token')
@Controller({ path: 'sprint-metrics', version: '1' })
export class SprintMetricsController {
  constructor(private readonly service: SprintMetricsService) {}

  @Post()
  @RequirePermissions('sprint_metrics:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Log a sprint state snapshot' })
  create(@Body() dto: CreateSprintSnapshotDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermissions('sprint_metrics:read')
  @ApiOperation({ summary: 'List sprint state snapshots' })
  findAll(@Query() query: SprintSnapshotQueryDto) {
    return this.service.findAll(query);
  }

  @Get('latest')
  @RequirePermissions('sprint_metrics:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiOperation({ summary: 'Get the most recent snapshot for a project/team' })
  findLatest(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.service.findLatest(projectId, teamId);
  }

  @Get(':id')
  @RequirePermissions('sprint_metrics:read')
  @ApiOperation({ summary: 'Get a single sprint snapshot' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('sprint_metrics:create')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a sprint snapshot' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSprintSnapshotDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('sprint_metrics:create')
  @Audit(AuditAction.SOFT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (soft) a sprint snapshot' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
