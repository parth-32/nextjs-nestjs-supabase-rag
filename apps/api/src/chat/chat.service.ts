import { Injectable, Logger } from '@nestjs/common';
import { Citation, ChatMessageDto, ChatStreamEvent } from '@ccp/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { GeminiService } from '../gemini/gemini.service';
import { DocumentsService } from '../documents/documents.service';
import { RetrievalService } from '../rag/retrieval.service';
import { buildCitations } from '../rag/citations';
import { buildChatPrompt, CHAT_SYSTEM_INSTRUCTION, NOT_FOUND_MESSAGE } from '../rag/prompts';

interface MessageRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gemini: GeminiService,
    private readonly documents: DocumentsService,
    private readonly retrieval: RetrievalService,
  ) {}

  async getHistory(userId: string, documentId: string): Promise<ChatMessageDto[]> {
    await this.documents.getOwnedRow(userId, documentId);
    const { data, error } = await this.supabase.db
      .from('messages')
      .select('id, role, content, citations, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as MessageRow[]).map(toMessageDto);
  }

  /**
   * Stream a grounded answer. Retrieval runs first; if nothing clears the
   * similarity threshold we short-circuit to a deterministic "not found"
   * answer instead of letting the model hallucinate.
   */
  async *generate(
    userId: string,
    documentId: string,
    question: string,
  ): AsyncGenerator<ChatStreamEvent> {
    try {
      const chunks = await this.retrieval.retrieve(documentId, question);
      const top = chunks[0]?.score ?? 0;
      const grounded = chunks.length > 0 && top >= this.retrieval.minScore;

      let answer = '';

      if (!grounded) {
        answer = NOT_FOUND_MESSAGE;
        yield { type: 'token', value: answer };
        yield { type: 'citations', value: [] };
      } else {
        const prompt = buildChatPrompt(question, chunks);
        for await (const token of this.gemini.streamAnswer({
          systemInstruction: CHAT_SYSTEM_INSTRUCTION,
          prompt,
        })) {
          answer += token;
          yield { type: 'token', value: token };
        }

        // If the model itself declined, don't attach misleading citations.
        const citations: Citation[] = answer.trim().startsWith(NOT_FOUND_MESSAGE)
          ? []
          : buildCitations(chunks, question, answer, this.retrieval.minScore);
        yield { type: 'citations', value: citations };

        const messageId = await this.persist(userId, documentId, question, answer, citations);
        yield { type: 'done', messageId };
        return;
      }

      const messageId = await this.persist(userId, documentId, question, answer, []);
      yield { type: 'done', messageId };
    } catch (err) {
      this.logger.error({ err, documentId }, 'Chat generation failed');
      yield { type: 'error', message: 'Failed to generate an answer. Please try again.' };
    }
  }

  private async persist(
    userId: string,
    documentId: string,
    question: string,
    answer: string,
    citations: Citation[],
  ): Promise<string> {
    await this.supabase.db.from('messages').insert({
      document_id: documentId,
      user_id: userId,
      role: 'user',
      content: question,
      citations: [],
    });
    const { data, error } = await this.supabase.db
      .from('messages')
      .insert({
        document_id: documentId,
        user_id: userId,
        role: 'assistant',
        content: answer,
        citations,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  }
}

function toMessageDto(row: MessageRow): ChatMessageDto {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    citations: row.citations ?? [],
    createdAt: row.created_at,
  };
}
