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

interface ScheduledRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  type: string;
  sendAt: Date;
  status: string;
  recipients: number | null;
  delivered: number | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function makeFakes(outcomeFor: (token: string) => boolean) {
  const tokens: TokenRow[] = [];
  const notifications: NotificationRow[] = [];
  const scheduled: ScheduledRow[] = [];
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
    scheduledBroadcast: {
      create: ({ data }: { data: Omit<ScheduledRow, 'id' | 'status' | 'recipients' | 'delivered' | 'sentAt' | 'createdAt' | 'updatedAt'> }) => {
        const row: ScheduledRow = {
          ...data,
          id: `sb_${++seq}`,
          status: 'PENDING',
          recipients: null,
          delivered: null,
          sentAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        scheduled.push(row);
        return Promise.resolve(row);
      },
      findMany: ({ where }: { where?: { status?: string; sendAt?: { lte: Date } } } = {}) =>
        Promise.resolve(
          scheduled.filter(
            (s) =>
              (where?.status === undefined || s.status === where.status) &&
              (where?.sendAt === undefined || s.sendAt <= where.sendAt.lte),
          ),
        ),
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(scheduled.find((s) => s.id === where.id) ?? null),
      update: ({ where, data }: { where: { id: string }; data: Partial<ScheduledRow> }) => {
        const row = scheduled.find((s) => s.id === where.id);
        if (row !== undefined) Object.assign(row, data, { updatedAt: new Date() });
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

  return { prisma, transport, tokens, notifications, scheduled, sentMessages };
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

describe('NotificationsService scheduled broadcasts', () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  it('rejects past sendAt and queues future ones as PENDING', async () => {
    const fakes = makeFakes(() => true);
    const service = new NotificationsService(fakes.prisma, fakes.transport);

    await expect(
      service.schedule({
        title: 'Late',
        body: 'x',
        audience: 'ALL',
        sendAt: new Date(Date.now() - 1000).toISOString(),
      }),
    ).rejects.toThrowError('future');

    const row = await service.schedule({
      title: 'Rates dropping Monday',
      body: 'Watch this space.',
      audience: 'BORROWERS',
      type: 'RATE_UPDATE',
      sendAt: future,
    });
    expect(row.status).toBe('PENDING');
    expect(row.type).toBe('RATE_UPDATE');
  });

  it('dispatchDueBroadcasts sends only due PENDING rows and records counts', async () => {
    const fakes = makeFakes(() => true);
    const service = new NotificationsService(fakes.prisma, fakes.transport);
    await service.registerToken('user_a', { token: 'ExponentPushToken[a]', platform: 'ios' });

    const due = await service.schedule({
      title: 'Due',
      body: 'now-ish',
      audience: 'BORROWERS',
      sendAt: new Date(Date.now() + 1000).toISOString(),
    });
    const notDue = await service.schedule({
      title: 'Later',
      body: 'tomorrow',
      audience: 'ALL',
      sendAt: future,
    });

    // Clock advanced past the first row only.
    const dispatched = await service.dispatchDueBroadcasts(new Date(Date.now() + 5000));
    expect(dispatched).toBe(1);

    const list = await service.listScheduled();
    const sent = list.find((s) => s.id === due.id)!;
    expect(sent.status).toBe('SENT');
    expect(sent.recipients).toBe(2); // both borrowers got Notification rows
    expect(sent.delivered).toBe(1); // only user_a has a device
    expect(list.find((s) => s.id === notDue.id)?.status).toBe('PENDING');

    // Both borrowers have the in-app row, tagged with the scheduled type.
    expect(
      fakes.notifications.filter((n) => n.title === 'Due').map((n) => n.userId),
    ).toEqual(['user_a', 'user_b']);
  });

  it('cancel only works while PENDING', async () => {
    const fakes = makeFakes(() => true);
    const service = new NotificationsService(fakes.prisma, fakes.transport);

    const row = await service.schedule({
      title: 'Cancel me',
      body: 'x',
      audience: 'ALL',
      sendAt: new Date(Date.now() + 1000).toISOString(),
    });
    const cancelled = await service.cancelScheduled(row.id);
    expect(cancelled.status).toBe('CANCELLED');

    // Cancelled rows never dispatch, and cancelling twice is an error.
    expect(await service.dispatchDueBroadcasts(new Date(Date.now() + 5000))).toBe(0);
    await expect(service.cancelScheduled(row.id)).rejects.toThrowError('cancelled');
    await expect(service.cancelScheduled('sb_missing')).rejects.toThrowError('not found');
  });
});
