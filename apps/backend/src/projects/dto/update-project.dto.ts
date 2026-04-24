import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,20}$/, {
    message: 'code must be 2–20 uppercase letters, digits, underscores or hyphens',
  })
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Number of past months shown in the headcount chart', minimum: 0, maximum: 36 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(36)
  headcountPastMonths?: number;

  @ApiPropertyOptional({ description: 'Number of future months shown in the headcount chart', minimum: 0, maximum: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  headcountFutureMonths?: number;
}
