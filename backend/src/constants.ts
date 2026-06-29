/** Server-only tuning constants (not needed by the web client). */

export const GEMINI = {
  EMBEDDING_MODEL: 'gemini-embedding-001',
  GENERATION_MODEL: 'gemini-2.5-flash-lite',
  EMBEDDING_DIM: 768,
} as const;

export const INGESTION = {
  EMBED_BATCH_SIZE: 50,
  CHARS_PER_TOKEN: 4,
  CHUNK_TARGET_TOKENS: 800,
  CHUNK_OVERLAP_TOKENS: 120,
} as const;

export const RAG = {
  TOP_K: 5,
  MIN_SCORE: 0.45,
  SNIPPET_LENGTH: 280,
  MAX_CITATIONS: 4,
  STOP_WORDS: [
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
  ],
} as const;

export const SUMMARY = {
  MAX_GROUP_CHARS: 24_000,
} as const;

export const CHAT = {
  NOT_FOUND_MESSAGE: "I couldn't find information about that in this document.",
} as const;
