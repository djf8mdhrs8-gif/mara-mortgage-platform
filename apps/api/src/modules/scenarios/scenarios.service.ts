import {
  analyzeProperty,
  buildExtraPaymentPlan,
  calculateAffordability,
  calculateBasicMortgage,
  calculatePermanentBuydown,
  calculateRefinance,
  calculateRentVsBuy,
  calculateTemporaryBuydown,
} from '@mara/mortgage-calc';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScenarioType, type SavedScenario } from '@prisma/client';

import type { AccessTokenPayload } from '../auth/auth.service';
import { ScenarioDto } from './scenarios.dto';
import { PrismaService } from '../../prisma/prisma.service';

/* eslint-disable @typescript-eslint/no-explicit-any --
 * Inputs arrive as untrusted JSON; each engine does its own runtime
 * validation and throws RangeError on anything malformed. */
const ENGINES: Record<ScenarioType, (inputs: any) => unknown> = {
  BASIC: calculateBasicMortgage,
  EXTRA_PAYMENT: buildExtraPaymentPlan,
  REFINANCE: calculateRefinance,
  AFFORDABILITY: calculateAffordability,
  RENT_VS_BUY: calculateRentVsBuy,
  // One scenario type, two engines: `mode` in the inputs picks which.
  BUYDOWN: (inputs: any) =>
    inputs?.mode === 'permanent'
      ? calculatePermanentBuydown(inputs)
      : calculateTemporaryBuydown(inputs),
  PROPERTY_ANALYSIS: analyzeProperty,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Month-by-month schedules are huge (up to 360 rows) and only matter on the
 * calculator screen itself, which recomputes on device. Comparison and list
 * views need the summary numbers only, so schedules never hit the database.
 */
function stripSchedules(outputs: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...outputs };
  delete rest.schedule;
  return rest;
}

function toDto(row: SavedScenario): ScenarioDto {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    inputs: row.inputs as Record<string, unknown>,
    outputs: row.outputs as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ScenariosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recompute server-side, then persist inputs + authoritative outputs. */
  async save(
    payload: AccessTokenPayload,
    input: { type: ScenarioType; name: string; inputs: Record<string, unknown> },
  ): Promise<ScenarioDto> {
    let outputs: Record<string, unknown>;
    try {
      outputs = ENGINES[input.type](input.inputs) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('inputs are not valid for this calculator type');
    }

    const row = await this.prisma.savedScenario.create({
      data: {
        userId: payload.sub,
        type: input.type,
        name: input.name,
        inputs: input.inputs as Prisma.InputJsonValue,
        outputs: stripSchedules(outputs) as Prisma.InputJsonValue,
      },
    });
    return toDto(row);
  }

  /** Own scenarios only, newest first — no cross-user visibility, staff included. */
  async list(payload: AccessTokenPayload): Promise<ScenarioDto[]> {
    const rows = await this.prisma.savedScenario.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  /** 404 (not 403) for other users' scenarios — no existence oracle. */
  async getById(id: string, payload: AccessTokenPayload): Promise<ScenarioDto> {
    const row = await this.prisma.savedScenario.findUnique({ where: { id } });
    if (row === null || row.userId !== payload.sub) {
      throw new NotFoundException('scenario not found');
    }
    return toDto(row);
  }

  async remove(id: string, payload: AccessTokenPayload): Promise<void> {
    const row = await this.prisma.savedScenario.findUnique({ where: { id } });
    if (row === null || row.userId !== payload.sub) {
      throw new NotFoundException('scenario not found');
    }
    await this.prisma.savedScenario.delete({ where: { id } });
  }
}
