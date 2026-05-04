import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import {
  CreateIntegrationDto,
  SaveCredentialsDto,
  UpdateIntegrationDto,
  UpsertFieldMapDto,
} from './dto/integration.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Integrations')
@ApiCookieAuth('access_token')
@Controller({ path: 'integrations', version: '1' })
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  /** List supported providers */
  @Get('providers')
  @ApiOperation({ summary: 'List available integration providers' })
  listProviders() {
    return this.service.listProviders();
  }

  @Post()
  @RequirePermissions('integrations:manage')
  @ApiOperation({ summary: 'Create a new integration connection' })
  create(@Body() dto: CreateIntegrationDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermissions('integrations:read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOperation({ summary: 'List integration connections' })
  findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId);
  }

  @Get(':id')
  @RequirePermissions('integrations:read')
  @ApiOperation({ summary: 'Get integration connection details (no credentials)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('integrations:manage')
  @ApiOperation({ summary: 'Update integration connection settings' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateIntegrationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('integrations:manage')
  @ApiOperation({ summary: 'Soft-delete an integration connection' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/credentials')
  @RequirePermissions('integrations:manage')
  @ApiOperation({ summary: 'Save encrypted credentials for a connection (write-only)' })
  saveCredentials(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveCredentialsDto,
  ) {
    return this.service.saveCredentials(id, dto);
  }

  @Post(':id/test')
  @RequirePermissions('integrations:manage')
  @ApiOperation({ summary: 'Test connection credentials against the external service' })
  testConnection(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.testConnection(id);
  }

  @Post(':id/sync')
  @RequirePermissions('integrations:manage')
  @ApiOperation({ summary: 'Trigger a manual sync run (async, returns syncLogId)' })
  triggerSync(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.triggerSync(id);
  }

  @Get(':id/logs')
  @RequirePermissions('integrations:read')
  @ApiOperation({ summary: 'Get recent sync logs for a connection' })
  getLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSyncLogs(id);
  }

  @Post(':id/field-maps')
  @RequirePermissions('integrations:manage')
  @ApiOperation({ summary: 'Upsert a field mapping for a connection' })
  upsertFieldMap(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertFieldMapDto,
  ) {
    return this.service.upsertFieldMap(id, dto);
  }

  @Delete(':id/field-maps/:pmtField')
  @RequirePermissions('integrations:manage')
  @ApiOperation({ summary: 'Delete a field mapping' })
  deleteFieldMap(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pmtField') pmtField: string,
  ) {
    return this.service.deleteFieldMap(id, pmtField);
  }
}
