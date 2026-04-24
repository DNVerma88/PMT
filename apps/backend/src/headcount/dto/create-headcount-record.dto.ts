import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHeadcountRecordDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Role/persona category (e.g. SDE, SDE2, PM, QA)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  role?: string;

  @ApiProperty({ description: 'First day of the reporting month (ISO date)' })
  @IsDateString()
  period!: string;

  @ApiProperty({ description: 'Headcount at start of period' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  openingCount!: number;

  @ApiPropertyOptional({ description: 'Headcount added (hires/transfers-in)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  addedCount?: number;

  @ApiPropertyOptional({ description: 'Headcount removed (exits/transfers-out)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  removedCount?: number;

  @ApiProperty({ description: 'Headcount at end of period' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  closingCount!: number;

  @ApiPropertyOptional({ description: 'Planned/target headcount' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  plannedCount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
