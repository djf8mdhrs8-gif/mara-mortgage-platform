import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ContentBlockDto {
  @ApiProperty({ example: 'compliance.footer' })
  key!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class UpsertContentBlockDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  body!: string;
}
