import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { NotificationsService } from './notifications.service';

/**
 * Minutely tick that flushes due scheduled broadcasts. All real logic lives
 * in NotificationsService.dispatchDueBroadcasts so tests can drive it with
 * an explicit clock instead of waiting on cron.
 */
@Injectable()
export class BroadcastSchedulerService {
  private readonly logger = new Logger(BroadcastSchedulerService.name);

  constructor(private readonly notifications: NotificationsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    try {
      await this.notifications.dispatchDueBroadcasts();
    } catch (error) {
      // Never let one bad tick kill the scheduler — next minute retries.
      this.logger.error({ err: error }, 'scheduled broadcast dispatch failed');
    }
  }
}
