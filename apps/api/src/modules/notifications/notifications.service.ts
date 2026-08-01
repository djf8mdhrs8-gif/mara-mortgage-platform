import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { NotificationType, ScheduledBroadcast } from '@prisma/client';

import {
  BroadcastDto,
  BroadcastResultDto,
  RegisterPushTokenDto,
  ScheduleBroadcastDto,
  ScheduledBroadcastDto,
  SendResultDto,
} from './notifications.dto';
import { PushTransport } from './push-transport.service';
import { PrismaService } from '../../prisma/prisma.service';

function toScheduledDto(row: ScheduledBroadcast): ScheduledBroadcastDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    type: row.type,
    sendAt: row.sendAt.toISOString(),
    status: row.status,
    recipients: row.recipients,
    delivered: row.delivered,
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}

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

  /**
   * Admin broadcast to an audience segment. Every targeted user gets a
   * Notification row (their in-app history) regardless of device delivery.
   */
  async broadcast(dto: BroadcastDto): Promise<BroadcastResultDto> {
    const roleFilter =
      dto.audience === 'BORROWERS'
        ? { role: 'BORROWER' as const }
        : dto.audience === 'REALTORS'
          ? { role: 'REALTOR' as const }
          : {};
    const users = await this.prisma.user.findMany({ where: roleFilter });

    let delivered = 0;
    for (const user of users) {
      const result = await this.sendToUser(user.id, {
        type: dto.type ?? 'GENERAL',
        title: dto.title,
        body: dto.body,
      });
      if (result.status === 'SENT') delivered += 1;
    }

    return { recipients: users.length, delivered, undelivered: users.length - delivered };
  }

  /** Queue a broadcast for the cron dispatcher. Must be in the future. */
  async schedule(dto: ScheduleBroadcastDto): Promise<ScheduledBroadcastDto> {
    const sendAt = new Date(dto.sendAt);
    if (sendAt.getTime() <= Date.now()) {
      throw new BadRequestException('sendAt must be in the future — use broadcast to send now');
    }
    const row = await this.prisma.scheduledBroadcast.create({
      data: {
        title: dto.title,
        body: dto.body,
        audience: dto.audience,
        type: dto.type ?? 'GENERAL',
        sendAt,
      },
    });
    return toScheduledDto(row);
  }

  /** All scheduled broadcasts, soonest-pending first, then history. */
  async listScheduled(): Promise<ScheduledBroadcastDto[]> {
    const rows = await this.prisma.scheduledBroadcast.findMany({
      orderBy: [{ status: 'asc' }, { sendAt: 'desc' }],
    });
    return rows.map(toScheduledDto);
  }

  /** Cancel a PENDING broadcast; sent/cancelled ones are immutable history. */
  async cancelScheduled(id: string): Promise<ScheduledBroadcastDto> {
    const row = await this.prisma.scheduledBroadcast.findUnique({ where: { id } });
    if (row === null) {
      throw new NotFoundException('scheduled broadcast not found');
    }
    if (row.status !== 'PENDING') {
      throw new BadRequestException(`already ${row.status.toLowerCase()}`);
    }
    const updated = await this.prisma.scheduledBroadcast.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    return toScheduledDto(updated);
  }

  /**
   * Sends every due PENDING broadcast. Called by the minutely cron (and
   * directly by tests). Each row is marked SENT with its counts even if
   * device delivery partially failed — the Notification rows carry per-user
   * status, and re-sending a whole broadcast would duplicate history.
   */
  async dispatchDueBroadcasts(now = new Date()): Promise<number> {
    const due = await this.prisma.scheduledBroadcast.findMany({
      where: { status: 'PENDING', sendAt: { lte: now } },
    });
    for (const row of due) {
      const result = await this.broadcast({
        title: row.title,
        body: row.body,
        audience: row.audience,
        type: row.type as BroadcastDto['type'],
      });
      await this.prisma.scheduledBroadcast.update({
        where: { id: row.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          recipients: result.recipients,
          delivered: result.delivered,
        },
      });
      this.logger.log(
        { scheduledBroadcastId: row.id, recipients: result.recipients },
        'scheduled broadcast dispatched',
      );
    }
    return due.length;
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
