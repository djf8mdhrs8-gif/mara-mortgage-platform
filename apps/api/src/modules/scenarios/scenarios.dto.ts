import { ApiProperty } from '@nestjs/swagger';
import { ScenarioType } from '@prisma/client';
import { IsBoolean, IsEnum, IsObject, IsString, Length } from 'class-validator';

export class SaveScenarioDto {
  @ApiProperty({ enum: ScenarioType, enumName: 'ScenarioType' })
  @IsEnum(ScenarioType)
  type!: ScenarioType;

  @ApiProperty({ example: 'Maple St house, 20% down' })
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({
    description:
      'Calculator inputs exactly as the engine accepts them. Outputs are always recomputed server-side — client-computed results are never stored.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  inputs!: Record<string, unknown>;
}

export class UpdateScenarioDto {
  @ApiProperty({ description: 'Pin/unpin — favorites sort first in the list.' })
  @IsBoolean()
  favorite!: boolean;
}

export class ScenarioDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  favorite!: boolean;

  @ApiProperty({ enum: ScenarioType, enumName: 'ScenarioType' })
  type!: ScenarioType;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  inputs!: Record<string, unknown>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Server-computed results (amortization schedules omitted for size — recompute on device when needed).',
  })
  outputs!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
