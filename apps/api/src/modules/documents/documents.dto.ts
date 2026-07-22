import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';

export class DocumentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ enum: DocumentStatus })
  status!: DocumentStatus;

  @ApiProperty()
  createdAt!: string;
}
