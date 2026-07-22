import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  RegisterPushTokenDto,
  SendResultDto,
  SendTestNotificationDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('token')
  @HttpCode(204)
  async registerToken(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<void> {
    await this.notifications.registerToken(user.sub, dto);
  }

  /** Sends a push to the caller's own devices — the plumbing smoke test. */
  @Post('test')
  @HttpCode(200)
  @ApiOkResponse({ type: SendResultDto })
  sendTest(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SendTestNotificationDto,
  ): Promise<SendResultDto> {
    return this.notifications.sendToUser(user.sub, {
      type: 'GENERAL',
      title: dto.title,
      body: dto.body,
    });
  }
}
