"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Sources from "@/components/Sources";

import type {
  ChatMessage,
  Source,
} from "@/lib/types/chat";

import type { ApiError } from "@/lib/types/api";

interface ChatProps {
  documentId: string;
  documentName: string;
}

interface TokenEvent {
  content: string;
}

interface StreamErrorEvent {
  message: string;
}

interface ParsedSseEvent {
  event: string;
  data: string;
}

/**
 * Analyse un bloc SSE complet et retourne son type
 * ainsi que son contenu brut.
 */
function parseSseBlock(
  block: string,
): ParsedSseEvent | null {
  const lines = block.split("\n");

  let event = "";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    }

    if (line.startsWith("data:")) {
      dataLines.push(
        line.slice("data:".length).trim(),
      );
    }
  }

  if (!event) {
    return null;
  }

  return {
    event,
    data: dataLines.join("\n"),
  };
}

export default function Chat({
  documentId,
  documentName,
}: ChatProps) {
  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [input, setInput] = useState("");

  const [currentSources, setCurrentSources] =
    useState<Source[]>([]);

  const [isStreaming, setIsStreaming] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSubmit(
    event?: React.FormEvent,
  ) {
    event?.preventDefault();

    const question = input.trim();

    if (!question || isStreaming) {
      return;
    }

    /*
     * L'historique envoyé au backend contient uniquement
     * les messages précédents. La question actuelle est
     * transmise séparément dans le champ question.
     */
    const history = [...messages];

    const userMessage: ChatMessage = {
      role: "user",
      content: question,
    };

    const assistantPlaceholder: ChatMessage = {
      role: "assistant",
      content: "",
    };

    setMessages([
      ...history,
      userMessage,
      assistantPlaceholder,
    ]);

    setInput("");
    setCurrentSources([]);
    setError(null);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question,
          documentId,
          history,
        }),
      });

      if (!response.ok) {
        const apiError =
          (await response.json()) as ApiError;

        throw new Error(
          apiError.message ||
            "Impossible de générer une réponse.",
        );
      }

      if (!response.body) {
        throw new Error(
          "Le flux de réponse du serveur est indisponible.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let doneReceived = false;

      while (!doneReceived) {
        const { value, done } =
          await reader.read();

        if (done) {
          break;
        }

        buffer += decoder
          .decode(value, {
            stream: true,
          })
          .replace(/\r\n/g, "\n");

        const blocks = buffer.split("\n\n");

        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const parsedEvent =
            parseSseBlock(block);

          if (!parsedEvent) {
            continue;
          }

          switch (parsedEvent.event) {
            case "sources": {
              const sources =
                JSON.parse(
                  parsedEvent.data,
                ) as Source[];

              setCurrentSources(sources);

              break;
            }

            case "token": {
              const token =
                JSON.parse(
                  parsedEvent.data,
                ) as TokenEvent;

              if (!token.content) {
                break;
              }

              setMessages((currentMessages) => {
                if (
                  currentMessages.length === 0
                ) {
                  return currentMessages;
                }

                const updatedMessages = [
                  ...currentMessages,
                ];

                const lastIndex =
                  updatedMessages.length - 1;

                const lastMessage =
                  updatedMessages[lastIndex];

                if (
                  lastMessage.role !==
                  "assistant"
                ) {
                  return currentMessages;
                }

                updatedMessages[lastIndex] = {
                  ...lastMessage,
                  content:
                    lastMessage.content +
                    token.content,
                };

                return updatedMessages;
              });

              break;
            }

            case "error": {
              const streamError =
                JSON.parse(
                  parsedEvent.data,
                ) as StreamErrorEvent;

              throw new Error(
                streamError.message ||
                  "Une erreur est survenue pendant la génération.",
              );
            }

            case "done": {
              doneReceived = true;
              break;
            }
          }

          if (doneReceived) {
            break;
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.";

      setError(message);

      /*
       * Si aucun token n'a été reçu, on retire le message
       * assistant vide créé avant l'appel réseau.
       */
      setMessages((currentMessages) => {
        const lastMessage =
          currentMessages[
            currentMessages.length - 1
          ];

        if (
          lastMessage?.role === "assistant" &&
          lastMessage.content.length === 0
        ) {
          return currentMessages.slice(0, -1);
        }

        return currentMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void handleSubmit();
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-900">
              Chat
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Questions sur {documentName}
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Document prêt
          </span>
        </div>
      </header>

      <div className="min-h-80 h-[520px] resize-y overflow-auto bg-slate-50 px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="max-w-md text-center">
              <p className="font-medium text-slate-700">
                Posez votre première question
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                DocChat recherchera les passages
                pertinents du document avant de
                générer sa réponse.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white"
                      : "max-w-[90%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
                  }
                >
                  <p className="mb-1 text-xs font-semibold opacity-60">
                    {message.role === "user"
                      ? "Vous"
                      : "DocChat"}
                  </p>

                  {message.role ===
                  "assistant" ? (
                    message.content ? (
                      <div className="[&_h1]:mb-3 [&_h1]:mt-2 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:my-2 [&_p]:my-2 [&_strong]:font-semibold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2 [&_ul]:my-2">
                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                          ]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 py-1">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {!isStreaming && currentSources.length > 0 && (
        <div className="border-t border-slate-200 p-4 sm:p-5">
          <Sources sources={currentSources} />
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={2}
            placeholder="Posez une question sur le document..."
            className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />

          <button
            type="submit"
            disabled={
              isStreaming ||
              input.trim().length === 0
            }
            className="h-12 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isStreaming
              ? "Réponse..."
              : "Envoyer"}
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Entrée pour envoyer · Maj + Entrée pour
          ajouter une ligne
        </p>
      </form>
    </section>
  );
}