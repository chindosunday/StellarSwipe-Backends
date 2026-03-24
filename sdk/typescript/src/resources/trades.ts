import { StellarSwipeClient } from '../client';
import {
  Trade,
  ExecuteTradeData,
  TradeValidation,
  CloseTradeData,
  PartialCloseData,
  TradeListParams,
  TradeSummary,
  RequestOptions,
} from '../types';

export class Trades {
  constructor(private client: StellarSwipeClient) {}

  async execute(
    data: ExecuteTradeData,
    options?: RequestOptions
  ): Promise<Trade> {
    return this.client.request<Trade>('POST', '/trades/execute', data, options);
  }

  async validate(
    data: ExecuteTradeData,
    options?: RequestOptions
  ): Promise<TradeValidation> {
    return this.client.request<TradeValidation>(
      'POST',
      '/trades/validate',
      data,
      options
    );
  }

  async close(
    data: CloseTradeData,
    options?: RequestOptions
  ): Promise<Trade> {
    return this.client.request<Trade>('POST', '/trades/close', data, options);
  }

  async partialClose(
    data: PartialCloseData,
    options?: RequestOptions
  ): Promise<Trade> {
    return this.client.request<Trade>(
      'POST',
      '/trades/partial-close',
      data,
      options
    );
  }

  async get(tradeId: string, userId: string, options?: RequestOptions): Promise<Trade> {
    return this.client.request<Trade>(
      'GET',
      `/trades/${tradeId}?userId=${userId}`,
      undefined,
      options
    );
  }

  async list(params: TradeListParams, options?: RequestOptions): Promise<Trade[]> {
    const { userId, status, limit, offset } = params;
    const queryParams = new URLSearchParams({ userId });

    if (status) queryParams.append('status', status);
    if (limit) queryParams.append('limit', String(limit));
    if (offset) queryParams.append('offset', String(offset));

    return this.client.request<Trade[]>(
      'GET',
      `/trades/user/${userId}?${queryParams.toString()}`,
      undefined,
      options
    );
  }

  async getSummary(userId: string, options?: RequestOptions): Promise<TradeSummary> {
    return this.client.request<TradeSummary>(
      'GET',
      `/trades/user/${userId}/summary`,
      undefined,
      options
    );
  }

  async getOpenPositions(userId: string, options?: RequestOptions): Promise<Trade[]> {
    return this.client.request<Trade[]>(
      'GET',
      `/trades/user/${userId}/positions`,
      undefined,
      options
    );
  }

  async getBySignal(signalId: string, options?: RequestOptions): Promise<Trade[]> {
    return this.client.request<Trade[]>(
      'GET',
      `/trades/signal/${signalId}`,
      undefined,
      options
    );
  }

  async getRiskParameters(options?: RequestOptions): Promise<any> {
    return this.client.request('GET', '/trades/risk/parameters', undefined, options);
  }
}
