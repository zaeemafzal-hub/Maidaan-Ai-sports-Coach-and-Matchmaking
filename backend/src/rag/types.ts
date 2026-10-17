export interface KnowledgeChunk {
  id: string;
  source: string;
  section: string;
  content: string;
  tokensOrLength?: number;
}

export interface RetrievedKnowledge {
  id: string;
  source: string;
  section: string;
  content: string;
  score: number;
}

export interface SourceMetadata {
  source: string;
  section: string;
}

export interface RAGRetrieveOptions {
  topK?: number;
  minScore?: number;
  filterSource?: string;
}
