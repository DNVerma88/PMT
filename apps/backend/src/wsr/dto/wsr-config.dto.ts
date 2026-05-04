import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpsertWsrConfigDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  reportTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  clientName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  vendorName?: string;

  // Section titles
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(100) titleStaffing?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(100) titleProductivity?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(100) titleRoadmap?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(100) titleDonePlanned?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(100) titleAchieved?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(100) titleLeaves?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(100) titleAppreciation?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(100) titleRisk?: string;

  // Visibility
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showStaffing?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showProductivity?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showRoadmap?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showDonePlanned?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showAchieved?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showLeaves?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showAppreciation?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showRisk?: boolean;

  // JSON config arrays
  @ApiPropertyOptional({ description: 'Ordered array of section keys' })
  @IsArray()
  @IsOptional()
  sectionOrder?: string[];

  @ApiPropertyOptional({ description: 'Array of { key, label, color } for story states' })
  @IsArray()
  @IsOptional()
  storyStateConfig?: Array<{ key: string; label: string; color: string }>;

  @ApiPropertyOptional({ description: 'Array of { key, label, color } for bug states' })
  @IsArray()
  @IsOptional()
  bugStateConfig?: Array<{ key: string; label: string; color: string }>;

  @ApiPropertyOptional({ description: 'Array of { key, label } for leave types' })
  @IsArray()
  @IsOptional()
  leaveTypeConfig?: Array<{ key: string; label: string }>;
}
