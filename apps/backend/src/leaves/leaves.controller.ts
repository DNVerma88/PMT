import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto, LeaveQueryDto, UpdateLeaveDto } from './dto/leave.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Audit } from '../common/decorators/audit-action.decorator';
import type { RequestUser } from '../common/types/request-user.type';

@ApiTags('Leaves')
@ApiCookieAuth('access_token')
@Controller({ path: 'leaves', version: '1' })
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  @Post()
  @RequirePermissions('leaves:manage')
  @Audit(AuditAction.CREATE)
  @ApiOperation({ summary: 'Log a leave record' })
  create(@Body() dto: CreateLeaveDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermissions('leaves:read')
  @ApiOperation({ summary: 'List leave records (supports date-overlap filter)' })
  findAll(@Query() query: LeaveQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('leaves:read')
  @ApiOperation({ summary: 'Get a single leave record' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('leaves:manage')
  @Audit(AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a leave record' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('leaves:manage')
  @Audit(AuditAction.SOFT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (soft) a leave record' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
