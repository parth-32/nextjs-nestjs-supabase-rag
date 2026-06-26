import type { Citation } from '@ccp/shared';
import type { RetrievedChunk } from './retrieval.service';

const SNIPPET_LENGTH = 280;
const MAX_CITATIONS = 4;

const STOP_WORDS = new Set([
  'what',
  'who',
  'where',
  'when',
  'which',
  'how',
  'the',
  'and',
  'for',
  'are',
  'is',
  'was',
  'were',
  'about',
  'from',
  'with',
  'that',
  'this',
  'any',
  'there',
  'does',
  'did',
  'have',
  'has',
  'had',
  'been',
  'their',
  'they',
  'them',
  'into',
  'such',
  'can',
  'you',
  'your',
]);

/** Pull page numbers the model cited inline, e.g. "(page 12)" or "(pages 3, 4)". */
export function extractCitedPages(answer: string): number[] {
  const pages = new Set<number>();
  const patterns = [/\(pages?\s+([^)]+)\)/gi, /\(pp?\.?\s+([^)]+)\)/gi];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(answer)) !== null) {
      for (const num of match[1].match(/\d+/g) ?? []) {
        const page = parseInt(num, 10);
        if (page > 0) pages.add(page);
      }
    }
  }

  return [...pages].sort((a, b) => a - b);
}

function tokenizeForMatch(text: string): string[] {
  const terms = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  return [...new Set(terms)];
}

function stripPdfHeader(text: string): string {
  return text.replace(/^Page \d+ of \d+\s*/i, '').trim();
}

/** Window chunk text around terms from the user's question instead of always using the prefix. */
export function extractRelevantSnippet(
  content: string,
  question: string,
  maxLength = SNIPPET_LENGTH,
): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return stripPdfHeader(normalized);

  const terms = tokenizeForMatch(question);
  const lower = normalized.toLowerCase();

  let anchor = -1;
  let bestTermLen = 0;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx >= 0 && term.length >= bestTermLen) {
      anchor = idx;
      bestTermLen = term.length;
    }
  }

  let bestStart: number;
  const headerMatch = normalized.match(/^(Page \d+ of \d+\s*)/i);
  const contentStart = headerMatch ? headerMatch[0].length : 0;

  if (anchor >= 0) {
    bestStart = Math.max(contentStart, anchor - 50);
  } else {
    bestStart = contentStart;
  }

  const spaceIdx = normalized.lastIndexOf(' ', bestStart);
  if (spaceIdx > 0 && bestStart - spaceIdx < 30) bestStart = spaceIdx + 1;

  let end = Math.min(normalized.length, bestStart + maxLength);
  const spaceEnd = normalized.indexOf(' ', end);
  if (spaceEnd > 0 && spaceEnd - end < 25) end = spaceEnd;

  let snippet = normalized.slice(bestStart, end).trim();
  snippet = stripPdfHeader(snippet);
  if (bestStart > 0) snippet = `…${snippet}`;
  if (end < normalized.length) snippet = `${snippet}…`;
  return snippet;
}

/**
 * Build citations aligned with the model answer:
 * - prefer pages cited inline in the answer
 * - keep the strongest chunk per page
 * - surface a question-centered excerpt rather than the chunk prefix
 */
export function buildCitations(
  chunks: RetrievedChunk[],
  question: string,
  answer: string,
  minScore: number,
): Citation[] {
  const eligible = chunks.filter((c) => c.score >= minScore).sort((a, b) => b.score - a.score);

  if (eligible.length === 0) return [];

  const citedPages = extractCitedPages(answer);
  const selected =
    citedPages.length > 0
      ? (() => {
          const byPage = eligible.filter((c) => citedPages.includes(c.page));
          return byPage.length > 0 ? byPage : eligible.slice(0, MAX_CITATIONS);
        })()
      : eligible.slice(0, MAX_CITATIONS);

  const bestPerPage = new Map<number, RetrievedChunk>();
  for (const chunk of selected) {
    const prev = bestPerPage.get(chunk.page);
    if (!prev || chunk.score > prev.score) bestPerPage.set(chunk.page, chunk);
  }

  return [...bestPerPage.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CITATIONS)
    .map((c) => ({
      chunkId: c.chunkId,
      page: c.page,
      snippet: extractRelevantSnippet(c.content, question),
      score: Number(c.score.toFixed(4)),
    }));
}
