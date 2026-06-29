import { extractText, getDocumentProxy } from 'unpdf';
import { PageText } from './chunker';

interface ExtractedPdf {
  pageCount: number;
  pages: PageText[];
}

/**
 * Extract per-page text from a PDF buffer using unpdf (a serverless-friendly
 * pdf.js build). Per-page extraction is what lets us attach a page number to
 * every chunk for citations.
 */
export async function extractPdf(buffer: Buffer): Promise<ExtractedPdf> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const perPage = Array.isArray(text) ? text : [text];

  const pages: PageText[] = perPage.map((t, idx) => ({
    page: idx + 1,
    text: (t ?? '').trim(),
  }));

  return { pageCount: totalPages, pages };
}
