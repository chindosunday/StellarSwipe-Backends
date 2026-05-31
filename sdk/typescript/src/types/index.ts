export interface Signal {
  id: string;
  providerId: string;
  assetPair: string;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  confidence: number;
  reasoning: string;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  performance?: {
    roi: number;
    pnl: number;
  };
}

export interface CreateSignalData {
  providerId: string;
  assetPair: string;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  confidence: number;
  reasoning: string;
  expiresAt?: string;
}

export interface SignalListParams {
  cursor?: string;
  limit?: number;
  assetPair?: string;
  providerId?: string;
  status?: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
  sortBy?: 'createdAt' | 'performance' | 'confidence';
  order?: 'asc' | 'desc';
}

export interface SignalFeed {
  signals: Signal[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface Trade {
  id: string;
  userId: string;
  signalId: string;
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  assetPair: string;
  pnl?: number;
  roi?: number;
  createdAt: string;
  closedAt?: string;
}

export interface ExecuteTradeData {
  userId: string;
  signalId: string;
  amount: number;
  slippage?: number;
}

export interface TradeValidation {
  valid: boolean;
  estimatedCost: number;
  estimatedFees: number;
  priceImpact: number;
  errors?: string[];
  warnings?: string[];
}

export interface CloseTradeData {
  userId: string;
  tradeId: string;
}

export interface PartialCloseData {
  userId: string;
  tradeId: string;
  percentage: number;
}

export interface TradeListParams {
  userId: string;
  status?: 'OPEN' | 'CLOSED' | 'PENDING';
  limit?: number;
  offset?: number;
}

export interface TradeSummary {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalPnL: number;
  averageRoi: number;
  winRate: number;
}

export interface Position {
  assetCode: string;
  amount: number;
  value: number;
  percentage: number;
  averageEntryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
}

export interface PortfolioSummary {
  userId: string;
  totalValue: number;
  totalPnL: number;
  roi: number;
  positions: Position[];
  lastUpdated: string;
}

export interface PortfolioHistory {
  data: Trade[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PortfolioExportParams {
  format: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
}

export interface TargetAllocation {
  assetCode: string;
  targetPercentage: number;
}

export interface SetTargetAllocationData {
  allocations: TargetAllocation[];
  driftThresholdPercent?: number;
  autoRebalance?: boolean;
}

export interface DriftAnalysis {
  requiresRebalancing: boolean;
  totalDrift: number;
  drifts: Array<{
    assetCode: string;
    currentPercentage: number;
    targetPercentage: number;
    drift: number;
  }>;
}

export interface RebalancingPlan {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'EXECUTED' | 'REJECTED';
  trades: Array<{
    assetCode: string;
    action: 'BUY' | 'SELL';
    amount: number;
    estimatedCost: number;
  }>;
  totalCost: number;
  createdAt: string;
  executedAt?: string;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}
