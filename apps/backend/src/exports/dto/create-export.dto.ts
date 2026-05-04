import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportReportType {
  ROADMAP = 'roadmap',
  HEADCOUNT = 'headcount',
  PRODUCTIVITY = 'productivity',
  RELEASE = 'release',
  WSR = 'wsr',
}

export enum ExportFormatDto {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

export class CreateExportDto {
  @ApiProperty({ enum: ExportReportType })
  @IsEnum(ExportReportType)
  reportType!: ExportReportType;

  @ApiProperty({ enum: ExportFormatDto })
  @IsEnum(ExportFormatDto)
  format!: ExportFormatDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Specific release plan ID (for release report type)' })
  @IsOptional()
  @IsString()
  releaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Week date for WSR report (any date in the week, ISO)' })
  @IsOptional()
  @IsString()
  weekOf?: string;

  @ApiPropertyOptional({ description: 'Team ID scope for WSR report' })
  @IsOptional()
  @IsString()
  teamId?: string;
}
