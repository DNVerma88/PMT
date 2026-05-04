import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IntegrationProviderDto {
  JIRA = 'JIRA',
  AZURE_DEVOPS = 'AZURE_DEVOPS',
  GITHUB = 'GITHUB',
  LINEAR = 'LINEAR',
  GITLAB = 'GITLAB',
  TRELLO = 'TRELLO',
  SHORTCUT = 'SHORTCUT',
  CUSTOM_REST = 'CUSTOM_REST',
}

export enum SyncDirectionDto {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export class CreateIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ enum: IntegrationProviderDto })
  @IsEnum(IntegrationProviderDto)
  provider!: IntegrationProviderDto;

  @ApiProperty({ example: 'Acme Jira' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional({ example: 'https://acme.atlassian.net' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiProperty({ enum: SyncDirectionDto, default: SyncDirectionDto.INBOUND })
  @IsEnum(SyncDirectionDto)
  syncDirection!: SyncDirectionDto;

  /** Provider-specific config knobs (field mapping hints, project keys, etc.) */
  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, any>;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ enum: SyncDirectionDto })
  @IsOptional()
  @IsEnum(SyncDirectionDto)
  syncDirection?: SyncDirectionDto;

  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, any>;
}

/** Payload for saving encrypted credentials */
export class SaveCredentialsDto {
  /** Plain-text credentials object — will be AES-256-GCM encrypted before storage */
  @ApiProperty({ description: 'Provider-specific credential fields (token, clientId, etc.)' })
  credentials!: Record<string, string>;
}

export class UpsertFieldMapDto {
  @ApiProperty({ example: 'release.status' })
  @IsString()
  @IsNotEmpty()
  pmtField!: string;

  @ApiProperty({ example: 'fix_version.statusCategory.name' })
  @IsString()
  @IsNotEmpty()
  externalField!: string;

  @ApiPropertyOptional()
  @IsOptional()
  transform?: Record<string, any>;
}
