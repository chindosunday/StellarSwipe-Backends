import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommenderType, RecommendationReason } from '../interfaces/recommender.interface';

export class EngineContributionDto {
  @ApiProperty({ enum: RecommenderType })
  engine!: RecommenderType;

  @ApiProperty({ description: 'Contribution weight 0-1' })
  weight!: number;
}

export class RecommendedSignalDto {
  @ApiProperty({ description: 'Recommendation record UUID' })
  recommendationId!: string;

  @ApiProperty({ description: 'Signal UUID' })
  signalId!: string;

  @ApiProperty({ description: 'Provider UUID' })
  providerId!: string;

  @ApiProperty({ description: 'Asset pair e.g. XLM/USDC' })
  assetPair!: string;

  @ApiProperty({ description: 'Relevance score 0-100' })
  score!: number;

  @ApiProperty({ description: 'Rank within this response (1 = best)' })
  rank!: number;

  @ApiProperty({ enum: RecommendationReason, isArray: true })
  reasons!: RecommendationReason[];

  @ApiPropertyOptional({ type: [EngineContributionDto] })
  engineContributions?: EngineContributionDto[];

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  generatedAt!: Date;
}

export class RecommendedSignalsDto {
  @ApiProperty({ description: 'User UUID' })
  userId!: string;

  @ApiProperty({ type: [RecommendedSignalDto] })
  recommendations!: RecommendedSignalDto[];

  @ApiProperty({ description: 'Total count before limit' })
  total!: number;

  @ApiProperty({ description: 'True if response was served from cache' })
  fromCache!: boolean;

  @ApiProperty()
  generatedAt!: Date;

  @ApiPropertyOptional({ description: 'True if the user is new and CF data is limited (cold-start mode)' })
  coldStart?: boolean;
}
