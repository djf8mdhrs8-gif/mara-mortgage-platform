import { ApiProperty } from '@nestjs/swagger';

export class FunnelStageDto {
  @ApiProperty({ example: 'Saved a scenario' })
  stage!: string;

  @ApiProperty({ description: 'Distinct borrowers/realtors at this stage' })
  count!: number;
}

export class StatsOverviewDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  users!: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  applicationsByStatus!: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  scenariosByType!: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  documentsByStatus!: Record<string, number>;

  @ApiProperty({ description: 'Total chat messages across all threads' })
  messages!: number;

  @ApiProperty({ description: 'Notification rows recorded (in-app history)' })
  notifications!: number;

  @ApiProperty({ description: 'Notifications with at least one device delivery' })
  notificationsDelivered!: number;

  @ApiProperty({ type: [FunnelStageDto], description: 'Sign-up → engagement → application funnel' })
  funnel!: FunnelStageDto[];
}
