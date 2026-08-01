import { Module } from '@nestjs/common';

import { ScenarioPdfService } from './scenario-pdf.service';
import { ScenariosController } from './scenarios.controller';
import { ScenariosService } from './scenarios.service';

@Module({
  controllers: [ScenariosController],
  providers: [ScenariosService, ScenarioPdfService],
})
export class ScenariosModule {}
