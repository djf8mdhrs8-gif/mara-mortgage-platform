import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { HealthController } from './health.controller';
import type { PrismaService } from '../../prisma/prisma.service';

const prismaUp = { $queryRaw: () => Promise.resolve([{ '?column?': 1 }]) } as unknown as PrismaService;
const prismaDown = { $queryRaw: () => Promise.reject(new Error('connection refused')) } as unknown as PrismaService;

describe('HealthController', () => {
  it('reports ok with db up, a valid timestamp, and non-negative uptime', async () => {
    const result = await new HealthController(prismaUp).check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('returns 503 when the database is unreachable', async () => {
    await expect(new HealthController(prismaDown).check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
