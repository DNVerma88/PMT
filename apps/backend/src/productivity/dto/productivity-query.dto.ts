import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductivityQueryDto {
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
  metricDefId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  periodFrom?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  periodTo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  workType?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}
