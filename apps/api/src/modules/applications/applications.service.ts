import { Injectable, NotFoundException } from '@nestjs/common';
import type { Application } from '@prisma/client';

import type { AccessTokenPayload } from '../auth/auth.service';
import { ApplicationDto } from './applications.dto';
import { PrismaService } from '../../prisma/prisma.service';

const STAFF_ROLES = ['LOAN_OFFICER', 'ADMIN'] as const;

function isStaff(payload: AccessTokenPayload): boolean {
  return (STAFF_ROLES as readonly string[]).includes(payload.role);
}

function toDto(app: Application): ApplicationDto {
  return {
    id: app.id,
    userId: app.userId,
    ariveLoanId: app.ariveLoanId,
    status: app.status,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: AccessTokenPayload): Promise<ApplicationDto> {
    const app = await this.prisma.application.create({ data: { userId: payload.sub } });
    return toDto(app);
  }

  /** Borrowers/Realtors see only their own; staff see everything. */
  async list(payload: AccessTokenPayload): Promise<ApplicationDto[]> {
    const apps = await this.prisma.application.findMany({
      where: isStaff(payload) ? undefined : { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
    });
    return apps.map(toDto);
  }

  /**
   * Row-level ownership: non-staff get 404 (not 403) for others' applications,
   * so the API never confirms that a given application id exists.
   */
  async getById(id: string, payload: AccessTokenPayload): Promise<ApplicationDto> {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (app === null || (!isStaff(payload) && app.userId !== payload.sub)) {
      throw new NotFoundException('application not found');
    }
    return toDto(app);
  }

  async updateStatus(id: string, status: Application['status']): Promise<ApplicationDto> {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (app === null) {
      throw new NotFoundException('application not found');
    }
    const updated = await this.prisma.application.update({ where: { id }, data: { status } });
    return toDto(updated);
  }
}
