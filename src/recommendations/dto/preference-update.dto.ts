import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { InteractionType } from '../entities/interaction-matrix.entity';

export class RecordInteractionDto {
  @ApiProperty({ description: 'Signal UUID' })
  @IsUUID()
  signalId!: string;

  @ApiProperty({ enum: InteractionType })
  @IsEnum(InteractionType)
  interactionType!: InteractionType;

  @ApiPropertyOptional({ description: 'P&L outcome (PROFIT/LOSS interactions only)' })
  @IsOptional()
  @IsNumber()
  pnlOutcome?: number;
}

export class PreferenceUpdateDto {
  @ApiPropertyOptional({ description: 'Preferred asset pairs e.g. ["XLM/USDC"]' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredAssetPairs?: string[];

  @ApiPropertyOptional({ description: 'Asset pairs to exclude from recommendations' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedAssetPairs?: string[];

  @ApiPropertyOptional({ description: 'Provider UUIDs the user explicitly trusts' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  preferredProviderIds?: string[];

  @ApiPropertyOptional({ description: 'Risk tolerance 0 (conservative) – 1 (aggressive)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  explicitRiskTolerance?: number;

  @ApiPropertyOptional({ description: 'Maximum desired signal duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSignalDurationHours?: number;

  @ApiPropertyOptional({ description: 'Signal types the user is interested in', example: ['BUY', 'SELL'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSignalTypes?: string[];
}
