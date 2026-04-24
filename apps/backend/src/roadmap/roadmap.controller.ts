import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoadmapService } from './roadmap.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Roadmap')
@ApiCookieAuth('access_token')
@Controller({ path: 'roadmap', version: '1' })
export class RoadmapController {
  constructor(private readonly service: RoadmapService) {}

  @Get('gantt')
  @RequirePermissions('roadmap:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({ summary: 'Get Gantt chart data for the roadmap view' })
  async getGantt(
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getGanttData(projectId, startDate, endDate, status);
  }

  @Get('summary')
  @RequirePermissions('roadmap:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOperation({ summary: 'Roadmap summary stats and upcoming releases' })
  async getSummary(@Query('projectId') projectId?: string) {
    return this.service.getSummary(projectId);
  }
}
