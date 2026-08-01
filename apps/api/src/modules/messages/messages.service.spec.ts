import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { MessagesService } from './messages.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface ThreadRow {
  id: string;
  userId: string;
  borrowerLastReadAt: Date | null;
  staffLastReadAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageRow {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: Date;
}

function makeFakes() {
  const users: UserRow[] = [
    { id: 'user_a', firstName: 'Sarah', lastName: 'Buyer', role: 'BORROWER' },
    { id: 'user_b', firstName: 'Ben', lastName: 'Browser', role: 'BORROWER' },
    { id: 'user_lo', firstName: 'Mara', lastName: 'Officer', role: 'LOAN_OFFICER' },
  ];
  const threads: ThreadRow[] = [];
  const messages: MessageRow[] = [];
  let seq = 0;

  const withSender = (m: MessageRow) => ({
    ...m,
    sender: users.find((u) => u.id === m.senderId)!,
  });

  const prisma = {
    messageThread: {
      findUnique: ({ where }: { where: { userId?: string; id?: string } }) =>
        Promise.resolve(
          threads.find((t) =>
            where.userId !== undefined ? t.userId === where.userId : t.id === where.id,
          ) ?? null,
        ),
      create: ({ data }: { data: { userId: string } }) => {
        const row: ThreadRow = {
          id: `thr_${++seq}`,
          userId: data.userId,
          borrowerLastReadAt: null,
          staffLastReadAt: null,
          createdAt: new Date(2026, 0, seq),
          updatedAt: new Date(2026, 0, seq),
        };
        threads.push(row);
        return Promise.resolve(row);
      },
      update: ({ where, data }: { where: { id: string }; data: Partial<ThreadRow> }) => {
        const row = threads.find((t) => t.id === where.id);
        if (row !== undefined) Object.assign(row, data, { updatedAt: new Date() });
        return Promise.resolve(row);
      },
      findMany: () =>
        Promise.resolve(
          threads
            .map((t) => ({
              ...t,
              user: users.find((u) => u.id === t.userId)!,
              messages: messages
                .filter((m) => m.threadId === t.id)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 1),
            }))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        ),
    },
    message: {
      create: ({ data }: { data: { threadId: string; senderId: string; body: string } }) => {
        const row: MessageRow = {
          id: `msg_${++seq}`,
          ...data,
          createdAt: new Date(2026, 0, seq),
        };
        messages.push(row);
        return Promise.resolve(withSender(row));
      },
      findMany: ({ where }: { where: { threadId: string } }) =>
        Promise.resolve(
          messages
            .filter((m) => m.threadId === where.threadId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map(withSender),
        ),
      count: ({
        where,
      }: {
        where: { threadId: string; senderId: string; createdAt?: { gt: Date } };
      }) =>
        Promise.resolve(
          messages.filter(
            (m) =>
              m.threadId === where.threadId &&
              m.senderId === where.senderId &&
              (where.createdAt === undefined || m.createdAt > where.createdAt.gt),
          ).length,
        ),
    },
  } as unknown as PrismaService;

  const pushes: { kind: string; userId?: string; type: string; body: string }[] = [];
  const notifications = {
    sendToUser: (userId: string, input: { type: string; body: string }) => {
      pushes.push({ kind: 'user', userId, type: input.type, body: input.body });
      return Promise.resolve({ notificationId: 'n', status: 'SENT', deviceCount: 1, detail: 'ok' });
    },
    sendToStaff: (input: { type: string; body: string }) => {
      pushes.push({ kind: 'staff', type: input.type, body: input.body });
      return Promise.resolve();
    },
  } as unknown as NotificationsService;

  return { prisma, notifications, pushes };
}

const sarah: AccessTokenPayload = { sub: 'user_a', role: 'BORROWER' };
const ben: AccessTokenPayload = { sub: 'user_b', role: 'BORROWER' };
const mara: AccessTokenPayload = { sub: 'user_lo', role: 'LOAN_OFFICER' };

describe('MessagesService', () => {
  let service: MessagesService;
  let pushes: ReturnType<typeof makeFakes>['pushes'];

  beforeEach(() => {
    const fakes = makeFakes();
    pushes = fakes.pushes;
    service = new MessagesService(fakes.prisma, fakes.notifications);
  });

  it('creates the thread lazily and keeps each borrower in their own thread', async () => {
    const sarahThread = await service.getOwnThread(sarah);
    const benThread = await service.getOwnThread(ben);

    expect(sarahThread.messages).toHaveLength(0);
    expect(sarahThread.threadId).not.toBe(benThread.threadId);

    // Re-reading returns the same thread, not a new one.
    expect((await service.getOwnThread(sarah)).threadId).toBe(sarahThread.threadId);
  });

  it('borrower send notifies staff; staff reply notifies exactly that borrower', async () => {
    await service.sendAsBorrower(sarah, 'Is the appraisal scheduled?');
    expect(pushes).toEqual([
      expect.objectContaining({ kind: 'staff', type: 'MESSAGE' }),
    ]);
    expect(pushes[0]?.body).toContain('Sarah');

    const { threadId } = await service.getOwnThread(sarah);
    await service.sendAsStaff(threadId, mara, 'Yes — Thursday at 10am.');
    expect(pushes[1]).toMatchObject({ kind: 'user', userId: 'user_a', type: 'MESSAGE' });

    const thread = await service.getOwnThread(sarah);
    expect(thread.messages.map((m) => [m.senderName, m.fromStaff])).toEqual([
      ['Sarah', false],
      ['Mara', true],
    ]);
  });

  it('staff thread list shows unread counts that clear on read', async () => {
    await service.sendAsBorrower(sarah, 'first');
    await service.sendAsBorrower(sarah, 'second');
    await service.sendAsBorrower(ben, 'hello');

    let list = await service.listThreads();
    expect(list).toHaveLength(2);
    const sarahSummary = list.find((t) => t.userName === 'Sarah Buyer')!;
    expect(sarahSummary.unreadCount).toBe(2);
    expect(sarahSummary.lastMessage).toBe('second');

    await service.getThread(sarahSummary.id); // staff opens it
    list = await service.listThreads();
    expect(list.find((t) => t.userName === 'Sarah Buyer')?.unreadCount).toBe(0);
    // Staff replies never count as unread for staff.
    await service.sendAsStaff(sarahSummary.id, mara, 'got it');
    list = await service.listThreads();
    expect(list.find((t) => t.userName === 'Sarah Buyer')?.unreadCount).toBe(0);
  });

  it('staff endpoints 404 on unknown threads', async () => {
    await expect(service.getThread('thr_missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.sendAsStaff('thr_missing', mara, 'hi')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
