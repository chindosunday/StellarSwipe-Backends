import { StellarSwipeClient } from '../client';
import {
  PortfolioSummary,
  PortfolioHistory,
  PortfolioExportParams,
  Position,
  SetTargetAllocationData,
  DriftAnalysis,
  RebalancingPlan,
  RequestOptions,
} from '../types';

export class Portfolio {
  constructor(private client: StellarSwipeClient) {}

  async get(userId: string, options?: RequestOptions): Promise<PortfolioSummary> {
    return this.client.request<PortfolioSummary>(
      'GET',
      `/portfolio/performance?userId=${userId}`,
      undefined,
      options
    );
  }

  async getPositions(userId: string, options?: RequestOptions): Promise<Position[]> {
    return this.client.request<Position[]>(
      'GET',
      `/portfolio/positions?userId=${userId}`,
      undefined,
      options
    );
  }

  async getHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    options?: RequestOptions
  ): Promise<PortfolioHistory> {
    return this.client.request<PortfolioHistory>(
      'GET',
      `/portfolio/history?userId=${userId}&page=${page}&limit=${limit}`,
      undefined,
      options
    );
  }

  async export(
    userId: string,
    params: PortfolioExportParams,
    options?: RequestOptions
  ): Promise<any> {
    const queryParams = new URLSearchParams({ format: params.format });
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    return this.client.request(
      'GET',
      `/portfolio/export?userId=${userId}&${queryParams.toString()}`,
      undefined,
      options
    );
  }

  async setTargetAllocation(
    userId: string,
    data: SetTargetAllocationData,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request(
      'POST',
      `/portfolio/rebalancing/target?userId=${userId}`,
      data,
      options
    );
  }

  async getTargetAllocation(userId: string, options?: RequestOptions): Promise<any> {
    return this.client.request(
      'GET',
      `/portfolio/rebalancing/target?userId=${userId}`,
      undefined,
      options
    );
  }

  async analyzeDrift(
    userId: string,
    options?: RequestOptions
  ): Promise<DriftAnalysis> {
    return this.client.request<DriftAnalysis>(
      'GET',
      `/portfolio/rebalancing/drift?userId=${userId}`,
      undefined,
      options
    );
  }

  async createRebalancingPlan(
    userId: string,
    autoExecute: boolean = false,
    options?: RequestOptions
  ): Promise<RebalancingPlan> {
    return this.client.request<RebalancingPlan>(
      'POST',
      `/portfolio/rebalancing/plan?userId=${userId}&autoExecute=${autoExecute}`,
      undefined,
      options
    );
  }

  async getPendingPlans(
    userId: string,
    options?: RequestOptions
  ): Promise<RebalancingPlan[]> {
    return this.client.request<RebalancingPlan[]>(
      'GET',
      `/portfolio/rebalancing/plans/pending?userId=${userId}`,
      undefined,
      options
    );
  }

  async approvePlan(
    userId: string,
    planId: string,
    options?: RequestOptions
  ): Promise<RebalancingPlan> {
    return this.client.request<RebalancingPlan>(
      'PUT',
      `/portfolio/rebalancing/plans/${planId}/approve?userId=${userId}`,
      undefined,
      options
    );
  }
}
