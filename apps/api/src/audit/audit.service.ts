import { Injectable, Logger } from '@nestjs/common';
import type { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  /** Acting user id, when known. Failed logins pass null and put the attempted email in detail. */
  actorId?: string | null;
  targetType?: string;
  targetId?: string;
  detail?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Best-effort append: an audit write must never fail the business action
   * it describes, so failures are logged and swallowed.
   */
  async record(action: AuditAction, entry: AuditEntry = {}): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          actorId: entry.actorId ?? null,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          detail: entry.detail,
        },
      });
    } catch (error) {
      this.logger.error({ err: error, action }, 'audit write failed');
    }
  }
}
