/**
 * Page-aware recursive chunker.
 *
 * Strategy:
 *  1. Split each page into paragraph segments (then sentences, then a hard
 *     character split) so we never exceed the target size with an atomic piece.
 *  2. Greedily pack segments into chunks up to `targetTokens`.
 *  3. Carry ~`overlapTokens` of trailing text into the next chunk so context
 *     that straddles a boundary is still retrievable.
 *
 * Each chunk records the page number of its first segment, which is what we
 * surface as the citation page. Token counts are estimated as chars / 4, a
 * good-enough heuristic that avoids pulling in a heavy tokenizer.
 */

export interface PageText {
  page: number; // 1-based
  text: string;
}

interface Chunk {
  content: string;
  page: number;
  chunkIndex: number;
  tokenCount: number;
}

interface ChunkOptions {
  targetTokens: number;
  overlapTokens: number;
}

interface Segment {
  text: string;
  page: number;
  tokens: number;
}

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function chunkPages(pages: PageText[], options: ChunkOptions): Chunk[] {
  const { targetTokens, overlapTokens } = options;
  const segments = buildSegments(pages, targetTokens);

  const chunks: Chunk[] = [];
  let current: Segment[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  const flush = () => {
    if (current.length === 0) return;
    const content = current
      .map((s) => s.text)
      .join(' ')
      .trim();
    if (content.length > 0) {
      chunks.push({
        content,
        page: current[0].page,
        chunkIndex: chunkIndex++,
        tokenCount: estimateTokens(content),
      });
    }
  };

  for (const seg of segments) {
    if (currentTokens + seg.tokens > targetTokens && current.length > 0) {
      flush();
      current = takeOverlap(current, overlapTokens);
      currentTokens = current.reduce((sum, s) => sum + s.tokens, 0);
    }
    current.push(seg);
    currentTokens += seg.tokens;
  }
  flush();

  return chunks;
}

function buildSegments(pages: PageText[], targetTokens: number): Segment[] {
  const segments: Segment[] = [];
  for (const { page, text } of pages) {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) continue;
    for (const para of splitParagraphs(normalized)) {
      for (const piece of enforceMaxSize(para, targetTokens)) {
        const trimmed = piece.trim();
        if (trimmed) segments.push({ text: trimmed, page, tokens: estimateTokens(trimmed) });
      }
    }
  }
  return segments;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Break a piece that is larger than the target into sentence- or char-sized pieces. */
function enforceMaxSize(text: string, targetTokens: number): string[] {
  if (estimateTokens(text) <= targetTokens) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+|\S+$/g) ?? [text];
  const out: string[] = [];
  let buf = '';
  for (const sentence of sentences) {
    if (estimateTokens(buf + sentence) > targetTokens && buf) {
      out.push(buf.trim());
      buf = '';
    }
    if (estimateTokens(sentence) > targetTokens) {
      out.push(...hardSplit(sentence, targetTokens));
    } else {
      buf += sentence;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function hardSplit(text: string, targetTokens: number): string[] {
  const maxChars = targetTokens * CHARS_PER_TOKEN;
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    out.push(text.slice(i, i + maxChars));
  }
  return out;
}

/** Keep trailing segments that together stay under the overlap budget. */
function takeOverlap(segments: Segment[], overlapTokens: number): Segment[] {
  if (overlapTokens <= 0) return [];
  const overlap: Segment[] = [];
  let tokens = 0;
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (tokens + seg.tokens > overlapTokens && overlap.length > 0) break;
    overlap.unshift(seg);
    tokens += seg.tokens;
  }
  return overlap;
}
