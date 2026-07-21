import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { RolesGuard } from './roles.guard';

function makeContext(role: UserRole, required?: UserRole[]): ExecutionContext {
  return {
    getHandler: () => ({ required }),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1', role } }) }),
  } as unknown as ExecutionContext;
}

function makeGuard(required?: UserRole[]): RolesGuard {
  const reflector = {
    getAllAndOverride: () => required,
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('passes routes with no @Roles metadata', () => {
    expect(makeGuard(undefined).canActivate(makeContext('BORROWER'))).toBe(true);
  });

  it('allows a matching role', () => {
    expect(makeGuard(['ADMIN']).canActivate(makeContext('ADMIN'))).toBe(true);
  });

  it('rejects a non-matching role with 403', () => {
    expect(() => makeGuard(['LOAN_OFFICER', 'ADMIN']).canActivate(makeContext('BORROWER'))).toThrow(
      ForbiddenException,
    );
  });
});
