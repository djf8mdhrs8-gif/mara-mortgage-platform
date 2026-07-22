import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class LoanProgramDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty({ description: 'Long-form body; paragraphs separated by blank lines' })
  content!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  published!: boolean;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateLoanProgramDto {
  @ApiProperty({ example: 'fha', description: 'URL-safe identifier' })
  @IsString()
  @Matches(/^[a-z0-9-]{2,60}$/)
  slug!: string;

  @ApiProperty({ example: 'FHA Loans' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'Flexible credit requirements with as little as 3.5% down.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  summary!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  content!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateLoanProgramDto extends PartialType(CreateLoanProgramDto) {}
