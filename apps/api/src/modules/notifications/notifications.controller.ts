import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  BroadcastDto,
  BroadcastResultDto,
  RegisterPushTokenDto,
  ScheduleBroadcastDto,
  ScheduledBroadcastDto,
  SendResultDto,
  SendTestNotificationDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Admin broadcast: all users or a role segment. */
  @Post('broadcast')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: BroadcastResultDto })
  @ApiForbiddenResponse({ description: 'Admin only' })
  broadcast(@Body() dto: BroadcastDto): Promise<BroadcastResultDto> {
    return this.notifications.broadcast(dto);
  }

  /** Queue a broadcast for a future time; the scheduler sends it. */
  @Post('schedule')
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: ScheduledBroadcastDto })
  @ApiBadRequestResponse({ description: 'sendAt must be in the future' })
  @ApiForbiddenResponse({ description: 'Admin only' })
  schedule(@Body() dto: ScheduleBroadcastDto): Promise<ScheduledBroadcastDto> {
    return this.notifications.schedule(dto);
  }

  @Get('scheduled')
  @Roles('ADMIN')
  @ApiOkResponse({ type: [ScheduledBroadcastDto] })
  @ApiForbiddenResponse({ description: 'Admin only' })
  listScheduled(): Promise<ScheduledBroadcastDto[]> {
    return this.notifications.listScheduled();
  }

  @Delete('scheduled/:id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: ScheduledBroadcastDto })
  @ApiBadRequestResponse({ description: 'Already sent or cancelled' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiForbiddenResponse({ description: 'Admin only' })
  cancelScheduled(@Param('id') id: string): Promise<ScheduledBroadcastDto> {
    return this.notifications.cancelScheduled(id);
  }

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
