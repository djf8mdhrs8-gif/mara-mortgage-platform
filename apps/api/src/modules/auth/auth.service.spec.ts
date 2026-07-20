import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from './auth.service';
import type { PrismaService } from '../../prisma/prisma.service';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'BORROWER';
  createdAt: Date;
  updatedAt: Date;
}

interface CredentialRow {
  userId: string;
  passwordHash: string;
}

interface TokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
}

/** Minimal in-memory Prisma stand-in covering exactly what AuthService touches. */
function makeFakePrisma() {
  const users: UserRow[] = [];
  const credentials: CredentialRow[] = [];
  const tokens: TokenRow[] = [];
  let seq = 0;

  const prisma = {
    user: {
      findUnique: ({
        where,
        include,
      }: {
        where: { email?: string; id?: string };
        include?: { credential?: boolean };
      }) => {
        const user =
          where.email !== undefined
            ? users.find((u) => u.email === where.email)
            : users.find((u) => u.id === where.id);
        if (user === undefined) return Promise.resolve(null);
        if (include?.credential === true) {
          const credential = credentials.find((c) => c.userId === user.id) ?? null;
          return Promise.resolve({ ...user, credential });
        }
        return Promise.resolve(user);
      },
      create: ({
        data,
      }: {
        data: {
          email: string;
          firstName: string;
          lastName: string;
          phone: string | null;
          credential: { create: { passwordHash: string } };
        };
      }) => {
        const user: UserRow = {
          id: `user_${++seq}`,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: 'BORROWER',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(user);
        credentials.push({ userId: user.id, passwordHash: data.credential.create.passwordHash });
        return Promise.resolve(user);
      },
    },
    refreshToken: {
      create: ({
        data,
      }: {
        data: { userId: string; tokenHash: string; expiresAt: Date };
      }) => {
        const row: TokenRow = {
          id: `tok_${++seq}`,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          revokedAt: null,
          replacedById: null,
        };
        tokens.push(row);
        return Promise.resolve(row);
      },
      findUnique: ({
        where,
        include,
      }: {
        where: { tokenHash: string };
        include?: { user?: boolean };
      }) => {
        const row = tokens.find((t) => t.tokenHash === where.tokenHash);
        if (row === undefined) return Promise.resolve(null);
        if (include?.user === true) {
          return Promise.resolve({ ...row, user: users.find((u) => u.id === row.userId) });
        }
        return Promise.resolve(row);
      },
      update: ({ where, data }: { where: { id: string }; data: Partial<TokenRow> }) => {
        const row = tokens.find((t) => t.id === where.id);
        if (row !== undefined) Object.assign(row, data);
        return Promise.resolve(row);
      },
      updateMany: ({
        where,
        data,
      }: {
        where: { tokenHash?: string; userId?: string; revokedAt?: null };
        data: { revokedAt: Date };
      }) => {
        let count = 0;
        for (const t of tokens) {
          const hashOk = where.tokenHash === undefined || t.tokenHash === where.tokenHash;
          const userOk = where.userId === undefined || t.userId === where.userId;
          const revokedOk = !('revokedAt' in where) || t.revokedAt === where.revokedAt;
          if (hashOk && userOk && revokedOk) {
            Object.assign(t, data);
            count += 1;
          }
        }
        return Promise.resolve({ count });
      },
    },
    _tokens: tokens,
  };

  return prisma as unknown as PrismaService & { _tokens: TokenRow[] };
}

const jwt = new JwtService({ secret: 'test-secret-at-least-16-chars' });

const REGISTRATION = {
  email: 'Jane@Example.com',
  password: 'hunter2hunter2',
  firstName: 'Jane',
  lastName: 'Doe',
};

describe('AuthService', () => {
  let prisma: ReturnType<typeof makeFakePrisma>;
  let service: AuthService;

  beforeEach(() => {
    prisma = makeFakePrisma();
    service = new AuthService(prisma, jwt);
  });

  it('registers a user, lowercases the email, and returns working tokens', async () => {
    const result = await service.register(REGISTRATION);

    expect(result.user.email).toBe('jane@example.com');
    expect(result.accessToken.length).toBeGreaterThan(20);
    const payload = await jwt.verifyAsync<{ sub: string }>(result.accessToken);
    expect(payload.sub).toBe(result.user.id);
  });

  it('rejects duplicate registration', async () => {
    await service.register(REGISTRATION);
    await expect(service.register(REGISTRATION)).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with correct credentials and rejects wrong password with the same error as unknown email', async () => {
    await service.register(REGISTRATION);

    const ok = await service.login('jane@example.com', REGISTRATION.password);
    expect(ok.user.firstName).toBe('Jane');

    await expect(service.login('jane@example.com', 'not-the-password')).rejects.toThrowError(
      'invalid credentials',
    );
    await expect(service.login('nobody@example.com', 'whatever123')).rejects.toThrowError(
      'invalid credentials',
    );
  });

  it('rotates the refresh token on use', async () => {
    const first = await service.register(REGISTRATION);
    const second = await service.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    // Old token is now revoked...
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('revokes every active session when a rotated-out token is replayed', async () => {
    const first = await service.register(REGISTRATION);
    const second = await service.refresh(first.refreshToken);

    // Replay of the already-rotated token → theft assumption → all revoked,
    // including the "legitimate" second token.
    await expect(service.refresh(first.refreshToken)).rejects.toThrowError(
      'refresh token reuse detected',
    );
    await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects expired refresh tokens', async () => {
    const result = await service.register(REGISTRATION);
    for (const t of prisma._tokens) t.expiresAt = new Date(Date.now() - 1000);

    await expect(service.refresh(result.refreshToken)).rejects.toThrowError(
      'refresh token expired',
    );
  });

  it('logout revokes the token and is idempotent', async () => {
    const result = await service.register(REGISTRATION);
    await service.logout(result.refreshToken);
    await service.logout(result.refreshToken); // no throw

    await expect(service.refresh(result.refreshToken)).rejects.toThrowError(
      'refresh token reuse detected',
    );
  });
});
