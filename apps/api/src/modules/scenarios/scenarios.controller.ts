import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

import { ScenarioPdfService } from './scenario-pdf.service';
import { SaveScenarioDto, ScenarioDto, UpdateScenarioDto } from './scenarios.dto';
import { ScenariosService } from './scenarios.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('scenarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scenarios')
export class ScenariosController {
  constructor(
    private readonly scenarios: ScenariosService,
    private readonly pdf: ScenarioPdfService,
  ) {}

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

  @Patch(':id')
  @ApiOkResponse({ type: ScenarioDto })
  @ApiNotFoundResponse({ description: 'Not found (or not yours)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateScenarioDto,
  ): Promise<ScenarioDto> {
    return this.scenarios.update(id, user, dto);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="scenario.pdf"')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'One-page client-shareable scenario summary' })
  @ApiNotFoundResponse({ description: 'Not found (or not yours)' })
  async exportPdf(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<StreamableFile> {
    const scenario = await this.scenarios.getById(id, user);
    const outputs = this.scenarios.recomputeOutputs(scenario);
    return new StreamableFile(await this.pdf.render(scenario, outputs));
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
