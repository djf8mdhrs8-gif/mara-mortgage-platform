import { Module } from '@nestjs/common';

import { AmortizationPdfService } from './amortization-pdf.service';
import { CalculatorsController } from './calculators.controller';

@Module({
  controllers: [CalculatorsController],
  providers: [AmortizationPdfService],
})
export class CalculatorsModule {}
