import { Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

import { StatsOverviewDto } from './stats.dto';
import { PrismaService } from '../../prisma/prisma.service';

function tally(rows: { key: string; count: number }[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.key, row.count]));
}

/**
 * First-party usage metrics straight from our own tables — live from day
 * one, no analytics account required. PostHog (once its key is configured)
 * adds behavioral depth like raw calculator opens; this endpoint is the
 * source of truth for pipeline/funnel numbers either way.
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<StatsOverviewDto> {
    const [users, applications, scenarios, documents] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.savedScenario.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.document.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const [messages, notifications, notificationsDelivered] = await Promise.all([
      this.prisma.message.count(),
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { status: 'SENT' } }),
    ]);

    // Funnel over borrowers+realtors: how far did each account get?
    const clientRoles = { role: { in: ['BORROWER', 'REALTOR'] as UserRole[] } };
    const [signedUp, savedScenario, startedApplication, submitted, closed] = await Promise.all([
      this.prisma.user.count({ where: clientRoles }),
      this.prisma.savedScenario
        .groupBy({ by: ['userId'], _count: { _all: true } })
        .then((rows) => rows.length),
      this.prisma.application
        .groupBy({ by: ['userId'], _count: { _all: true } })
        .then((rows) => rows.length),
      this.prisma.application
        .groupBy({
          by: ['userId'],
          where: { status: { notIn: ['DRAFT', 'CANCELLED'] } },
          _count: { _all: true },
        })
        .then((rows) => rows.length),
      this.prisma.application
        .groupBy({ by: ['userId'], where: { status: 'CLOSED' }, _count: { _all: true } })
        .then((rows) => rows.length),
    ]);

    return {
      users: tally(users.map((r) => ({ key: r.role, count: r._count._all }))),
      applicationsByStatus: tally(
        applications.map((r) => ({ key: r.status, count: r._count._all })),
      ),
      scenariosByType: tally(scenarios.map((r) => ({ key: r.type, count: r._count._all }))),
      documentsByStatus: tally(documents.map((r) => ({ key: r.status, count: r._count._all }))),
      messages,
      notifications,
      notificationsDelivered,
      funnel: [
        { stage: 'Signed up', count: signedUp },
        { stage: 'Saved a calculator scenario', count: savedScenario },
        { stage: 'Started an application', count: startedApplication },
        { stage: 'Submitted (in the pipeline)', count: submitted },
        { stage: 'Closed', count: closed },
      ],
    };
  }
}
