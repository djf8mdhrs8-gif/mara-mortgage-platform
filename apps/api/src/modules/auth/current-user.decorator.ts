import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from './jwt-auth.guard';
import type { AccessTokenPayload } from './auth.service';

/** Injects the verified JWT payload set by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenPayload =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
