import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { SupabaseService } from '../supabase/supabase.service';
import { GeminiService } from '../gemini/gemini.service';
import { toVectorLiteral } from '../common/vector';

export interface RetrievedChunk {
  chunkId: string;
  content: string;
  page: number;
  score: number;
}

export interface StoredChunk {
  chunkId: string;
  content: string;
  page: number;
  chunkIndex: number;
}

@Injectable()
export class RetrievalService {
  private readonly rag: AppConfig['rag'];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gemini: GeminiService,
    config: ConfigService,
  ) {
    this.rag = config.get<AppConfig['rag']>('rag')!;
  }

  /** Embed the query and return the top-k most similar chunks for a document. */
  async retrieve(documentId: string, query: string, topK?: number): Promise<RetrievedChunk[]> {
    const embedding = await this.gemini.embedQuery(query);
    const { data, error } = await this.supabase.db.rpc('match_chunks', {
      query_embedding: toVectorLiteral(embedding),
      p_document_id: documentId,
      match_count: topK ?? this.rag.topK,
    });
    if (error) throw new BadRequestException(`Retrieval failed: ${error.message}`);

    return (
      data as Array<{ id: string; content: string; page_number: number; similarity: number }>
    ).map((r) => ({
      chunkId: r.id,
      content: r.content,
      page: r.page_number,
      score: r.similarity,
    }));
  }

  get minScore(): number {
    return this.rag.minScore;
  }

  /** Load all chunks for a document in order (used by summary map-reduce). */
  async getAllChunks(documentId: string): Promise<StoredChunk[]> {
    const { data, error } = await this.supabase.db
      .from('chunks')
      .select('id, content, page_number, chunk_index')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return (
      data as Array<{ id: string; content: string; page_number: number; chunk_index: number }>
    ).map((r) => ({
      chunkId: r.id,
      content: r.content,
      page: r.page_number,
      chunkIndex: r.chunk_index,
    }));
  }
}
