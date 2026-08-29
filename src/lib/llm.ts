import { ChatAnthropic } from "@langchain/anthropic";

import type { BaseMessage } from "@langchain/core/messages";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

function getRequiredApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "La variable ANTHROPIC_API_KEY n'est pas configurée.",
    );
  }

  return apiKey;
}

/**
 * Crée une instance configurée du modèle Claude.
 */
function createChatModel(): ChatAnthropic {
  return new ChatAnthropic({
    apiKey: getRequiredApiKey(),
    model: ANTHROPIC_MODEL,
    temperature: 0,
    maxTokens: 1024,
    maxRetries: 2,
  });
}

/**
 * Génère progressivement le texte produit par Claude.
 */
export async function* streamLlmResponse(
  messages: BaseMessage[],
): AsyncGenerator<string> {
  if (messages.length === 0) {
    throw new Error(
      "Au moins un message est nécessaire pour interroger le LLM.",
    );
  }

  const model = createChatModel();

  const stream = await model.stream(messages);

  for await (const chunk of stream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}