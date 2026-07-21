import { Body, Controller, Header, HttpCode, Post, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';

import { AmortizationPdfService } from './amortization-pdf.service';
import { AmortizationPdfRequestDto } from './calculators.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('calculators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calculators')
export class CalculatorsController {
  constructor(private readonly amortizationPdf: AmortizationPdfService) {}

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
