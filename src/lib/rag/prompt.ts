import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";

import type {
  ChatMessage,
  Source,
} from "@/lib/types/chat";

const SYSTEM_INSTRUCTIONS = `
You are an assistant specialized in document analysis.

Mandatory rules:
- Answer using only the provided document context.
- Never use general knowledge to complete the answer.
- If the context does not contain enough information to answer, explicitly state that the information is not present in the document.
- Do not present information as certain unless it is explicitly supported by the provided context.
- Answer clearly, concisely and accurately.

Language rules:
- Always answer in the same language as the user's CURRENT question.
- An English question must receive an English answer.
- A French question must receive a French answer.
- An Arabic question must receive an Arabic answer.
- If the user explicitly requests another language, use the requested language.
- Never choose the response language based on the language of the document, conversation history, or these system instructions.
- The current user question has priority when determining the response language.

Conversation rules:
- Conversation history may be used only to understand the discussion context.
- Conversation history is not a factual source.
`.trim();

/**
 * Construit le bloc de contexte documentaire transmis au LLM.
 */
function buildContext(sources: Source[]): string {
  if (sources.length === 0) {
    return "Aucun passage pertinent n'a été trouvé dans le document.";
  }

  return sources
    .map(
      (source, index) =>
        `[Source ${index + 1} — page ${source.page} — score ${source.score.toFixed(3)}]
${source.content}`,
    )
    .join("\n\n");
}

/**
 * Convertit l'historique métier en messages LangChain.
 */
function buildHistoryMessages(
  history: ChatMessage[] = [],
): BaseMessage[] {
  return history.map((message) => {
    if (message.role === "user") {
      return new HumanMessage(message.content);
    }

    return new AIMessage(message.content);
  });
}

/**
 * Construit l'ensemble des messages transmis au LLM
 * à partir de la question, des sources et de l'historique.
 */
export function buildPromptMessages(
  question: string,
  sources: Source[],
  history: ChatMessage[] = [],
): BaseMessage[] {
  const cleanedQuestion = question.trim();

  if (!cleanedQuestion) {
    throw new Error("La question ne doit pas être vide.");
  }

  const context = buildContext(sources);

  const finalQuestion = `
Contexte documentaire :

${context}

Question de l'utilisateur :
${cleanedQuestion}

Réponds uniquement à partir du contexte documentaire ci-dessus.
`.trim();

  return [
    new SystemMessage(SYSTEM_INSTRUCTIONS),
    ...buildHistoryMessages(history),
    new HumanMessage(finalQuestion),
  ];
}