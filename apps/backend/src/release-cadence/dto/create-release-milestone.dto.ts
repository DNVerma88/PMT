import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { MilestoneType, MilestoneStatus } from '@prisma/client';

export class CreateReleaseMilestoneDto {
  @ApiProperty()
  @IsUUID()
  releasePlanId!: string;

  @ApiProperty({ enum: MilestoneType })
  @IsEnum(MilestoneType)
  type!: MilestoneType;

  @ApiPropertyOptional({ enum: MilestoneStatus })
  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;

  @ApiProperty()
  @IsDateString()
  plannedDate!: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  actualDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
