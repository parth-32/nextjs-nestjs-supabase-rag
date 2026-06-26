import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DocumentStatus, DocumentSummaryDto } from '@ccp/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { IngestionService } from '../ingestion/ingestion.service';

interface DocumentRow {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  status: DocumentStatus;
  page_count: number | null;
  error: string | null;
  created_at: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly ingestion: IngestionService,
  ) {}

  async upload(
    userId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer },
  ): Promise<{ id: string; status: DocumentStatus }> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const id = randomUUID();
    const storagePath = `${userId}/${id}.pdf`;

    await this.supabase.uploadPdf(storagePath, file.buffer);

    const { error } = await this.supabase.db.from('documents').insert({
      id,
      user_id: userId,
      filename: sanitizeFilename(file.originalname),
      storage_path: storagePath,
      status: 'pending',
    });
    if (error) throw new BadRequestException(`Failed to create document: ${error.message}`);

    // Kick off ingestion out-of-band; the client polls GET /documents/:id.
    this.ingestion.process(id, storagePath);

    return { id, status: 'pending' };
  }

  async list(userId: string): Promise<DocumentSummaryDto[]> {
    const { data, error } = await this.supabase.db
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data as DocumentRow[]).map(toDto);
  }

  async get(userId: string, id: string): Promise<DocumentSummaryDto> {
    const row = await this.getOwnedRow(userId, id);
    return toDto(row);
  }

  /** Loads a document, enforcing ownership. Throws 404/403 as appropriate. */
  async getOwnedRow(userId: string, id: string): Promise<DocumentRow> {
    const { data, error } = await this.supabase.db
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Document not found');
    const row = data as DocumentRow;
    if (row.user_id !== userId) throw new ForbiddenException('Not your document');
    return row;
  }

  /** Ensures the document exists, is owned by the user, and is fully ingested. */
  async ensureReady(userId: string, id: string): Promise<DocumentRow> {
    const row = await this.getOwnedRow(userId, id);
    if (row.status !== 'ready') {
      throw new BadRequestException(`Document is not ready (status: ${row.status})`);
    }
    return row;
  }
}

function toDto(row: DocumentRow): DocumentSummaryDto {
  return {
    id: row.id,
    filename: row.filename,
    status: row.status,
    pageCount: row.page_count,
    error: row.error,
    createdAt: row.created_at,
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 200) || 'document.pdf';
}
