import { Controller, Get, Param, ParseUUIDPipe, Version } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService, RoleWithPermissions } from './roles.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Roles')
@ApiCookieAuth('access_token')
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all roles with permissions' })
  async findAll(): Promise<RoleWithPermissions[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get a single role by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleWithPermissions> {
    return this.rolesService.findOne(id);
  }
}
