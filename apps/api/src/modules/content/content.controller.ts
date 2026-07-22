import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ContentBlockDto, UpsertContentBlockDto } from './content.dto';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  /**
   * Public by design: compliance text (NMLS line, disclosures) must render
   * on pre-auth screens like sign-in.
   */
  @Get(':key')
  @ApiOkResponse({ type: ContentBlockDto })
  @ApiNotFoundResponse({ description: 'Unknown content key' })
  get(@Param('key') key: string): Promise<ContentBlockDto> {
    return this.content.get(key);
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOkResponse({ type: ContentBlockDto })
  @ApiForbiddenResponse({ description: 'Admin only' })
  upsert(
    @Param('key') key: string,
    @Body() dto: UpsertContentBlockDto,
  ): Promise<ContentBlockDto> {
    return this.content.upsert(key, dto.body);
  }
}
