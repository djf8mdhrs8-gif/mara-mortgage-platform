import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto } from './health.dto';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'Service and database are up', type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Database is unreachable' })
  async check(): Promise<HealthResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('database unreachable');
    }

    return {
      status: 'ok',
      db: 'up',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
