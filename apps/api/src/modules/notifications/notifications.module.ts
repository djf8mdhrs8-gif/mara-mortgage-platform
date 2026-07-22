import { Module } from '@nestjs/common';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushTransport } from './push-transport.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushTransport],
  exports: [NotificationsService],
})
export class NotificationsModule {}
