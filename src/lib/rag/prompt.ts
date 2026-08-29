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
Tu es un assistant spécialisé dans l'analyse de documents.

Règles obligatoires :
- Réponds uniquement à partir du contexte documentaire fourni.
- N'utilise jamais tes connaissances générales pour compléter la réponse.
- Si le contexte ne contient pas suffisamment d'informations pour répondre, indique clairement que l'information n'est pas présente dans le document.
- Ne présente pas comme certain un élément qui n'est pas explicitement soutenu par le contexte.
- Réponds de manière claire, concise et précise.
- L'historique de conversation sert uniquement à comprendre le fil de la discussion ; il ne constitue pas une source factuelle.
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