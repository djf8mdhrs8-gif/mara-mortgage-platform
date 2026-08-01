import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const CALCULATOR_KEYS = [
  'quick',
  'basic',
  'extra',
  'refinance',
  'affordability',
  'rent-vs-buy',
  'buydown',
  'property',
] as const;
export type CalculatorKey = (typeof CALCULATOR_KEYS)[number];

export class AssumptionsDto {
  @ApiPropertyOptional({ example: 6.5, description: 'Default annual rate (%) prefilled in calculators' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(25)
  defaultRatePct?: number;

  @ApiPropertyOptional({ example: 0.85, description: 'Default PMI (%/yr of loan) while LTV > 80%' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  pmiAnnualPct?: number;

  @ApiPropertyOptional({ example: 1.1, description: 'Default property tax (%/yr of value)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  propertyTaxAnnualPct?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Default homeowners insurance ($/yr)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50_000)
  homeInsuranceAnnual?: number;
}

export class CalculatorToggleDto {
  @ApiProperty({ enum: CALCULATOR_KEYS })
  @IsIn(CALCULATOR_KEYS)
  key!: CalculatorKey;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

export class UpdateCalculatorConfigDto {
  @ApiPropertyOptional({ type: AssumptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssumptionsDto)
  assumptions?: AssumptionsDto;

  @ApiPropertyOptional({ type: [CalculatorToggleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculatorToggleDto)
  calculators?: CalculatorToggleDto[];
}

export class CalculatorStateDto {
  @ApiProperty({ enum: CALCULATOR_KEYS })
  key!: CalculatorKey;

  @ApiProperty({ example: 'Rate Buydown' })
  title!: string;

  @ApiProperty()
  enabled!: boolean;
}

export class CalculatorConfigDto {
  @ApiProperty({ type: AssumptionsDto, description: 'Effective values — admin overrides merged over code defaults' })
  assumptions!: Required<AssumptionsDto>;

  @ApiProperty({ type: [CalculatorStateDto] })
  calculators!: CalculatorStateDto[];
}
