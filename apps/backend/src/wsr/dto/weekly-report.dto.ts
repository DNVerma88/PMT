import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpsertWeeklyReportDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiProperty({ description: 'Monday of the report week (ISO date)' })
  @IsDateString()
  weekOf!: string;

  @ApiPropertyOptional({ description: 'Sprint reference e.g. "Sprint 81"' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sprintRef?: string;

  @ApiPropertyOptional({ description: '"Done and Planned Work" narrative text' })
  @IsString()
  @IsOptional()
  noteDonePlanned?: string;

  @ApiPropertyOptional({ description: '"Achieved So Far" narrative text' })
  @IsString()
  @IsOptional()
  noteAchieved?: string;

  @ApiPropertyOptional({ description: '"Appreciation / Escalation" narrative text' })
  @IsString()
  @IsOptional()
  noteAppreciation?: string;

  @ApiPropertyOptional({ description: '"Risk / Concern" narrative text' })
  @IsString()
  @IsOptional()
  noteRiskConcern?: string;
}

export class WeeklyReportQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO)' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
