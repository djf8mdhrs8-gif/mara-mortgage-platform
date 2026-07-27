import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @Matches(/^Expo(nent)?PushToken\[.+\]$/, { message: 'must be an Expo push token' })
  @MaxLength(200)
  token!: string;

  @ApiProperty({ enum: ['ios', 'android'] })
  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';
}

export class SendTestNotificationDto {
  @ApiProperty({ example: 'Hello from Mara Mortgage' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'Push plumbing works end to end.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body!: string;
}

export const BROADCAST_AUDIENCES = ['ALL', 'BORROWERS', 'REALTORS'] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export class BroadcastDto {
  @ApiProperty({ example: 'Rates just dropped' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: '30-year rates fell this week — a great time to run your numbers.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body!: string;

  @ApiProperty({ enum: BROADCAST_AUDIENCES })
  @IsIn(BROADCAST_AUDIENCES)
  audience!: BroadcastAudience;

  @ApiPropertyOptional({ enum: ['GENERAL', 'RATE_UPDATE', 'EDUCATIONAL'], default: 'GENERAL' })
  @IsOptional()
  @IsIn(['GENERAL', 'RATE_UPDATE', 'EDUCATIONAL'])
  type?: 'GENERAL' | 'RATE_UPDATE' | 'EDUCATIONAL';
}

export class BroadcastResultDto {
  @ApiProperty({ description: 'Users targeted by the audience filter' })
  recipients!: number;

  @ApiProperty({ description: 'Users with at least one device that accepted delivery' })
  delivered!: number;

  @ApiProperty({ description: 'Users recorded but with no successful device delivery yet' })
  undelivered!: number;
}

export class SendResultDto {
  @ApiProperty({ description: 'Notification row id recorded for this send' })
  notificationId!: string;

  @ApiProperty({ enum: ['SENT', 'FAILED', 'PENDING'] })
  status!: 'SENT' | 'FAILED' | 'PENDING';

  @ApiProperty({ description: 'Device tokens targeted' })
  deviceCount!: number;

  @ApiProperty({ description: 'Per-device outcome detail (Expo ticket status/errors)' })
  detail!: string;
}
