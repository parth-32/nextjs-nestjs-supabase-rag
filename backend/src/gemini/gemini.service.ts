import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AppConfig } from '../config/configuration';

type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

interface StreamAnswerParams {
  systemInstruction: string;
  prompt: string;
  temperature?: number;
}

interface StructuredParams<T> {
  systemInstruction: string;
  prompt: string;
  // JSON schema (Gemini subset) describing the desired output shape.
  responseSchema: Record<string, unknown>;
  temperature?: number;
  parse?: (raw: string) => T;
}

/**
 * Wraps the Google Gemini (`@google/genai`) SDK and centralizes model names,
 * embedding dimensionality, and normalization so the rest of the app stays
 * provider-agnostic.
 */
@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private client!: GoogleGenAI;
  private cfg!: AppConfig['gemini'];

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const gemini = this.config.get<AppConfig['gemini']>('gemini');
    if (!gemini) throw new Error('Gemini config missing');
    this.cfg = gemini;
    this.client = new GoogleGenAI({ apiKey: gemini.apiKey });
    this.logger.log(
      `Gemini models: embed=${gemini.embeddingModel}, generate=${gemini.generationModel}`,
    );
  }

  /** Embed a batch of document chunks. Returns one L2-normalized vector each. */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embedBatch(texts, 'RETRIEVAL_DOCUMENT');
  }

  /** Embed a single search query. */
  async embedQuery(text: string): Promise<number[]> {
    const [vec] = await this.embedBatch([text], 'RETRIEVAL_QUERY');
    return vec;
  }

  private async embedBatch(texts: string[], taskType: EmbeddingTaskType): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.client.models.embedContent({
      model: this.cfg.embeddingModel,
      contents: texts,
      config: {
        taskType,
        outputDimensionality: this.cfg.embeddingDim,
      },
    });
    const embeddings = res.embeddings ?? [];
    if (embeddings.length !== texts.length) {
      throw new Error(
        `Embedding count mismatch: requested ${texts.length}, received ${embeddings.length}`,
      );
    }
    return embeddings.map((e) => normalizeL2(e.values ?? []));
  }

  /** Stream a grounded answer token-by-token. */
  async *streamAnswer(params: StreamAnswerParams): AsyncGenerator<string> {
    const stream = await this.client.models.generateContentStream({
      model: this.cfg.generationModel,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.2,
      },
    });
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }

  /** Generate a JSON object constrained by a response schema. */
  async generateStructured<T>(params: StructuredParams<T>): Promise<T> {
    const res = await this.client.models.generateContent({
      model: this.cfg.generationModel,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.2,
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
      },
    });
    const raw = res.text ?? '';
    try {
      return params.parse ? params.parse(raw) : (JSON.parse(raw) as T);
    } catch (err) {
      this.logger.error({ err, raw }, 'Failed to parse structured Gemini output');
      throw new Error('Model returned malformed structured output');
    }
  }
}

/** L2-normalize a vector. Required for truncated (<3072) Gemini embeddings. */
export function normalizeL2(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}
