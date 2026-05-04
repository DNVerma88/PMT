import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Portfolio')
@ApiCookieAuth('access_token')
@Controller({ path: 'portfolio', version: '1' })
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  @Get('summary')
  @RequirePermissions('portfolio:read')
  @ApiOperation({ summary: 'High-level KPI summary across all projects' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('release-health')
  @RequirePermissions('portfolio:read')
  @ApiOperation({ summary: 'Release health matrix per project (RAG status)' })
  getReleaseHealth() {
    return this.service.getReleaseHealth();
  }

  @Get('headcount')
  @RequirePermissions('portfolio:read')
  @ApiOperation({ summary: 'Headcount totals by project for the last 3 months' })
  getHeadcount() {
    return this.service.getHeadcountSummary();
  }

  @Get('productivity')
  @RequirePermissions('portfolio:read')
  @ApiOperation({ summary: 'Productivity trend (planned vs actual) by project for the last 3 months' })
  getProductivity() {
    return this.service.getProductivityTrend();
  }

  @Get('milestones')
  @RequirePermissions('portfolio:read')
  @ApiQuery({ name: 'days', required: false, description: 'Look-ahead window in days (default 30)' })
  @ApiOperation({ summary: 'Upcoming milestones across all projects' })
  getUpcomingMilestones(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.service.getUpcomingMilestones(days);
  }

  @Get('risks')
  @RequirePermissions('portfolio:read')
  @ApiOperation({ summary: 'Overdue milestones and delayed/at-risk releases' })
  getRisks() {
    return this.service.getRisks();
  }
}
