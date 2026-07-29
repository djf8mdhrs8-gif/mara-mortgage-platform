import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { SaveScenarioDto, ScenarioDto } from './scenarios.dto';
import { ScenariosService } from './scenarios.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('scenarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenarios: ScenariosService) {}

  @Post()
  @ApiCreatedResponse({ type: ScenarioDto })
  @ApiBadRequestResponse({ description: 'Inputs are not valid for the calculator type' })
  save(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SaveScenarioDto,
  ): Promise<ScenarioDto> {
    return this.scenarios.save(user, dto);
  }

  @Get()
  @ApiOkResponse({ type: [ScenarioDto] })
  list(@CurrentUser() user: AccessTokenPayload): Promise<ScenarioDto[]> {
    return this.scenarios.list(user);
  }

  @Get(':id')
  @ApiOkResponse({ type: ScenarioDto })
  @ApiNotFoundResponse({ description: 'Not found (or not yours)' })
  getById(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ScenarioDto> {
    return this.scenarios.getById(id, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNotFoundResponse({ description: 'Not found (or not yours)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    await this.scenarios.remove(id, user);
  }
}
