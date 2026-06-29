/**
 * Cross-boundary constants shared by the NestJS API and Next.js web app.
 * Keep DB check constraints (e.g. document status) aligned with these values.
 */

export const APP_NAME = 'Compliance Copilot';
export const APP_DESCRIPTION = 'Upload a compliance PDF and chat with it. RAG over your documents.';

/** Document lifecycle — mirrors `documents.status` check in supabase/migrations. */
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export function isDocumentProcessing(status: DocumentStatus | string | undefined): boolean {
  return status === DOCUMENT_STATUS.PENDING || status === DOCUMENT_STATUS.PROCESSING;
}

export function isDocumentReady(status: DocumentStatus | string | undefined): boolean {
  return status === DOCUMENT_STATUS.READY;
}

export const PDF_MIME_TYPE = 'application/pdf';
export const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** How often the web client polls while ingestion is in progress. */
export const DOCUMENT_POLL_INTERVAL_MS = 3_000;

/** REST paths relative to the API base URL. */
export const API_PATHS = {
  documents: '/documents',
  document: (id: string) => `/documents/${id}`,
  messages: (id: string) => `/documents/${id}/messages`,
  summary: (id: string) => `/documents/${id}/summary`,
  chat: (id: string) => `/documents/${id}/chat`,
} as const;

export const SUMMARY_SECTION_KEYS = ['obligations', 'risks', 'gaps', 'recommendedActions'] as const;

export type SummarySectionKey = (typeof SUMMARY_SECTION_KEYS)[number];
