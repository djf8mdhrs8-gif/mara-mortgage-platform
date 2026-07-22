import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CreateLoanProgramDto, LoanProgramDto, UpdateLoanProgramDto } from './loan-programs.dto';
import { LoanProgramsService } from './loan-programs.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('loan-programs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loan-programs')
export class LoanProgramsController {
  constructor(private readonly programs: LoanProgramsService) {}

  @Get()
  @ApiOkResponse({ type: [LoanProgramDto] })
  list(@CurrentUser() user: AccessTokenPayload): Promise<LoanProgramDto[]> {
    return this.programs.list(user);
  }

  @Get(':slug')
  @ApiOkResponse({ type: LoanProgramDto })
  @ApiNotFoundResponse({ description: 'Unknown or unpublished program' })
  getBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LoanProgramDto> {
    return this.programs.getBySlug(slug, user);
  }

  @Post()
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: LoanProgramDto })
  @ApiForbiddenResponse({ description: 'Admin only' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  create(@Body() dto: CreateLoanProgramDto): Promise<LoanProgramDto> {
    return this.programs.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOkResponse({ type: LoanProgramDto })
  @ApiForbiddenResponse({ description: 'Admin only' })
  @ApiNotFoundResponse({ description: 'Unknown program' })
  update(@Param('id') id: string, @Body() dto: UpdateLoanProgramDto): Promise<LoanProgramDto> {
    return this.programs.update(id, dto);
  }
}
