import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Hi Mara — is the appraisal scheduled yet?' })
  @IsString()
  @Length(1, 2000)
  body!: string;
}

export class MessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  threadId!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty({ example: 'Mara' })
  senderName!: string;

  @ApiProperty({ description: 'true when the sender is the loan team (LO/admin)' })
  fromStaff!: boolean;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  createdAt!: string;
}

export class ThreadMessagesDto {
  @ApiProperty()
  threadId!: string;

  @ApiProperty({ type: [MessageDto] })
  messages!: MessageDto[];
}

export class ThreadSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: 'Sarah Buyer' })
  userName!: string;

  @ApiProperty({ nullable: true, type: String })
  lastMessage!: string | null;

  @ApiProperty({ nullable: true, type: String })
  lastMessageAt!: string | null;

  @ApiProperty({ description: 'Borrower messages the staff side has not read yet' })
  unreadCount!: number;
}
