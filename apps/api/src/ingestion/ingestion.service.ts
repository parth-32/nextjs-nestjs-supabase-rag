import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { GeminiService } from '../gemini/gemini.service';
import { AppConfig } from '../config/configuration';
import { toVectorLiteral } from '../common/vector';
import { chunkPages } from './chunker';
import { extractPdf } from './pdf-extractor';

const EMBED_BATCH_SIZE = 50;

/**
 * Owns the document -> searchable-chunks pipeline. Designed to run
 * out-of-band from the upload request: download -> extract -> chunk -> embed
 * -> store, flipping the document status as it goes so the UI can poll.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly rag: AppConfig['rag'];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gemini: GeminiService,
    config: ConfigService,
  ) {
    this.rag = config.get<AppConfig['rag']>('rag')!;
  }

  /**
   * Fire-and-forget entry point used by the upload handler. Never throws;
   * failures are persisted to the document row instead.
   */
  process(documentId: string, storagePath: string): void {
    void this.run(documentId, storagePath).catch((err) => {
      this.logger.error({ err, documentId }, 'Ingestion failed unexpectedly');
    });
  }

  private async run(documentId: string, storagePath: string): Promise<void> {
    this.logger.log({ documentId }, 'Ingestion started');
    await this.setStatus(documentId, 'processing');

    try {
      const buffer = await this.supabase.downloadPdf(storagePath);
      const { pageCount, pages } = await extractPdf(buffer);

      const chunks = chunkPages(pages, {
        targetTokens: this.rag.chunkTargetTokens,
        overlapTokens: this.rag.chunkOverlapTokens,
      });

      if (chunks.length === 0) {
        throw new Error('No extractable text found in PDF (it may be scanned/image-only)');
      }

      await this.embedAndStore(documentId, chunks);

      const { error } = await this.supabase.db
        .from('documents')
        .update({ status: 'ready', page_count: pageCount, error: null })
        .eq('id', documentId);
      if (error) throw new Error(error.message);

      this.logger.log({ documentId, chunks: chunks.length, pageCount }, 'Ingestion complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown ingestion error';
      this.logger.error({ documentId, message }, 'Ingestion failed');
      await this.setStatus(documentId, 'failed', message);
    }
  }

  private async embedAndStore(
    documentId: string,
    chunks: ReturnType<typeof chunkPages>,
  ): Promise<void> {
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const vectors = await this.gemini.embedDocuments(batch.map((c) => c.content));

      const rows = batch.map((c, j) => ({
        document_id: documentId,
        content: c.content,
        page_number: c.page,
        chunk_index: c.chunkIndex,
        token_count: c.tokenCount,
        embedding: toVectorLiteral(vectors[j]),
      }));

      const { error } = await this.supabase.db.from('chunks').insert(rows);
      if (error) throw new Error(`Failed to insert chunks: ${error.message}`);
    }
  }

  private async setStatus(
    documentId: string,
    status: 'processing' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    await this.supabase.db
      .from('documents')
      .update({ status, error: errorMessage ?? null })
      .eq('id', documentId);
  }
}
