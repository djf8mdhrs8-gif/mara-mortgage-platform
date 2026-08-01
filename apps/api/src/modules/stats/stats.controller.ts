import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { StatsOverviewDto } from './stats.dto';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('overview')
  @Roles('ADMIN')
  @ApiOkResponse({ type: StatsOverviewDto })
  @ApiForbiddenResponse({ description: 'Admin only' })
  overview(): Promise<StatsOverviewDto> {
    return this.stats.overview();
  }
}
