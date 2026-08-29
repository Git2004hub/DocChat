import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import type {
  DocumentChunk,
  ParsedPage,
} from "@/lib/types/document";

export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 150;

/**
 * Découpe les pages analysées du PDF en chunks plus petits
 * tout en conservant les métadonnées du document et des pages.
 */
export async function chunkDocument(
  pages: ParsedPage[],
  documentId: string,
  documentName: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP,
): Promise<DocumentChunk[]> {
  if (pages.length === 0) {
    return [];
  }

  if (!documentId.trim()) {
    throw new Error("Le documentId est obligatoire.");
  }

  if (!documentName.trim()) {
    throw new Error("Le documentName est obligatoire.");
  }

  if (chunkSize <= 0) {
    throw new Error("La taille des chunks doit être supérieure à zéro.");
  }

  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new Error(
      "Le chevauchement des chunks doit être supérieur ou égal à zéro et inférieur à leur taille.",
    );
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const chunks: DocumentChunk[] = [];

  for (const page of pages) {
    if (!page.content.trim()) {
      continue;
    }

    const pageChunks = await splitter.splitText(page.content);

    pageChunks.forEach((content, index) => {
      const cleanedContent = content.trim();

      if (!cleanedContent) {
        return;
      }

      chunks.push({
        id: `${documentId}-p${page.pageNumber}-c${index + 1}`,
        content: cleanedContent,
        page: page.pageNumber,
        documentId,
        documentName,
      });
    });
  }

  return chunks;
}