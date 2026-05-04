import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WsrService } from './wsr.service';
import { UpsertWsrConfigDto } from './dto/wsr-config.dto';
import { UpsertWeeklyReportDto, WeeklyReportQueryDto } from './dto/weekly-report.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('WSR')
@ApiCookieAuth('access_token')
@Controller({ path: 'wsr', version: '1' })
export class WsrController {
  constructor(private readonly service: WsrService) {}

  // ─── Config ───────────────────────────────────────────────────────────────

  @Get('config')
  @RequirePermissions('wsr:read')
  @ApiQuery({ name: 'projectId', required: true })
  @ApiOperation({ summary: 'Get WSR config for a project (returns defaults if none saved)' })
  getConfig(@Query('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.getConfig(projectId);
  }

  @Put('config')
  @RequirePermissions('wsr:manage')
  @ApiOperation({ summary: 'Create or update WSR config for a project' })
  upsertConfig(@Body() dto: UpsertWsrConfigDto, @CurrentUser() user: RequestUser) {
    return this.service.upsertConfig(dto, user.id);
  }

  @Post('config/reset')
  @RequirePermissions('wsr:manage')
  @ApiQuery({ name: 'projectId', required: true })
  @ApiOperation({ summary: 'Reset WSR config to defaults for a project' })
  resetConfig(
    @Query('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.resetConfig(projectId, user.id);
  }

  // ─── Weekly Report Notes ──────────────────────────────────────────────────

  @Put('notes')
  @RequirePermissions('wsr:manage')
  @ApiOperation({ summary: 'Create or update weekly report notes (auto-saves on change)' })
  upsertNotes(@Body() dto: UpsertWeeklyReportDto, @CurrentUser() user: RequestUser) {
    return this.service.upsertWeeklyReport(dto, user.id);
  }

  @Get('notes')
  @RequirePermissions('wsr:read')
  @ApiOperation({ summary: 'List weekly report notes' })
  findNotes(@Query() query: WeeklyReportQueryDto) {
    return this.service.findWeeklyReports(query);
  }

  // ─── Report Assembly ──────────────────────────────────────────────────────

  @Get('report')
  @RequirePermissions('wsr:read')
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'weekOf', required: true, description: 'Any date in the target week (ISO)' })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiOperation({ summary: 'Assemble the full WSR data payload for a given week' })
  assembleReport(
    @Query('projectId', ParseUUIDPipe) projectId: string,
    @Query('weekOf') weekOf: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.service.assembleReport(projectId, weekOf, teamId);
  }
}
