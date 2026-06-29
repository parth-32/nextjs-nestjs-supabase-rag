'use client';

import type {
  ChatMessageDto,
  ChatStreamEvent,
  ComplianceSummaryDto,
  DocumentSummaryDto,
  UploadDocumentResponse,
} from '@ccp/shared';
import { API_PATHS } from '@ccp/shared';
import { getSupabase } from './supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Error carrying the HTTP status so callers can branch (e.g. 404 -> no data). */
export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiHttpError(res.status, body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listDocuments: () => request<DocumentSummaryDto[]>(API_PATHS.documents),

  getDocument: (id: string) => request<DocumentSummaryDto>(API_PATHS.document(id)),

  getMessages: (id: string) => request<ChatMessageDto[]>(API_PATHS.messages(id)),

  getSummary: (id: string) => request<ComplianceSummaryDto>(API_PATHS.summary(id)),

  generateSummary: (id: string) =>
    request<ComplianceSummaryDto>(API_PATHS.summary(id), { method: 'POST' }),

  async uploadDocument(file: File): Promise<UploadDocumentResponse> {
    const headers = await authHeader();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}${API_PATHS.documents}`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, body.message ?? `Upload failed (${res.status})`);
    }
    return res.json() as Promise<UploadDocumentResponse>;
  },

  /**
   * Stream a chat answer over SSE. We use fetch + a ReadableStream reader
   * (rather than EventSource) so we can send a POST body and an auth header.
   */
  async streamChat(
    documentId: string,
    question: string,
    onEvent: (event: ChatStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const headers = await authHeader();
    const res = await fetch(`${API_URL}${API_PATHS.chat(documentId)}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    });
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, body.message ?? `Chat failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        try {
          onEvent(JSON.parse(line.slice(5).trim()) as ChatStreamEvent);
        } catch {
          // ignore malformed frame
        }
      }
    }
  },
};
