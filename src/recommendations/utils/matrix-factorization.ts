/**
 * Stochastic Gradient Descent Matrix Factorization (SVD-style).
 *
 * Decomposes the user-item interaction matrix R ≈ P × Q^T where:
 *   P  — user latent factor matrix  (users × k)
 *   Q  — item latent factor matrix  (items × k)
 *   k  — number of latent dimensions
 *
 * Biases for users (bu) and items (bi) are included so that:
 *   r̂_ui = μ + bu + bi + P_u · Q_i
 */

export interface MFConfig {
  k: number;          // Latent dimensions
  epochs: number;     // Training iterations
  lr: number;         // Learning rate
  reg: number;        // L2 regularization factor
  minRating: number;
  maxRating: number;
}

const DEFAULT_CONFIG: MFConfig = {
  k: 16,
  epochs: 30,
  lr: 0.005,
  reg: 0.02,
  minRating: -1,
  maxRating: 2,
};

export interface MFResult {
  userVectors: Map<string, number[]>;  // userId → k-dim vector
  itemVectors: Map<string, number[]>;  // itemId → k-dim vector
  userBiases: Map<string, number>;
  itemBiases: Map<string, number>;
  globalMean: number;
  trainingLoss: number;
  epochs: number;
}

export interface MFState {
  config: MFConfig;
  userIds: string[];
  itemIds: string[];
  P: number[][];  // [userIdx][k]
  Q: number[][];  // [itemIdx][k]
  bu: number[];   // user biases
  bi: number[];   // item biases
  mu: number;     // global mean
}

export class MatrixFactorization {
  private config: MFConfig;

  constructor(config: Partial<MFConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Trains the model on a sparse rating matrix.
   * @param ratings Map<userId, Map<itemId, rating>>
   */
  fit(ratings: Map<string, Map<string, number>>): MFResult {
    const { k, epochs, lr, reg } = this.config;

    const userIds = [...ratings.keys()];
    const itemIdSet = new Set<string>();
    for (const r of ratings.values()) for (const id of r.keys()) itemIdSet.add(id);
    const itemIds = [...itemIdSet];

    const userIdx = new Map(userIds.map((id, i) => [id, i]));
    const itemIdx = new Map(itemIds.map((id, i) => [id, i]));

    // Collect all observed ratings
    const observations: Array<[number, number, number]> = [];
    let ratingSum = 0;
    for (const [uid, itemRatings] of ratings.entries()) {
      const ui = userIdx.get(uid)!;
      for (const [iid, r] of itemRatings.entries()) {
        const ii = itemIdx.get(iid);
        if (ii === undefined) continue;
        observations.push([ui, ii, r]);
        ratingSum += r;
      }
    }

    if (observations.length === 0) {
      return this.emptyResult(userIds, itemIds, k);
    }

    const mu = ratingSum / observations.length;

    // Initialize latent factors with small random values
    const P = Array.from({ length: userIds.length }, () =>
      Array.from({ length: k }, () => (Math.random() - 0.5) * 0.1),
    );
    const Q = Array.from({ length: itemIds.length }, () =>
      Array.from({ length: k }, () => (Math.random() - 0.5) * 0.1),
    );
    const bu = new Array(userIds.length).fill(0);
    const bi = new Array(itemIds.length).fill(0);

    let finalLoss = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle observations
      this.shuffle(observations);
      let epochLoss = 0;

      for (const [ui, ii, r] of observations) {
        const predicted = this.dot(P[ui], Q[ii]) + bu[ui] + bi[ii] + mu;
        const error = r - predicted;
        epochLoss += error * error;

        // Update biases
        bu[ui] += lr * (error - reg * bu[ui]);
        bi[ii] += lr * (error - reg * bi[ii]);

        // Update latent factors
        for (let f = 0; f < k; f++) {
          const puf = P[ui][f];
          const qif = Q[ii][f];
          P[ui][f] += lr * (error * qif - reg * puf);
          Q[ii][f] += lr * (error * puf - reg * qif);
        }
      }

      finalLoss = epochLoss / observations.length;
    }

    // Build result maps
    const userVectors = new Map(userIds.map((id, i) => [id, P[i].slice()]));
    const itemVectors = new Map(itemIds.map((id, i) => [id, Q[i].slice()]));
    const userBiases = new Map(userIds.map((id, i) => [id, bu[i]]));
    const itemBiases = new Map(itemIds.map((id, i) => [id, bi[i]]));

    return { userVectors, itemVectors, userBiases, itemBiases, globalMean: mu, trainingLoss: finalLoss, epochs };
  }

  /**
   * Predicts a user's rating for an item using already-fitted vectors.
   */
  predict(
    result: MFResult,
    userId: string,
    itemId: string,
  ): number {
    const pu = result.userVectors.get(userId);
    const qi = result.itemVectors.get(itemId);
    if (!pu || !qi) return result.globalMean;

    const score =
      result.globalMean +
      (result.userBiases.get(userId) ?? 0) +
      (result.itemBiases.get(itemId) ?? 0) +
      this.dot(pu, qi);

    return Math.max(this.config.minRating, Math.min(this.config.maxRating, score));
  }

  /**
   * Returns the top-k items for a user that they have NOT yet interacted with.
   */
  topK(
    result: MFResult,
    userId: string,
    seenItemIds: Set<string>,
    k = 20,
  ): Array<{ itemId: string; score: number }> {
    const candidates: Array<{ itemId: string; score: number }> = [];
    for (const itemId of result.itemVectors.keys()) {
      if (seenItemIds.has(itemId)) continue;
      candidates.push({ itemId, score: this.predict(result, userId, itemId) });
    }
    return candidates.sort((a, b) => b.score - a.score).slice(0, k);
  }

  serialize(result: MFResult): Record<string, any> {
    return {
      userVectors: Object.fromEntries(result.userVectors),
      itemVectors: Object.fromEntries(result.itemVectors),
      userBiases: Object.fromEntries(result.userBiases),
      itemBiases: Object.fromEntries(result.itemBiases),
      globalMean: result.globalMean,
      trainingLoss: result.trainingLoss,
      epochs: result.epochs,
    };
  }

  deserialize(data: Record<string, any>): MFResult {
    return {
      userVectors: new Map(Object.entries(data.userVectors)),
      itemVectors: new Map(Object.entries(data.itemVectors)),
      userBiases: new Map(Object.entries(data.userBiases)),
      itemBiases: new Map(Object.entries(data.itemBiases)),
      globalMean: data.globalMean,
      trainingLoss: data.trainingLoss,
      epochs: data.epochs,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private dot(a: number[], b: number[]): number {
    return a.reduce((s, v, i) => s + v * b[i], 0);
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private emptyResult(userIds: string[], itemIds: string[], k: number): MFResult {
    return {
      userVectors: new Map(userIds.map((id) => [id, new Array(k).fill(0)])),
      itemVectors: new Map(itemIds.map((id) => [id, new Array(k).fill(0)])),
      userBiases: new Map(userIds.map((id) => [id, 0])),
      itemBiases: new Map(itemIds.map((id) => [id, 0])),
      globalMean: 0,
      trainingLoss: 0,
      epochs: 0,
    };
  }
}
