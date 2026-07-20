import { createHash, randomBytes } from 'node:crypto';

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

import { AuthResponseDto, AuthUserDto } from './auth.dto';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function toAuthUser(user: User): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthResponseDto> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing !== null) {
      throw new ConflictException('email already registered');
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        credential: { create: { passwordHash } },
      },
    });

    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { credential: true },
    });
    // Same error for unknown email and wrong password — no account enumeration.
    if (user?.credential == null) {
      throw new UnauthorizedException('invalid credentials');
    }
    const valid = await argon2.verify(user.credential.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (stored === null) {
      throw new UnauthorizedException('invalid refresh token');
    }
    if (stored.revokedAt !== null) {
      // A rotated-out token is being replayed: assume theft and end every
      // session for this user rather than letting the race winner keep going.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('refresh token reuse detected');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('refresh token expired');
    }

    const next = await this.issueTokens(stored.user);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: sha256(next.refreshToken) },
    });
    return next;
  }

  async logout(refreshToken: string): Promise<void> {
    // Idempotent: revoking an unknown/already-revoked token is a no-op.
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getUser(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user === null) {
      throw new UnauthorizedException('user no longer exists');
    }
    return toAuthUser(user);
  }

  private async issueTokens(user: User): Promise<AuthResponseDto> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL });

    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken, user: toAuthUser(user) };
  }
}
