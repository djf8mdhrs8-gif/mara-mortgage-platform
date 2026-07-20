import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({ enum: ['up'] })
  db!: 'up';

  @ApiProperty({ description: 'Process uptime in whole seconds' })
  uptimeSeconds!: number;

  @ApiProperty({ description: 'ISO-8601 server time' })
  timestamp!: string;
}
