import { StellarSwipeClient } from '../client';
import {
  Signal,
  SignalFeed,
  SignalListParams,
  CreateSignalData,
  RequestOptions,
} from '../types';

export class Signals {
  constructor(private client: StellarSwipeClient) {}

  async list(
    params?: SignalListParams,
    options?: RequestOptions
  ): Promise<SignalFeed> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const path = queryString ? `/signals?${queryString}` : '/signals';

    const signals = await this.client.request<Signal[]>('GET', path, undefined, options);

    return {
      signals,
      hasMore: false,
    };
  }

  async get(id: string, options?: RequestOptions): Promise<Signal> {
    return this.client.request<Signal>('GET', `/signals/${id}`, undefined, options);
  }

  async create(
    data: CreateSignalData,
    options?: RequestOptions
  ): Promise<Signal> {
    return this.client.request<Signal>('POST', '/signals', data, options);
  }

  async getFeed(
    params?: SignalListParams,
    options?: RequestOptions
  ): Promise<SignalFeed> {
    return this.list(params, options);
  }

  async getByProvider(
    providerId: string,
    params?: Omit<SignalListParams, 'providerId'>,
    options?: RequestOptions
  ): Promise<SignalFeed> {
    return this.list({ ...params, providerId }, options);
  }

  async getByAssetPair(
    assetPair: string,
    params?: Omit<SignalListParams, 'assetPair'>,
    options?: RequestOptions
  ): Promise<SignalFeed> {
    return this.list({ ...params, assetPair }, options);
  }
}
