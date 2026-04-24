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
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { Request } from 'express';

@ApiTags('features')
@Controller({ path: 'features', version: '1' })
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  // ── Timeline (must come before :id routes) ──────────────────────────────────

  @Get('timeline')
  @ApiOperation({ summary: 'Get timeline data for a sprint calendar' })
  @ApiQuery({ name: 'sprintCalendarId', required: true })
  @ApiQuery({ name: 'projectId', required: false })
  getTimeline(
    @Query('sprintCalendarId') sprintCalendarId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.featuresService.getTimeline(sprintCalendarId, projectId);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  @Get()
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'sprintCalendarId', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('sprintCalendarId') sprintCalendarId?: string,
  ) {
    return this.featuresService.findAll(projectId, sprintCalendarId);
  }

  @Post()
  create(@Body() dto: CreateFeatureDto, @Req() req: Request) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    return this.featuresService.create(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.featuresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeatureDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    return this.featuresService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.featuresService.softDelete(id);
  }
}
