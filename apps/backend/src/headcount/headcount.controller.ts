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
import { HeadcountService } from './headcount.service';
import { CreateHeadcountRecordDto } from './dto/create-headcount-record.dto';
import { UpdateHeadcountRecordDto } from './dto/update-headcount-record.dto';
import { HeadcountQueryDto } from './dto/headcount-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Audit } from '../common/decorators/audit-action.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Headcount')
@ApiCookieAuth('access_token')
@Controller({ path: 'headcount', version: '1' })
export class HeadcountController {
  constructor(private readonly service: HeadcountService) {}

  @Post('records')
  @RequirePermissions('headcount:create')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a headcount record' })
  async createRecord(
    @Body() dto: CreateHeadcountRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createRecord(dto, user.id);
  }

  @Get('records')
  @RequirePermissions('headcount:read')
  @ApiOperation({ summary: 'List headcount records with filters' })
  async findRecords(@Query() query: HeadcountQueryDto) {
    return this.service.findRecords(query);
  }

  @Get('records/:id')
  @RequirePermissions('headcount:read')
  @ApiOperation({ summary: 'Get a single headcount record' })
  async findRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findRecord(id);
  }

  @Patch('records/:id')
  @RequirePermissions('headcount:update')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a headcount record' })
  async updateRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHeadcountRecordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateRecord(id, dto, user.id);
  }

  @Delete('records/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('headcount:delete')
  @Audit(AuditAction.DELETE)
  @ApiOperation({ summary: 'Delete a headcount record' })
  async deleteRecord(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.deleteRecord(id);
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  @Get('analytics/summary')
  @RequirePermissions('headcount:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOperation({ summary: 'Headcount summary stats (latest period)' })
  async getSummary(@Query('projectId') projectId?: string) {
    return this.service.getSummaryStats(projectId);
  }

  @Get('analytics/time-series')
  @RequirePermissions('headcount:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'periodFrom', required: false })
  @ApiQuery({ name: 'periodTo', required: false })
  @ApiOperation({ summary: 'Headcount time series (opening/closing/added/removed by period)' })
  async getTimeSeries(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
  ) {
    return this.service.getTimeSeries(projectId, teamId, periodFrom, periodTo);
  }

  @Get('analytics/waterfall')
  @RequirePermissions('headcount:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'periodFrom', required: false })
  @ApiQuery({ name: 'periodTo', required: false })
  @ApiOperation({ summary: 'Waterfall chart data: net HC change per period' })
  async getWaterfall(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
  ) {
    return this.service.getWaterfallData(projectId, teamId, periodFrom, periodTo);
  }
}
