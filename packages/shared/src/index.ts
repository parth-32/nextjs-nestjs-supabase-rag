/**
 * Shared API contract types used by both the NestJS backend and the Next.js
 * frontend. Keeping these in one place prevents the client and server from
 * drifting apart.
 */

import type { DocumentStatus } from './constants.js';

export {
  API_PATHS,
  APP_DESCRIPTION,
  APP_NAME,
  DEFAULT_MAX_UPLOAD_BYTES,
  DOCUMENT_POLL_INTERVAL_MS,
  DOCUMENT_STATUS,
  PDF_MIME_TYPE,
  SUMMARY_SECTION_KEYS,
  isDocumentProcessing,
  isDocumentReady,
} from './constants.js';
export type { DocumentStatus, SummarySectionKey } from './constants.js';

export interface DocumentSummaryDto {
  id: string;
  filename: string;
  status: DocumentStatus;
  pageCount: number | null;
  error: string | null;
  createdAt: string;
}

export interface UploadDocumentResponse {
  id: string;
  status: DocumentStatus;
}

/** A single retrieved source backing an answer. */
export interface Citation {
  chunkId: string;
  page: number;
  snippet: string;
  score: number;
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: string;
}

/**
 * Server-Sent Events emitted by the streaming chat endpoint.
 * - `token`  incremental answer text
 * - `citations` final list of sources (sent once, before `done`)
 * - `done`   stream finished, includes persisted message id
 * - `error`  something went wrong
 */
export type ChatStreamEvent =
  | { type: 'token'; value: string }
  | { type: 'citations'; value: Citation[] }
  | { type: 'done'; messageId: string }
  | { type: 'error'; message: string };

export interface SummaryItem {
  text: string;
  pages: number[];
}

export interface ComplianceSummaryDto {
  documentId: string;
  obligations: SummaryItem[];
  risks: SummaryItem[];
  gaps: SummaryItem[];
  recommendedActions: SummaryItem[];
  createdAt: string;
}
