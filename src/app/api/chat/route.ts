import { NextResponse } from "next/server";

import { createRagStream } from "@/lib/rag/chain";

import type {
  ChatMessage,
  ChatRequest,
  Source,
} from "@/lib/types/chat";

import type { ApiError } from "@/lib/types/api";

export const runtime = "nodejs";

const encoder = new TextEncoder();

/**
 * Formate un événement selon le protocole Server-Sent Events.
 */
function createSseEvent(
  event: string,
  data: unknown,
): Uint8Array {
  return encoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

/**
 * Vérifie qu'un objet correspond à un message de chat valide.
 */
function isValidChatMessage(
  value: unknown,
): value is ChatMessage {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const message = value as Partial<ChatMessage>;

  return (
    (message.role === "user" ||
      message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

/**
 * Traite une question utilisateur et retourne la réponse du LLM
 * en streaming avec les sources utilisées.
 */
export async function POST(request: Request) {
  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    const response: ApiError = {
      error: "INVALID_JSON",
      message:
        "Le corps de la requête doit contenir un JSON valide.",
    };

    return NextResponse.json(response, {
      status: 400,
    });
  }

  const question =
    typeof body.question === "string"
      ? body.question.trim()
      : "";

  const documentId =
    typeof body.documentId === "string"
      ? body.documentId.trim()
      : "";

  if (!question) {
    const response: ApiError = {
      error: "INVALID_QUESTION",
      message: "La question est obligatoire.",
    };

    return NextResponse.json(response, {
      status: 400,
    });
  }

  if (!documentId) {
    const response: ApiError = {
      error: "DOCUMENT_ID_REQUIRED",
      message: "Le documentId est obligatoire.",
    };

    return NextResponse.json(response, {
      status: 400,
    });
  }

  const history = body.history ?? [];

  if (
    !Array.isArray(history) ||
    !history.every(isValidChatMessage)
  ) {
    const response: ApiError = {
      error: "INVALID_HISTORY",
      message:
        "L'historique de conversation est invalide.",
    };

    return NextResponse.json(response, {
      status: 400,
    });
  }

  let sources: Source[];
  let llmStream: AsyncGenerator<string>;

  try {
    const ragResult = await createRagStream(
      question,
      documentId,
      history,
    );

    sources = ragResult.sources;
    llmStream = ragResult.stream;
  } catch (error) {
    console.error(
      "Erreur lors de la préparation du pipeline RAG :",
      error,
    );

    const response: ApiError = {
      error: "RAG_ERROR",
      message:
        "Une erreur est survenue pendant la préparation de la réponse.",
    };

    return NextResponse.json(response, {
      status: 500,
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        /*
         * Les sources sont déjà connues après le retrieval.
         * Elles sont envoyées avant les tokens afin que le frontend
         * puisse les conserver pendant la génération.
         */
        controller.enqueue(
          createSseEvent("sources", sources),
        );

        for await (const token of llmStream) {
          controller.enqueue(
            createSseEvent("token", {
              content: token,
            }),
          );
        }

        controller.enqueue(
          createSseEvent("done", {}),
        );
      } catch (error) {
        console.error(
          "Erreur pendant le streaming de la réponse :",
          error,
        );

        controller.enqueue(
          createSseEvent("error", {
            message:
              "Une erreur est survenue pendant la génération de la réponse.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type":
        "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}