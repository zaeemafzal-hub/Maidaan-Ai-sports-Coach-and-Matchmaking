import { KnowledgeChunk } from './types.js';

/**
 * Splits Markdown text into section-aware chunks based on heading hierarchies.
 * Preserves heading context and metadata within each chunk.
 */
export function chunkMarkdownDocument(source: string, rawText: string): KnowledgeChunk[] {
  const lines = rawText.split('\n');
  const chunks: KnowledgeChunk[] = [];

  let currentTitle = 'Overview';
  let currentLines: string[] = [];
  let chunkIndex = 0;

  function flushChunk() {
    const text = currentLines.join('\n').trim();
    if (text.length > 0) {
      const cleanSource = source.replace(/\\/g, '/').split('/').pop() || source;
      const id = `${cleanSource.replace(/\.md$/i, '')}_sec_${chunkIndex++}`;
      chunks.push({
        id,
        source: cleanSource,
        section: currentTitle,
        content: text,
        tokensOrLength: text.length,
      });
    }
    currentLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Split on H1 or H2 markdown headings
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
      // If we already have accumulated text, flush previous chunk
      if (currentLines.length > 0) {
        flushChunk();
      }
      currentTitle = trimmed.replace(/^#+\s*/, '').trim();
      currentLines.push(line);
    } else {
      currentLines.push(line);
    }
  }

  // Flush remaining text
  if (currentLines.length > 0) {
    flushChunk();
  }

  return chunks;
}
