import { Module } from '@nestjs/common';

import { LoanProgramsController } from './loan-programs.controller';
import { LoanProgramsService } from './loan-programs.service';

@Module({
  controllers: [LoanProgramsController],
  providers: [LoanProgramsService],
})
export class LoanProgramsModule {}
