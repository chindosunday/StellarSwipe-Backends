import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RecommendationEngineService } from './recommendation-engine.service';
import { RecommendationRequestDto } from './dto/recommendation-request.dto';
import { RecommendedSignalsDto } from './dto/recommended-signals.dto';
import { PreferenceUpdateDto, RecordInteractionDto } from './dto/preference-update.dto';
import { RecUserPreference } from './entities/user-preference.entity';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly engine: RecommendationEngineService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get personalized signal recommendations for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max recommendations (1-50)' })
  @ApiQuery({ name: 'assetPair', required: false, type: String, description: 'Filter by asset pair e.g. XLM/USDC' })
  @ApiQuery({ name: 'maxRisk', required: false, type: Number, description: 'Max risk tolerance 0-1' })
  @ApiQuery({ name: 'forceRefresh', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: RecommendedSignalsDto })
  async getRecommendations(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
    @Query('assetPair') assetPair?: string,
    @Query('maxRisk') maxRisk?: number,
    @Query('forceRefresh') forceRefresh?: boolean,
  ): Promise<RecommendedSignalsDto> {
    const request: RecommendationRequestDto = {
      userId,
      limit: limit ? Number(limit) : 10,
      assetPairFilter: assetPair ? [assetPair] : undefined,
      maxRiskLevel: maxRisk !== undefined ? Number(maxRisk) : undefined,
      forceRefresh: forceRefresh === true || (forceRefresh as any) === 'true',
    };
    return this.engine.getRecommendations(request);
  }

  @Get(':userId/preferences')
  @ApiOperation({ summary: 'Get recommendation preferences for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: RecUserPreference })
  async getPreferences(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<RecUserPreference> {
    return this.engine.getOrCreatePreferences(userId);
  }

  @Put(':userId/preferences')
  @ApiOperation({ summary: 'Update recommendation preferences for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: RecUserPreference })
  async updatePreferences(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: PreferenceUpdateDto,
  ): Promise<RecUserPreference> {
    return this.engine.updatePreferences(userId, dto);
  }

  @Post(':userId/interactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record a user interaction with a signal (view, copy, dismiss, etc.)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'Interaction recorded' })
  async recordInteraction(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: RecordInteractionDto,
  ): Promise<void> {
    return this.engine.recordInteraction(userId, dto);
  }
}
