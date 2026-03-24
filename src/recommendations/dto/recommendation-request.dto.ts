import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class RecommendationRequestDto {
  @ApiProperty({ description: 'User UUID to generate recommendations for' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Maximum number of recommendations to return', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Only recommend signals for these asset pairs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetPairFilter?: string[];

  @ApiPropertyOptional({ description: 'Exclude these signal IDs from results' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  excludeSignalIds?: string[];

  @ApiPropertyOptional({ description: 'Maximum risk tolerance 0-1', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxRiskLevel?: number;

  @ApiPropertyOptional({ description: 'Force refresh — bypass recommendation cache', default: false })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}
