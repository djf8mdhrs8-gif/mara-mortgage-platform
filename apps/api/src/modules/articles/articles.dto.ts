import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ArticleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  excerpt!: string | null;

  @ApiProperty({ description: 'Long-form body; paragraphs separated by blank lines' })
  content!: string;

  @ApiProperty()
  published!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  publishedAt!: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateArticleDto {
  @ApiProperty({ example: 'five-credit-myths' })
  @IsString()
  @Matches(/^[a-z0-9-]{2,60}$/)
  slug!: string;

  @ApiProperty({ example: 'Five Credit Myths That Cost Homebuyers' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title!: string;

  @ApiPropertyOptional({ example: 'What actually moves your score — and what doesn’t.' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  excerpt?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  content!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
