import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Message, MessageThread, User } from '@prisma/client';

import type { AccessTokenPayload } from '../auth/auth.service';
import { MessageDto, ThreadMessagesDto, ThreadSummaryDto } from './messages.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

const STAFF_ROLES = ['LOAN_OFFICER', 'ADMIN'] as const;

function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

type MessageWithSender = Message & { sender: Pick<User, 'firstName' | 'role'> };

function toDto(message: MessageWithSender): MessageDto {
  return {
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId,
    senderName: message.sender.firstName,
    fromStaff: isStaffRole(message.sender.role),
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Best-effort push — a notification failure never fails the message send. */
  private async notify(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.warn({ err: error }, 'message notification failed');
    }
  }

  private async getOrCreateThread(userId: string): Promise<MessageThread> {
    const existing = await this.prisma.messageThread.findUnique({ where: { userId } });
    if (existing !== null) return existing;
    return this.prisma.messageThread.create({ data: { userId } });
  }

  /** Borrower/realtor: own thread, lazily created; reading marks it read. */
  async getOwnThread(payload: AccessTokenPayload): Promise<ThreadMessagesDto> {
    const thread = await this.getOrCreateThread(payload.sub);
    const messages = await this.prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { firstName: true, role: true } } },
    });
    await this.prisma.messageThread.update({
      where: { id: thread.id },
      data: { borrowerLastReadAt: new Date() },
    });
    return { threadId: thread.id, messages: messages.map(toDto) };
  }

  async sendAsBorrower(payload: AccessTokenPayload, body: string): Promise<MessageDto> {
    const thread = await this.getOrCreateThread(payload.sub);
    const message = await this.prisma.message.create({
      data: { threadId: thread.id, senderId: payload.sub, body },
      include: { sender: { select: { firstName: true, role: true } } },
    });
    await this.prisma.messageThread.update({
      where: { id: thread.id },
      data: { borrowerLastReadAt: new Date() },
    });

    await this.notify(() =>
      this.notifications.sendToStaff(
        {
          type: 'MESSAGE',
          title: 'New message',
          body: `${message.sender.firstName}: ${body.slice(0, 120)}`,
        },
        payload.sub,
      ),
    );
    return toDto(message);
  }

  /** Staff: every thread, most recent activity first, with unread counts. */
  async listThreads(): Promise<ThreadSummaryDto[]> {
    const threads = await this.prisma.messageThread.findMany({
      include: {
        user: { select: { firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            threadId: thread.id,
            senderId: thread.userId, // only the borrower's own messages count as unread for staff
            ...(thread.staffLastReadAt === null
              ? {}
              : { createdAt: { gt: thread.staffLastReadAt } }),
          },
        });
        const last = thread.messages[0];
        return {
          id: thread.id,
          userId: thread.userId,
          userName: `${thread.user.firstName} ${thread.user.lastName}`,
          lastMessage: last?.body ?? null,
          lastMessageAt: last?.createdAt.toISOString() ?? null,
          unreadCount,
        };
      }),
    );
  }

  /** Staff: open a thread (marks the staff side read). 404 on unknown ids. */
  async getThread(threadId: string): Promise<ThreadMessagesDto> {
    const thread = await this.prisma.messageThread.findUnique({ where: { id: threadId } });
    if (thread === null) {
      throw new NotFoundException('thread not found');
    }
    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { firstName: true, role: true } } },
    });
    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { staffLastReadAt: new Date() },
    });
    return { threadId, messages: messages.map(toDto) };
  }

  async sendAsStaff(
    threadId: string,
    payload: AccessTokenPayload,
    body: string,
  ): Promise<MessageDto> {
    const thread = await this.prisma.messageThread.findUnique({ where: { id: threadId } });
    if (thread === null) {
      throw new NotFoundException('thread not found');
    }
    const message = await this.prisma.message.create({
      data: { threadId, senderId: payload.sub, body },
      include: { sender: { select: { firstName: true, role: true } } },
    });
    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { staffLastReadAt: new Date() },
    });

    await this.notify(() =>
      this.notifications.sendToUser(thread.userId, {
        type: 'MESSAGE',
        title: 'Message from your loan team',
        body: body.slice(0, 140),
      }),
    );
    return toDto(message);
  }
}
