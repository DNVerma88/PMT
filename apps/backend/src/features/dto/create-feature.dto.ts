import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FeatureStatus } from '@prisma/client';

export class CreateFeatureDto {
  @ApiProperty({ description: 'Feature name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ description: 'Detailed description', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ description: 'User-defined grouping label (e.g. Enhancements, Bug Fixing)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ default: 0, description: 'Display order within the timeline' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: FeatureStatus, default: 'PLANNED' })
  @IsOptional()
  @IsEnum(FeatureStatus)
  status?: FeatureStatus;

  @ApiPropertyOptional({ description: 'Link to a Release Plan' })
  @IsOptional()
  @IsUUID()
  releasePlanId?: string;

  @ApiPropertyOptional({ description: 'Sprint calendar this feature is planned against' })
  @IsOptional()
  @IsUUID()
  sprintCalendarId?: string;

  // ── Phase 1 ────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ default: 'Development', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phase1Label?: string;

  @ApiPropertyOptional({ description: 'Sprint number where phase 1 starts (inclusive)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  phase1StartSprint?: number;

  @ApiPropertyOptional({ description: 'Sprint number where phase 1 ends (inclusive)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  phase1EndSprint?: number;

  @ApiPropertyOptional({ default: '#ff9800', description: 'Hex color for phase 1 bar' })
  @IsOptional()
  @IsHexColor()
  phase1Color?: string;

  // ── Phase 2 ────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ default: 'QA / Release', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phase2Label?: string;

  @ApiPropertyOptional({ description: 'Sprint number where phase 2 starts (inclusive)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  phase2StartSprint?: number;

  @ApiPropertyOptional({ description: 'Sprint number where phase 2 ends (inclusive)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  phase2EndSprint?: number;

  @ApiPropertyOptional({ default: '#4caf50', description: 'Hex color for phase 2 bar' })
  @IsOptional()
  @IsHexColor()
  phase2Color?: string;
}
