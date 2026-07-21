import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ApplicationDto, UpdateApplicationStatusDto } from './applications.dto';
import { ApplicationsService } from './applications.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  @ApiCreatedResponse({ type: ApplicationDto })
  create(@CurrentUser() user: AccessTokenPayload): Promise<ApplicationDto> {
    return this.applications.create(user);
  }

  @Get()
  @ApiOkResponse({ type: [ApplicationDto] })
  list(@CurrentUser() user: AccessTokenPayload): Promise<ApplicationDto[]> {
    return this.applications.list(user);
  }

  @Get(':id')
  @ApiOkResponse({ type: ApplicationDto })
  @ApiNotFoundResponse({ description: 'Not found (or not yours)' })
  getById(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ApplicationDto> {
    return this.applications.getById(id, user);
  }

  @Patch(':id/status')
  @Roles('LOAN_OFFICER', 'ADMIN')
  @ApiOkResponse({ type: ApplicationDto })
  @ApiForbiddenResponse({ description: 'Requires loan officer or admin role' })
  @ApiNotFoundResponse({ description: 'Not found' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<ApplicationDto> {
    return this.applications.updateStatus(id, dto.status);
  }
}
