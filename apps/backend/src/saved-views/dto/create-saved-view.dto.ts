import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ChartType } from '@prisma/client';

export class CreateSavedViewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Module name: roadmap | productivity | headcount | release_cadence' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  module!: string;

  @ApiProperty({ enum: ChartType })
  @IsEnum(ChartType)
  chartType!: ChartType;

  @ApiProperty({ description: 'Serialised filter/chart configuration JSON' })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
