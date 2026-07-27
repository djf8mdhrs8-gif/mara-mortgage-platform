import { beforeEach, describe, expect, it } from 'vitest';

import { NotificationsService } from './notifications.service';
import type { PushOutcome, PushTransport } from './push-transport.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface TokenRow {
  id: string;
  userId: string;
  token: string;
  platform: string;
}

interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  status: string;
  sentAt: Date | null;
}

function makeFakes(outcomeFor: (token: string) => boolean) {
  const tokens: TokenRow[] = [];
  const notifications: NotificationRow[] = [];
  const sentMessages: { to: string; title?: string }[] = [];
  let seq = 0;

  const users = [
    { id: 'user_a', role: 'BORROWER' },
    { id: 'user_b', role: 'BORROWER' },
    { id: 'user_r', role: 'REALTOR' },
    { id: 'user_lo', role: 'LOAN_OFFICER' },
    { id: 'user_adm', role: 'ADMIN' },
  ];

  const prisma = {
    user: {
      findMany: ({ where }: { where?: { role?: string | { in: string[] } } }) =>
        Promise.resolve(
          users.filter((u) => {
            if (where?.role === undefined) return true;
            if (typeof where.role === 'string') return u.role === where.role;
            return where.role.in.includes(u.role);
          }),
        ),
    },
    pushToken: {
      upsert: ({ where, create, update }: {
        where: { token: string };
        create: TokenRow & { userId: string };
        update: { userId: string; platform: string };
      }) => {
        const existing = tokens.find((t) => t.token === where.token);
        if (existing === undefined) {
          tokens.push({ ...create, id: `pt_${++seq}` });
        } else {
          Object.assign(existing, update);
        }
        return Promise.resolve(existing);
      },
      findMany: ({ where }: { where: { userId: string } }) =>
        Promise.resolve(tokens.filter((t) => t.userId === where.userId)),
    },
    notification: {
      create: ({ data }: { data: Omit<NotificationRow, 'id' | 'status' | 'sentAt'> }) => {
        const row: NotificationRow = { ...data, id: `n_${++seq}`, status: 'PENDING', sentAt: null };
        notifications.push(row);
        return Promise.resolve(row);
      },
      update: ({ where, data }: { where: { id: string }; data: Partial<NotificationRow> }) => {
        const row = notifications.find((n) => n.id === where.id);
        if (row !== undefined) Object.assign(row, data);
        return Promise.resolve(row);
      },
    },
  } as unknown as PrismaService;

  const transport = {
    send: (messages: { to: string; title?: string }[]) => {
      sentMessages.push(...messages);
      return Promise.resolve(
        messages.map(
          (m): PushOutcome => ({
            token: m.to,
            ok: outcomeFor(m.to),
            detail: outcomeFor(m.to) ? 'ok' : 'DeviceNotRegistered',
          }),
        ),
      );
    },
  } as unknown as PushTransport;

  return { prisma, transport, tokens, notifications, sentMessages };
}

describe('NotificationsService broadcast', () => {
  it('BORROWERS audience only records rows for borrowers, with delivery counts', async () => {
    const fakes = makeFakes((t) => t.includes('good'));
    const service = new NotificationsService(fakes.prisma, fakes.transport);
    await service.registerToken('user_a', { token: 'ExponentPushToken[good-a]', platform: 'ios' });
    // user_b has no device

    const result = await service.broadcast({
      title: 'Rates',
      body: 'Dropped',
      audience: 'BORROWERS',
    });

    expect(result.recipients).toBe(2);
    expect(result.delivered).toBe(1);
    expect(result.undelivered).toBe(1);
    const userIds = fakes.notifications.map((n) => n.userId).sort();
    expect(userIds).toEqual(['user_a', 'user_b']);
  });

  it('ALL audience reaches every user', async () => {
    const fakes = makeFakes(() => false);
    const service = new NotificationsService(fakes.prisma, fakes.transport);

    const result = await service.broadcast({ title: 'Hi', body: 'All', audience: 'ALL' });
    expect(result.recipients).toBe(5);
    expect(result.delivered).toBe(0);
    expect(fakes.notifications).toHaveLength(5);
  });
});

describe('NotificationsService', () => {
  let fakes: ReturnType<typeof makeFakes>;
  let service: NotificationsService;

  beforeEach(() => {
    fakes = makeFakes(() => true);
    service = new NotificationsService(fakes.prisma, fakes.transport);
  });

  it('registerToken upserts and reassigns a token to the latest account', async () => {
    await service.registerToken('user_a', { token: 'ExponentPushToken[t1]', platform: 'ios' });
    await service.registerToken('user_b', { token: 'ExponentPushToken[t1]', platform: 'ios' });

    expect(fakes.tokens).toHaveLength(1);
    expect(fakes.tokens[0]?.userId).toBe('user_b');
  });

  it('sendToUser records the notification and delivers to every device', async () => {
    await service.registerToken('user_a', { token: 'ExponentPushToken[t1]', platform: 'ios' });
    await service.registerToken('user_a', { token: 'ExponentPushToken[t2]', platform: 'android' });

    const result = await service.sendToUser('user_a', {
      type: 'GENERAL',
      title: 'Hello',
      body: 'World',
    });

    expect(result.status).toBe('SENT');
    expect(result.deviceCount).toBe(2);
    expect(fakes.sentMessages).toHaveLength(2);
    expect(fakes.notifications[0]?.status).toBe('SENT');
    expect(fakes.notifications[0]?.sentAt).not.toBeNull();
  });

  it('sendToUser with no devices records a FAILED notification', async () => {
    const result = await service.sendToUser('user_a', {
      type: 'GENERAL',
      title: 'Hello',
      body: 'World',
    });

    expect(result.status).toBe('FAILED');
    expect(result.detail).toBe('no registered devices');
    expect(fakes.notifications[0]?.status).toBe('FAILED');
  });

  it('all-devices-rejected marks the notification FAILED with detail', async () => {
    fakes = makeFakes(() => false);
    service = new NotificationsService(fakes.prisma, fakes.transport);
    await service.registerToken('user_a', { token: 'ExponentPushToken[bad]', platform: 'ios' });

    const result = await service.sendToUser('user_a', {
      type: 'GENERAL',
      title: 'Hello',
      body: 'World',
    });

    expect(result.status).toBe('FAILED');
    expect(result.detail).toContain('DeviceNotRegistered');
  });
});
