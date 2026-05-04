import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import { ExportsService } from './exports.service';
import { CreateExportDto } from './dto/create-export.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Exports')
@ApiCookieAuth('access_token')
@Controller({ path: 'exports', version: '1' })
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Post()
  @RequirePermissions('exports:export')
  @ApiOperation({ summary: 'Request a new export (returns jobId, generation is async)' })
  createExport(@Body() dto: CreateExportDto, @CurrentUser() user: RequestUser) {
    return this.service.createExport(dto, user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'List recent exports for the current user' })
  getHistory(@CurrentUser() user: RequestUser) {
    return this.service.getHistory(user.id);
  }

  @Get(':jobId/status')
  @ApiOperation({ summary: 'Get status of an export job' })
  getStatus(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getJobStatus(jobId, user.id);
  }

  @Get(':jobId/download')
  @ApiOperation({ summary: 'Download a ready export file' })
  async download(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const job = await this.service.getJobForDownload(jobId, user.id);

    const mimeTypes: Record<string, string> = {
      PDF: 'application/pdf',
      EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      CSV: 'text/csv',
    };

    const mime = mimeTypes[job.format] ?? 'application/octet-stream';
    const fileName = job.fileName ?? `export-${jobId}`;

    res.set({
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    });

    const fileStream = fs.createReadStream(job.filePath!);
    return new StreamableFile(fileStream);
  }
}
