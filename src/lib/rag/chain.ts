import { retrieveRelevantChunks } from "@/lib/rag/retrieval";
import { buildPromptMessages } from "@/lib/rag/prompt";
import { streamLlmResponse } from "@/lib/llm";

import type {
  ChatMessage,
  Source,
} from "@/lib/types/chat";

export interface RagStreamResult {
  sources: Source[];
  stream: AsyncGenerator<string>;
}

/**
 * Orchestre le pipeline RAG pour une question utilisateur :
 * retrieval, construction du prompt puis génération streamée.
 */
export async function createRagStream(
  question: string,
  documentId: string,
  history: ChatMessage[] = [],
): Promise<RagStreamResult> {
  const cleanedQuestion = question.trim();

  if (!cleanedQuestion) {
    throw new Error("La question ne doit pas être vide.");
  }

  if (!documentId.trim()) {
    throw new Error("Le documentId est obligatoire.");
  }

  // 1. Recherche des passages les plus pertinents.
  const sources = await retrieveRelevantChunks(
    cleanedQuestion,
    documentId,
  );

  // 2. Construction des messages transmis à Claude.
  const messages = buildPromptMessages(
    cleanedQuestion,
    sources,
    history,
  );

  // 3. Préparation du flux de génération du LLM.
  const stream = streamLlmResponse(messages);

  return {
    sources,
    stream,
  };
}