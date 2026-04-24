import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateSprintCalendarDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ description: 'ISO date string for Sprint 1 start (any weekday)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'ISO date string for Sprint 1 end — defines the sprint interval for all subsequent sprints' })
  @IsDateString()
  firstSprintEnd!: string;

  @ApiProperty({ description: 'Number of sprints to generate', default: 6 })
  @IsInt()
  @Min(1)
  @Max(104)
  sprintCount!: number;

  @ApiPropertyOptional({ description: 'Day within each sprint (1-based) when Code Freeze begins. Enables repeating phase template.' })
  @IsInt()
  @Min(1)
  @IsOptional()
  codeFreezeOffset?: number;

  @ApiPropertyOptional({ description: 'Day within each sprint (1-based) when Regression testing begins' })
  @IsInt()
  @Min(1)
  @IsOptional()
  regressionOffset?: number;

  @ApiPropertyOptional({ description: 'Day within each sprint (1-based) when Regression testing ends' })
  @IsInt()
  @Min(1)
  @IsOptional()
  regressionEndOffset?: number;

  @ApiPropertyOptional({ description: 'Day within each sprint (1-based) when Go/No-Go review starts' })
  @IsInt()
  @Min(1)
  @IsOptional()
  goNoGoOffset?: number;
}
