import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project display name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: 'Short uppercase code, e.g. PMT, CRM' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,20}$/, {
    message: 'code must be 2–20 uppercase letters, digits, underscores or hyphens',
  })
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
