import { Injectable, Logger } from '@nestjs/common';
import type { NotificationType } from '@prisma/client';

import { RegisterPushTokenDto, SendResultDto } from './notifications.dto';
import { PushTransport } from './push-transport.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transport: PushTransport,
  ) {}

  /** Upserts a device token; a token seen on a new account moves to that account. */
  async registerToken(userId: string, dto: RegisterPushTokenDto): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      create: { userId, token: dto.token, platform: dto.platform },
      update: { userId, platform: dto.platform },
    });
  }

  /** Notifies every staff account (loan officers + admins), except `excludeUserId`. */
  async sendToStaff(
    input: { type: NotificationType; title: string; body: string },
    excludeUserId?: string,
  ): Promise<void> {
    const staff = await this.prisma.user.findMany({
      where: { role: { in: ['LOAN_OFFICER', 'ADMIN'] } },
    });
    for (const member of staff) {
      if (member.id === excludeUserId) continue;
      await this.sendToUser(member.id, input);
    }
  }

  /**
   * Records a Notification row, then attempts delivery to every registered
   * device. The row is the source of truth for history; delivery status is
   * SENT if at least one device accepted, FAILED otherwise.
   */
  async sendToUser(
    userId: string,
    input: { type: NotificationType; title: string; body: string },
  ): Promise<SendResultDto> {
    const notification = await this.prisma.notification.create({
      data: { userId, type: input.type, title: input.title, body: input.body },
    });

    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });
      return {
        notificationId: notification.id,
        status: 'FAILED',
        deviceCount: 0,
        detail: 'no registered devices',
      };
    }

    const outcomes = await this.transport.send(
      tokens.map((token) => ({
        to: token.token,
        title: input.title,
        body: input.body,
        sound: 'default' as const,
        data: { type: input.type },
      })),
    );

    const anyOk = outcomes.some((outcome) => outcome.ok);
    const detail = outcomes.map((o) => `${o.ok ? 'ok' : `error:${o.detail}`}`).join('; ');
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: anyOk ? 'SENT' : 'FAILED', sentAt: anyOk ? new Date() : null },
    });
    this.logger.log({ userId, notificationId: notification.id, detail }, 'push send attempted');

    return {
      notificationId: notification.id,
      status: anyOk ? 'SENT' : 'FAILED',
      deviceCount: tokens.length,
      detail,
    };
  }
}
