export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface Source {
  content: string;
  page: number;
  score: number;
}

export interface ChatRequest {
  question: string;
  documentId: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}