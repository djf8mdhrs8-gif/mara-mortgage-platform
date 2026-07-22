import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

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
