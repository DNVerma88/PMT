import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ReleaseType, ReleaseStatus, CadenceMode } from '@prisma/client';

export class CreateReleasePlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version!: string;

  @ApiProperty({ enum: ReleaseType })
  @IsEnum(ReleaseType)
  type!: ReleaseType;

  @ApiPropertyOptional({ enum: ReleaseStatus })
  @IsEnum(ReleaseStatus)
  @IsOptional()
  status?: ReleaseStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ enum: CadenceMode })
  @IsEnum(CadenceMode)
  @IsOptional()
  cadenceMode?: CadenceMode;

  @ApiProperty()
  @IsDateString()
  plannedStart!: string;

  @ApiProperty()
  @IsDateString()
  plannedEnd!: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  actualStart?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  actualEnd?: string;

  @ApiPropertyOptional({ description: 'Parent major release ID for minor releases' })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
