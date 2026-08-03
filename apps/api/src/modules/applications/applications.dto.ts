import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ApplicationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  ariveLoanId!: string | null;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AriveHandoffDto {
  @ApiProperty({ description: 'Arive borrower portal URL where the 1003 application is completed' })
  url!: string;

  @ApiProperty({ enum: ['PORTAL'], description: 'PORTAL = borrower authenticates on Arive’s side' })
  mode!: 'PORTAL';
}

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;
}
