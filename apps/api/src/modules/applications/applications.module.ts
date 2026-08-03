import { Module } from '@nestjs/common';

import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ARIVE_ADAPTER, AriveWebViewAdapter } from './arive.adapter';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, { provide: ARIVE_ADAPTER, useClass: AriveWebViewAdapter }],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
