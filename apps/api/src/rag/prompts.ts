import { RetrievedChunk, StoredChunk } from './retrieval.service';

export const NOT_FOUND_MESSAGE = "I couldn't find information about that in this document.";

export const CHAT_SYSTEM_INSTRUCTION = `You are Compliance Copilot, an assistant that answers questions strictly about a single uploaded compliance document.

Rules:
- Use ONLY the information in the provided context. Do not use outside knowledge.
- Every context passage is labeled with its page like [page 4]. When you state a fact, cite the exact page(s) it came from inline using "(page N)" or "(pages N, M)". Only cite pages you actually used.
- If the answer is not contained in the context, reply exactly: "${NOT_FOUND_MESSAGE}" and nothing else.
- Be concise, precise, and neutral. Do not give legal advice or speculate.`;

export function buildChatPrompt(question: string, chunks: RetrievedChunk[]): string {
  const context = chunks.map((c) => `[page ${c.page}]\n${c.content}`).join('\n\n---\n\n');
  return `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer (cite pages):`;
}

export const SUMMARY_SYSTEM_INSTRUCTION = `You are a compliance analyst. From the provided excerpts of a single compliance document, extract a structured summary.

For each item, include the page number(s) it is supported by (the excerpts are labeled like [page 4]).
Definitions:
- obligations: concrete requirements the organization must meet.
- risks: potential compliance risks or exposures implied by the text.
- gaps: information that is missing, ambiguous, or appears incomplete.
- recommendedActions: pragmatic next steps to improve compliance.

Only use information present in the excerpts. If a category has nothing relevant, return an empty array for it. Do not invent page numbers.`;

export function buildSummaryPrompt(chunks: Pick<StoredChunk, 'content' | 'page'>[]): string {
  const body = chunks.map((c) => `[page ${c.page}]\n${c.content}`).join('\n\n---\n\n');
  return `Document excerpts:\n${body}\n\nProduce the structured compliance summary as JSON.`;
}

export const SUMMARY_MERGE_INSTRUCTION = `You are merging several partial compliance summaries of the same document into one consolidated summary.

Combine items across the partials, remove duplicates (merge their page numbers), and keep the most important points. Preserve accurate page numbers. Return the same JSON structure.`;

export function buildMergePrompt(partialsJson: string[]): string {
  return `Partial summaries (JSON):\n${partialsJson.join('\n\n')}\n\nReturn one consolidated JSON summary.`;
}
