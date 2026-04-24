import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddProjectMemberDto {
  @ApiProperty({ description: 'User ID to add to project' })
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'MEMBER', 'VIEWER'], default: 'MEMBER' })
  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'MEMBER', 'VIEWER'])
  role?: string = 'MEMBER';
}
