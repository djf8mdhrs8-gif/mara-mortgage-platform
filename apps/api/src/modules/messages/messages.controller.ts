import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { MessageDto, SendMessageDto, ThreadMessagesDto, ThreadSummaryDto } from './messages.dto';
import { MessagesService } from './messages.service';
import { AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // ---- Borrower/realtor side: their single thread with the loan team ----

  @Get()
  @ApiOkResponse({ type: ThreadMessagesDto })
  getOwnThread(@CurrentUser() user: AccessTokenPayload): Promise<ThreadMessagesDto> {
    return this.messages.getOwnThread(user);
  }

  @Post()
  @HttpCode(201)
  @ApiCreatedResponse({ type: MessageDto })
  send(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SendMessageDto,
  ): Promise<MessageDto> {
    return this.messages.sendAsBorrower(user, dto.body);
  }

  // ---- Staff side ----

  @Get('threads')
  @Roles('LOAN_OFFICER', 'ADMIN')
  @ApiOkResponse({ type: [ThreadSummaryDto] })
  @ApiForbiddenResponse({ description: 'Requires loan officer or admin role' })
  listThreads(): Promise<ThreadSummaryDto[]> {
    return this.messages.listThreads();
  }

  @Get('threads/:id')
  @Roles('LOAN_OFFICER', 'ADMIN')
  @ApiOkResponse({ type: ThreadMessagesDto })
  @ApiForbiddenResponse({ description: 'Requires loan officer or admin role' })
  @ApiNotFoundResponse({ description: 'Thread not found' })
  getThread(@Param('id') id: string): Promise<ThreadMessagesDto> {
    return this.messages.getThread(id);
  }

  @Post('threads/:id')
  @Roles('LOAN_OFFICER', 'ADMIN')
  @HttpCode(201)
  @ApiCreatedResponse({ type: MessageDto })
  @ApiForbiddenResponse({ description: 'Requires loan officer or admin role' })
  @ApiNotFoundResponse({ description: 'Thread not found' })
  reply(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SendMessageDto,
  ): Promise<MessageDto> {
    return this.messages.sendAsStaff(id, user, dto.body);
  }
}
