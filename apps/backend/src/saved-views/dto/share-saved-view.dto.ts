import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ShareSavedViewDto {
  @ApiProperty({ description: 'User ID to share with' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  canEdit?: boolean;
}
