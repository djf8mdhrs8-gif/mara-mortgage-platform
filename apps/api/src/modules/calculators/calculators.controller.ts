import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Patch,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

import { AmortizationPdfService } from './amortization-pdf.service';
import { CalculatorConfigDto, UpdateCalculatorConfigDto } from './calculator-config.dto';
import { CalculatorConfigService } from './calculator-config.service';
import { AmortizationPdfRequestDto } from './calculators.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('calculators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calculators')
export class CalculatorsController {
  constructor(
    private readonly amortizationPdf: AmortizationPdfService,
    private readonly config: CalculatorConfigService,
  ) {}

  /** Effective calculator settings — any signed-in user (the app reads this at boot). */
  @Get('config')
  @ApiOkResponse({ type: CalculatorConfigDto })
  getConfig(): Promise<CalculatorConfigDto> {
    return this.config.get();
  }

  @Patch('config')
  @Roles('ADMIN')
  @ApiOkResponse({ type: CalculatorConfigDto })
  @ApiForbiddenResponse({ description: 'Admin only' })
  updateConfig(@Body() dto: UpdateCalculatorConfigDto): Promise<CalculatorConfigDto> {
    return this.config.update(dto);
  }

  @Post('amortization/pdf')
  @HttpCode(200)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="amortization-schedule.pdf"')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Amortization schedule as a PDF document' })
  async exportPdf(@Body() dto: AmortizationPdfRequestDto): Promise<StreamableFile> {
    const { oneTimeAmount, oneTimeMonth, ...rest } = dto;
    return new StreamableFile(
      await this.amortizationPdf.render({
        ...rest,
        oneTime:
          oneTimeAmount !== undefined && oneTimeAmount > 0 && oneTimeMonth !== undefined
            ? { amount: oneTimeAmount, month: oneTimeMonth }
            : undefined,
      }),
    );
  }
}
