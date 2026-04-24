import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  IsDecimal,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductivityRecordDto {
  @ApiProperty({ description: 'Metric definition ID' })
  @IsUUID()
  metricDefId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  sprintId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  releasePlanId?: string;

  @ApiPropertyOptional({ description: 'Role/persona (e.g. Dev, QA, PM)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  role?: string;

  @ApiPropertyOptional({ description: 'Work type (feature, bug, tech-debt, support)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  workType?: string;

  @ApiProperty({ description: 'Period start date (ISO)' })
  @IsDateString()
  period!: string;

  @ApiPropertyOptional({ description: 'Planned value', type: Number })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  planned?: number;

  @ApiProperty({ description: 'Actual value', type: Number })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  actual!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
