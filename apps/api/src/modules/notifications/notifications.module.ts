import { Module } from '@nestjs/common';

import { BroadcastSchedulerService } from './broadcast-scheduler.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushTransport } from './push-transport.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushTransport, BroadcastSchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
