export enum SimilarityMethod {
  COSINE = 'COSINE',
  PEARSON = 'PEARSON',
  JACCARD = 'JACCARD',
  EUCLIDEAN = 'EUCLIDEAN',
}

export interface SimilarUser {
  userId: string;
  similarity: number; // 0-1
}

export interface SimilarSignal {
  signalId: string;
  similarity: number; // 0-1
}

export interface ISimilarityMetric {
  compute(a: number[], b: number[]): number;
  method: SimilarityMethod;
}
