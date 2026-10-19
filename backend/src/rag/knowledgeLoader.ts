import fs from 'fs';
import path from 'path';
import { KnowledgeChunk } from './types.js';
import { chunkMarkdownDocument } from './chunker.js';

// Explicitly approved knowledge filenames (prevents path traversal)
const APPROVED_KNOWLEDGE_FILES = [
  'faq.md',
  'roles.md',
  'matchmaking.md',
  'join-requests.md',
  'captain-rules.md',
  'hub-verification.md',
  'weather.md',
  'ai-coach.md',
  'safety.md',
];

/**
 * Resolves the absolute directory of knowledge markdown files across dev and build environments.
 */
function getKnowledgeDir(): string {
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const candidates = [
    path.resolve(currentDir, 'knowledge'),
    path.resolve(currentDir, '../../src/rag/knowledge'),
    path.resolve(process.cwd(), 'src/rag/knowledge'),
    path.resolve(process.cwd(), 'backend/src/rag/knowledge'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

/**
 * Loads and chunks all approved static Maidaan markdown knowledge documents.
 */
export function loadAllKnowledgeChunks(): KnowledgeChunk[] {
  const knowledgeDir = getKnowledgeDir();
  const allChunks: KnowledgeChunk[] = [];
  const seenIds = new Set<string>();

  if (!fs.existsSync(knowledgeDir)) {
    console.warn(`[KnowledgeLoader] Knowledge directory not found at: ${knowledgeDir}`);
    throw new Error('Required RAG knowledge directory is missing: ' + knowledgeDir);
  }

  for (const filename of APPROVED_KNOWLEDGE_FILES) {
    const fullPath = path.join(knowledgeDir, filename);

    try {
      if (!fs.existsSync(fullPath)) {
        console.warn(`[KnowledgeLoader] Approved knowledge file missing: ${filename}`);
        throw new Error('Required RAG file missing: ' + filename);
      }

      const rawContent = fs.readFileSync(fullPath, 'utf-8');
      const docChunks = chunkMarkdownDocument(filename, rawContent);

      for (const chunk of docChunks) {
        if (!chunk.content || chunk.content.trim().length === 0) {
          continue;
        }

        // Ensure unique IDs
        let uniqueId = chunk.id;
        let suffix = 1;
        while (seenIds.has(uniqueId)) {
          uniqueId = `${chunk.id}_${suffix++}`;
        }
        chunk.id = uniqueId;
        seenIds.add(uniqueId);

        allChunks.push(chunk);
      }
    } catch (err: any) {
      throw new Error('Could not load required RAG file ' + filename + ': ' + err.message);
    }
  }

  return allChunks;
}
