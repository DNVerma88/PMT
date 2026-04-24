import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { ProductivityService } from './productivity.service';
import { CreateProductivityRecordDto } from './dto/create-productivity-record.dto';
import { UpdateProductivityRecordDto } from './dto/update-productivity-record.dto';
import { ProductivityQueryDto } from './dto/productivity-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Audit } from '../common/decorators/audit-action.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Productivity')
@ApiCookieAuth('access_token')
@Controller({ path: 'productivity', version: '1' })
export class ProductivityController {
  constructor(private readonly service: ProductivityService) {}

  @Get('metric-definitions')
  @RequirePermissions('productivity:read')
  @ApiOperation({ summary: 'List all active metric definitions' })
  async findAllMetricDefs() {
    return this.service.findAllMetricDefs();
  }

  @Post('records')
  @RequirePermissions('productivity:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a productivity record' })
  async createRecord(
    @Body() dto: CreateProductivityRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createRecord(dto, user.id);
  }

  @Get('records')
  @RequirePermissions('productivity:read')
  @ApiOperation({ summary: 'List productivity records with filters' })
  async findRecords(@Query() query: ProductivityQueryDto) {
    return this.service.findRecords(query);
  }

  @Get('records/:id')
  @RequirePermissions('productivity:read')
  @ApiOperation({ summary: 'Get a single productivity record' })
  async findRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findRecord(id);
  }

  @Patch('records/:id')
  @RequirePermissions('productivity:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a productivity record' })
  async updateRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductivityRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateRecord(id, dto, user.id);
  }

  @Delete('records/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('productivity:delete')
  @Audit(AuditAction.DELETE)
  @ApiOperation({ summary: 'Delete a productivity record' })
  async deleteRecord(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.deleteRecord(id);
  }

  // ── Aggregations ───────────────────────────────────────────────────────────

  @Get('analytics/velocity')
  @RequirePermissions('productivity:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'metricKey', required: false })
  @ApiQuery({ name: 'sprintCount', required: false, type: Number })
  @ApiOperation({ summary: 'Velocity trend by sprint (planned vs actual)' })
  async getVelocityTrend(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('metricKey') metricKey?: string,
    @Query('sprintCount') sprintCount?: string,
  ) {
    return this.service.getVelocityTrend(projectId, teamId, metricKey, sprintCount ? parseInt(sprintCount, 10) : 10);
  }

  @Get('analytics/work-type-breakdown')
  @RequirePermissions('productivity:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'periodFrom', required: false })
  @ApiQuery({ name: 'periodTo', required: false })
  @ApiOperation({ summary: 'Actual output grouped by work type' })
  async getWorkTypeBreakdown(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
  ) {
    return this.service.getWorkTypeBreakdown(projectId, teamId, periodFrom, periodTo);
  }
}
