import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AmortizationPdfRequestDto {
  @ApiProperty({ description: 'Loan amount in dollars', example: 200000 })
  @IsNumber()
  @Min(1)
  @Max(100_000_000)
  principal!: number;

  @ApiProperty({ description: 'Annual rate percentage', example: 6.5 })
  @IsNumber()
  @Min(0)
  @Max(30)
  annualRatePct!: number;

  @ApiProperty({ description: 'Term in months', example: 360 })
  @IsInt()
  @Min(1)
  @Max(600)
  termMonths!: number;

  @ApiPropertyOptional({ description: 'Label shown on the PDF header', example: '123 Main St' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional({ description: 'Extra principal every month (dollars)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  extraMonthly?: number;

  @ApiPropertyOptional({ description: 'Annual lump sum applied every 12th payment (dollars)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  extraAnnual?: number;

  @ApiPropertyOptional({ description: 'One-time extra payment amount (dollars)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  oneTimeAmount?: number;

  @ApiPropertyOptional({ description: 'Payment number the one-time extra applies to' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  oneTimeMonth?: number;
}
