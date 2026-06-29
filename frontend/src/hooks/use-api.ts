'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatMessageDto, ComplianceSummaryDto, DocumentSummaryDto } from '@ccp/shared';
import { DOCUMENT_POLL_INTERVAL_MS, isDocumentProcessing } from '@ccp/shared';
import { api, ApiHttpError } from '@/lib/api';

/** List the user's documents; auto-polls while any are still processing. */
export function useDocuments(enabled: boolean) {
  return useQuery({
    queryKey: ['documents'],
    queryFn: api.listDocuments,
    enabled,
    refetchInterval: (query) =>
      (query.state.data as DocumentSummaryDto[] | undefined)?.some((d) =>
        isDocumentProcessing(d.status),
      )
        ? DOCUMENT_POLL_INTERVAL_MS
        : false,
  });
}

/** A single document; auto-polls until it is ready/failed. */
export function useDocument(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id),
    enabled,
    refetchInterval: (query) =>
      isDocumentProcessing((query.state.data as DocumentSummaryDto | undefined)?.status)
        ? DOCUMENT_POLL_INTERVAL_MS
        : false,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useMessages(id: string, enabled: boolean) {
  return useQuery<ChatMessageDto[]>({
    queryKey: ['messages', id],
    queryFn: () => api.getMessages(id),
    enabled,
  });
}

/** Cached summary; resolves to null (not an error) when none exists yet. */
export function useSummary(id: string, enabled: boolean) {
  return useQuery<ComplianceSummaryDto | null>({
    queryKey: ['summary', id],
    queryFn: async () => {
      try {
        return await api.getSummary(id);
      } catch (err) {
        if (err instanceof ApiHttpError && err.status === 404) return null;
        throw err;
      }
    },
    enabled,
  });
}

export function useGenerateSummary(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.generateSummary(id),
    onSuccess: (data) => qc.setQueryData(['summary', id], data),
  });
}
