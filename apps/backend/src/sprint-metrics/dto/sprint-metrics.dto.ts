import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSprintSnapshotDto {
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

  @ApiProperty({ description: 'Date of this snapshot (ISO date)' })
  @IsDateString()
  snapshotDate!: string;

  @ApiPropertyOptional({ description: 'Free-text sprint name e.g. "Sprint 81"' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sprintName?: string;

  @ApiProperty({
    description: 'Map of story/US state key → count. Keys must match WsrConfig.storyStateConfig.',
    example: { active: 17, in_review: 3, blocked: 4, closed: 3 },
  })
  @IsObject()
  storyStateCounts!: Record<string, number>;

  @ApiProperty({
    description: 'Map of bug/defect state key → count. Keys must match WsrConfig.bugStateConfig.',
    example: { active: 4, backlog: 5, blocked: 3, closed: 41, ready_to_test: 3 },
  })
  @IsObject()
  bugStateCounts!: Record<string, number>;

  @ApiPropertyOptional({ description: 'Bug count at sprint commencement (baseline for Done & Planned section)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bugCountAtSprintStart?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateSprintSnapshotDto {
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  snapshotDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sprintName?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  storyStateCounts?: Record<string, number>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  bugStateCounts?: Record<string, number>;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bugCountAtSprintStart?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class SprintSnapshotQueryDto {
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
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}
