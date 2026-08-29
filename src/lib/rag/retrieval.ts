import { embedQuery } from "@/lib/rag/embeddings";
import { searchSimilarChunks } from "@/lib/chroma";

import type { Source } from "@/lib/types/chat";

export const DEFAULT_TOP_K = 5;

/**
 * Recherche dans un document les chunks les plus pertinents
 * par rapport à une question utilisateur.
 */
export async function retrieveRelevantChunks(
  question: string,
  documentId: string,
  topK = DEFAULT_TOP_K,
): Promise<Source[]> {
  const cleanedQuestion = question.trim();

  if (!cleanedQuestion) {
    throw new Error("La question ne doit pas être vide.");
  }

  if (!documentId.trim()) {
    throw new Error("Le documentId est obligatoire.");
  }

  if (topK <= 0) {
    throw new Error("La valeur de topK doit être supérieure à zéro.");
  }

  // 1. Génération de l'embedding de la question.
  const queryEmbedding = await embedQuery(cleanedQuestion);

  // 2. Recherche vectorielle dans Chroma pour le document demandé.
  const results = await searchSimilarChunks(
    queryEmbedding,
    documentId,
    topK,
  );

  // 3. Transformation des distances cosine en scores de similarité.
  return results.map((result) => ({
    content: result.content,
    page: result.page,
    score: Math.max(0, Math.min(1, 1 - result.distance)),
  }));
}