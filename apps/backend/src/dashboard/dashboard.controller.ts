import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Dashboard')
@ApiCookieAuth('access_token')
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @RequirePermissions('roadmap:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOperation({ summary: 'Aggregated dashboard summary (releases, milestones, headcount, productivity)' })
  async getSummary(@Query('projectId') projectId?: string) {
    return this.service.getSummary(projectId);
  }
}
