import { Module } from '@nestjs/common';

import { AmortizationPdfService } from './amortization-pdf.service';
import { CalculatorConfigService } from './calculator-config.service';
import { CalculatorsController } from './calculators.controller';

@Module({
  controllers: [CalculatorsController],
  providers: [AmortizationPdfService, CalculatorConfigService],
})
export class CalculatorsModule {}
