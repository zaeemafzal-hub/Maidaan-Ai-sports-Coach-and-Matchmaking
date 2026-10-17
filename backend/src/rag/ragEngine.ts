import { KnowledgeChunk, RetrievedKnowledge, RAGRetrieveOptions } from './types.js';
import { loadAllKnowledgeChunks } from './knowledgeLoader.js';

// Standard English stop words
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself',
  'give', 'gives', 'given', 'tell', 'tells', 'told', 'make', 'makes', 'made', 'know', 'knows', 'want', 'wants', 'like', 'likes', 'please',
]);

// Domain-critical keywords that must never be filtered out
const DOMAIN_TERMS = new Set([
  'cricket', 'football', 'badminton', 'padel',
  'captain', 'hub', 'player', 'admin',
  'indoor', 'outdoor', 'caution', 'suitable', 'preferred',
  'join', 'request', 'verification', 'verified',
  'coach', 'weather', 'match', 'slot', 'sport', 'sports',
]);

function normalizeToken(token: string): string {
  let word = token.toLowerCase();
  // Simple light stemmer for English plurals and progressive verbs
  if (word.endsWith('ies')) word = word.slice(0, -3) + 'y';
  else if (word.endsWith('es') && !word.endsWith('les') && !word.endsWith('ses')) word = word.slice(0, -2);
  else if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) word = word.slice(0, -1);
  return word;
}

export class RAGEngine {
  private chunks: KnowledgeChunk[] = [];
  private docFrequencies: Map<string, number> = new Map();
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private chunkTokens: string[][] = [];
  private isInitialized: boolean = false;

  // BM25 Hyperparameters
  private readonly k1 = 1.2;
  private readonly b = 0.75;

  constructor(customChunks?: KnowledgeChunk[]) {
    if (customChunks) {
      this.initialize(customChunks);
    } else {
      this.initialize();
    }
  }

  /**
   * Initializes and indexes knowledge chunks in memory.
   */
  public initialize(providedChunks?: KnowledgeChunk[]): void {
    this.chunks = providedChunks || loadAllKnowledgeChunks();
    this.chunkTokens = [];
    this.docLengths = [];
    this.docFrequencies.clear();

    let totalLength = 0;

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      // Boost section title and filename to give strong lexical weight to document headers
      const fullText = `${chunk.source} ${chunk.section} ${chunk.section} ${chunk.section} ${chunk.content}`;
      const tokens = this.tokenize(fullText);

      this.chunkTokens.push(tokens);
      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const uniqueTermsInDoc = new Set(tokens);
      for (const term of uniqueTermsInDoc) {
        this.docFrequencies.set(term, (this.docFrequencies.get(term) || 0) + 1);
      }
    }

    this.avgDocLength = this.chunks.length > 0 ? totalLength / this.chunks.length : 0;
    this.isInitialized = true;
  }

  /**
   * Tokenizes and normalizes text into searchable word stems.
   */
  public tokenize(text: string): string[] {
    const rawTokens = text
      .toLowerCase()
      .replace(/[_\W]+/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    const filtered: string[] = [];
    for (const t of rawTokens) {
      const stemmed = normalizeToken(t);
      if (DOMAIN_TERMS.has(t) || DOMAIN_TERMS.has(stemmed) || !STOP_WORDS.has(t)) {
        filtered.push(stemmed);
      }
    }
    return filtered;
  }

  /**
   * Computes BM25 score for a document given query terms.
   */
  private scoreDocument(queryTerms: string[], docIdx: number): number {
    const N = this.chunks.length;
    const docTokens = this.chunkTokens[docIdx];
    const docLength = this.docLengths[docIdx];

    // Compute Term Frequencies for this doc
    const termFreqs = new Map<string, number>();
    for (const token of docTokens) {
      termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
    }

    let score = 0;

    for (const term of queryTerms) {
      const tf = termFreqs.get(term) || 0;
      if (tf === 0) continue;

      const n = this.docFrequencies.get(term) || 0;
      // Robertson-Spärck Jones IDF
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));

      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / (this.avgDocLength || 1)));

      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Retrieves top-K relevant knowledge chunks for a query.
   */
  public retrieve(query: string, options: RAGRetrieveOptions = {}): RetrievedKnowledge[] {
    if (!this.isInitialized || this.chunks.length === 0) {
      this.initialize();
    }

    const topK = options.topK && options.topK > 0 ? Math.min(options.topK, 5) : 3;
    const minScore = options.minScore !== undefined ? options.minScore : 1.2;
    const filterSource = options.filterSource;

    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) {
      return [];
    }

    const scored: RetrievedKnowledge[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];

      if (filterSource && !chunk.source.toLowerCase().includes(filterSource.toLowerCase())) {
        continue;
      }

      const score = this.scoreDocument(queryTerms, i);
      if (score >= minScore) {
        scored.push({
          id: chunk.id,
          source: chunk.source,
          section: chunk.section,
          content: chunk.content,
          score: Number(score.toFixed(4)),
        });
      }
    }

    // Sort descending by relevance score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  /**
   * Returns total count of indexed chunks.
   */
  public getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Returns list of loaded knowledge documents.
   */
  public getLoadedSources(): string[] {
    return Array.from(new Set(this.chunks.map((c) => c.source)));
  }
}

// Global Singleton Instance
export const sharedRAGEngine = new RAGEngine();
