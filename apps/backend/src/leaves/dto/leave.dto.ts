import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLeaveDto {
  @ApiProperty({ description: 'User ID of the person on leave' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiProperty({
    description: 'Leave type key matching WsrConfig.leaveTypeConfig (e.g. PLANNED, SICK)',
    default: 'PLANNED',
  })
  @IsString()
  @MaxLength(50)
  leaveType!: string;

  @ApiProperty({ description: 'Start date (ISO)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO, inclusive)' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'True if only half a day' })
  @IsBoolean()
  @IsOptional()
  halfDay?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class UpdateLeaveDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  leaveType?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  halfDay?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class LeaveQueryDto {
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
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter leaves overlapping from this date' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter leaves overlapping until this date' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
