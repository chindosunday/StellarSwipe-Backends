import { ISimilarityMetric, SimilarityMethod, SimilarUser, SimilarSignal } from '../interfaces/similarity-metric.interface';

// ── Metric implementations ────────────────────────────────────────────────

export class CosineSimilarity implements ISimilarityMetric {
  readonly method = SimilarityMethod.COSINE;

  compute(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : Math.max(-1, Math.min(1, dot / denom));
  }
}

export class PearsonSimilarity implements ISimilarityMetric {
  readonly method = SimilarityMethod.PEARSON;

  compute(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length < 2) return 0;
    const n = a.length;
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;
    let cov = 0, varA = 0, varB = 0;
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      cov += da * db;
      varA += da * da;
      varB += db * db;
    }
    const denom = Math.sqrt(varA * varB);
    return denom === 0 ? 0 : Math.max(-1, Math.min(1, cov / denom));
  }
}

export class JaccardSimilarity implements ISimilarityMetric {
  readonly method = SimilarityMethod.JACCARD;

  /** Treats non-zero entries as set membership. */
  compute(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let intersection = 0, union = 0;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] > 0 ? 1 : 0;
      const bi = b[i] > 0 ? 1 : 0;
      if (ai === 1 && bi === 1) intersection++;
      if (ai === 1 || bi === 1) union++;
    }
    return union === 0 ? 0 : intersection / union;
  }
}

export class EuclideanSimilarity implements ISimilarityMetric {
  readonly method = SimilarityMethod.EUCLIDEAN;

  /** Returns 1 / (1 + distance) so closer vectors → higher similarity. */
  compute(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    const dist = Math.sqrt(a.reduce((s, v, i) => s + Math.pow(v - b[i], 2), 0));
    return 1 / (1 + dist);
  }
}

// ── SimilarityCalculator ──────────────────────────────────────────────────

export class SimilarityCalculator {
  private readonly cosine = new CosineSimilarity();
  private readonly pearson = new PearsonSimilarity();

  /**
   * Finds the top-k most similar users to `targetUserId` given a sparse
   * user-item rating matrix (userId → signalId → rating).
   */
  findSimilarUsers(
    targetUserId: string,
    ratingMatrix: Map<string, Map<string, number>>,
    topK = 20,
    method: SimilarityMethod = SimilarityMethod.COSINE,
  ): SimilarUser[] {
    const targetRatings = ratingMatrix.get(targetUserId);
    if (!targetRatings || targetRatings.size === 0) return [];

    // Build union of all item IDs
    const allItems = new Set<string>();
    for (const ratings of ratingMatrix.values()) {
      for (const item of ratings.keys()) allItems.add(item);
    }
    const items = [...allItems];

    const targetVec = items.map((i) => targetRatings.get(i) ?? 0);
    const metric = method === SimilarityMethod.PEARSON ? this.pearson : this.cosine;

    const similarities: SimilarUser[] = [];

    for (const [userId, ratings] of ratingMatrix.entries()) {
      if (userId === targetUserId) continue;
      // Only compute if there's at least 2 items in common
      const commonCount = items.filter((i) => (targetRatings.get(i) ?? 0) !== 0 && (ratings.get(i) ?? 0) !== 0).length;
      if (commonCount < 2) continue;

      const vec = items.map((i) => ratings.get(i) ?? 0);
      const similarity = metric.compute(targetVec, vec);
      if (similarity > 0.05) {
        similarities.push({ userId, similarity });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Finds the top-k most similar signals to `targetSignalId` based on
   * content feature vectors.
   */
  findSimilarSignals(
    targetSignalId: string,
    featureVectors: Map<string, number[]>,
    topK = 20,
  ): SimilarSignal[] {
    const targetVec = featureVectors.get(targetSignalId);
    if (!targetVec) return [];

    const similarities: SimilarSignal[] = [];
    for (const [signalId, vec] of featureVectors.entries()) {
      if (signalId === targetSignalId) continue;
      const similarity = this.cosine.compute(targetVec, vec);
      if (similarity > 0.05) {
        similarities.push({ signalId, similarity });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Normalizes ratings using mean-centering per user (handles rating scale
   * differences between users).
   */
  static meanCenter(ratings: Map<string, number>): Map<string, number> {
    if (ratings.size === 0) return ratings;
    const values = [...ratings.values()];
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const centered = new Map<string, number>();
    for (const [id, r] of ratings.entries()) {
      centered.set(id, r - mean);
    }
    return centered;
  }
}
