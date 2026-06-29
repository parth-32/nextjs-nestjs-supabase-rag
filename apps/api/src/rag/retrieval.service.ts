import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GeminiService } from '../gemini/gemini.service';
import { RAG } from '../constants';
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
  constructor(
    private readonly supabase: SupabaseService,
    private readonly gemini: GeminiService,
  ) {}

  /** Embed the query and return the top-k most similar chunks for a document. */
  async retrieve(documentId: string, query: string, topK?: number): Promise<RetrievedChunk[]> {
    const embedding = await this.gemini.embedQuery(query);
    const { data, error } = await this.supabase.db.rpc('match_chunks', {
      query_embedding: toVectorLiteral(embedding),
      p_document_id: documentId,
      match_count: topK ?? RAG.TOP_K,
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
    return RAG.MIN_SCORE;
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
