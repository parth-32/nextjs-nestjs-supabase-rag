import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { ComplianceSummaryDto, SummaryItem } from '@ccp/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { GeminiService } from '../gemini/gemini.service';
import { DocumentsService } from '../documents/documents.service';
import { RetrievalService, StoredChunk } from '../rag/retrieval.service';
import {
  buildMergePrompt,
  buildSummaryPrompt,
  SUMMARY_MERGE_INSTRUCTION,
  SUMMARY_SYSTEM_INSTRUCTION,
} from '../rag/prompts';
import { SUMMARY } from '../constants';

const itemSchema = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING' },
    pages: { type: 'ARRAY', items: { type: 'INTEGER' } },
  },
  required: ['text', 'pages'],
};

const SUMMARY_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    obligations: { type: 'ARRAY', items: itemSchema },
    risks: { type: 'ARRAY', items: itemSchema },
    gaps: { type: 'ARRAY', items: itemSchema },
    recommendedActions: { type: 'ARRAY', items: itemSchema },
  },
  required: ['obligations', 'risks', 'gaps', 'recommendedActions'],
};

const zItem = z.object({
  text: z.string(),
  pages: z.array(z.coerce.number().int()).default([]),
});
const zSummary = z.object({
  obligations: z.array(zItem).default([]),
  risks: z.array(zItem).default([]),
  gaps: z.array(zItem).default([]),
  recommendedActions: z.array(zItem).default([]),
});
type RawSummary = z.infer<typeof zSummary>;

interface SummaryRow {
  document_id: string;
  obligations: SummaryItem[];
  risks: SummaryItem[];
  gaps: SummaryItem[];
  recommended_actions: SummaryItem[];
  created_at: string;
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gemini: GeminiService,
    private readonly documents: DocumentsService,
    private readonly retrieval: RetrievalService,
  ) {}

  async get(userId: string, documentId: string): Promise<ComplianceSummaryDto> {
    await this.documents.getOwnedRow(userId, documentId);
    const existing = await this.load(documentId);
    if (!existing) throw new NotFoundException('No summary generated yet');
    return existing;
  }

  /** Generate (or return cached) structured compliance summary. */
  async generate(userId: string, documentId: string): Promise<ComplianceSummaryDto> {
    await this.documents.ensureReady(userId, documentId);

    const cached = await this.load(documentId);
    if (cached) return cached;

    const chunks = await this.retrieval.getAllChunks(documentId);
    const groups = groupChunks(chunks, SUMMARY.MAX_GROUP_CHARS);

    const partials: RawSummary[] = [];
    for (const group of groups) {
      partials.push(
        await this.gemini.generateStructured<RawSummary>({
          systemInstruction: SUMMARY_SYSTEM_INSTRUCTION,
          prompt: buildSummaryPrompt(group),
          responseSchema: SUMMARY_RESPONSE_SCHEMA,
          parse: (raw) => zSummary.parse(JSON.parse(raw)),
        }),
      );
    }

    const merged = partials.length === 1 ? partials[0] : await this.mergePartials(partials);

    return this.persist(documentId, merged);
  }

  private async mergePartials(partials: RawSummary[]): Promise<RawSummary> {
    try {
      return await this.gemini.generateStructured<RawSummary>({
        systemInstruction: SUMMARY_MERGE_INSTRUCTION,
        prompt: buildMergePrompt(partials.map((p) => JSON.stringify(p))),
        responseSchema: SUMMARY_RESPONSE_SCHEMA,
        parse: (raw) => zSummary.parse(JSON.parse(raw)),
      });
    } catch (err) {
      // Fall back to a naive concatenation so a merge hiccup never loses work.
      this.logger.warn({ err }, 'Summary merge failed, concatenating partials');
      return partials.reduce<RawSummary>(
        (acc, p) => ({
          obligations: [...acc.obligations, ...p.obligations],
          risks: [...acc.risks, ...p.risks],
          gaps: [...acc.gaps, ...p.gaps],
          recommendedActions: [...acc.recommendedActions, ...p.recommendedActions],
        }),
        { obligations: [], risks: [], gaps: [], recommendedActions: [] },
      );
    }
  }

  private async persist(documentId: string, s: RawSummary): Promise<ComplianceSummaryDto> {
    const { data, error } = await this.supabase.db
      .from('summaries')
      .upsert(
        {
          document_id: documentId,
          obligations: s.obligations,
          risks: s.risks,
          gaps: s.gaps,
          recommended_actions: s.recommendedActions,
        },
        { onConflict: 'document_id' },
      )
      .select('*')
      .single();
    if (error) throw new Error(`Failed to save summary: ${error.message}`);
    return toDto(data as SummaryRow);
  }

  private async load(documentId: string): Promise<ComplianceSummaryDto | null> {
    const { data, error } = await this.supabase.db
      .from('summaries')
      .select('*')
      .eq('document_id', documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toDto(data as SummaryRow) : null;
  }
}

function groupChunks(
  chunks: StoredChunk[],
  maxChars: number,
): Pick<StoredChunk, 'content' | 'page'>[][] {
  const groups: Pick<StoredChunk, 'content' | 'page'>[][] = [];
  let current: Pick<StoredChunk, 'content' | 'page'>[] = [];
  let size = 0;
  for (const c of chunks) {
    if (size + c.content.length > maxChars && current.length > 0) {
      groups.push(current);
      current = [];
      size = 0;
    }
    current.push({ content: c.content, page: c.page });
    size += c.content.length;
  }
  if (current.length > 0) groups.push(current);
  return groups.length > 0 ? groups : [[]];
}

function toDto(row: SummaryRow): ComplianceSummaryDto {
  return {
    documentId: row.document_id,
    obligations: row.obligations ?? [],
    risks: row.risks ?? [],
    gaps: row.gaps ?? [],
    recommendedActions: row.recommended_actions ?? [],
    createdAt: row.created_at,
  };
}
