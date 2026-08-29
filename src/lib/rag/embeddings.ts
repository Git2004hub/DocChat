import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSION = 768;

function getEmbeddingClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("La variable GEMINI_API_KEY n'est pas configurée.");
  }

  return new GoogleGenAI({ apiKey });
}

function validateText(text: string, label: string): string {
  const cleaned = text.trim();

  if (!cleaned) {
    throw new Error(`${label} ne doit pas être vide.`);
  }

  return cleaned;
}

/**
 * Génère les embeddings des chunks du document pendant l'ingestion.
 */
export async function embedDocuments(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const cleanedTexts = texts.map((text, index) =>
    validateText(text, `Le texte du document à l'index ${index}`),
  );

  const client = getEmbeddingClient();

  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: cleanedTexts,
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });

  const embeddings = response.embeddings?.map(
    (embedding) => embedding.values ?? [],
  );

  if (!embeddings || embeddings.length !== cleanedTexts.length) {
    throw new Error(
      "Le fournisseur d'embeddings a retourné un nombre inattendu d'embeddings de documents.",
    );
  }

  if (embeddings.some((embedding) => embedding.length === 0)) {
    throw new Error(
      "Le fournisseur d'embeddings a retourné un embedding vide.",
    );
  }

  return embeddings;
}

/**
 * Génère l'embedding d'une question utilisateur pendant la recherche.
 */
export async function embedQuery(
  query: string,
): Promise<number[]> {
  const cleanedQuery = validateText(query, "La question");

  const client = getEmbeddingClient();

  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: cleanedQuery,
    config: {
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error(
      "Le fournisseur d'embeddings a retourné un embedding de question vide.",
    );
  }

  return embedding;
}