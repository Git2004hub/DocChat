import { CloudClient, Schema, VectorIndexConfig } from "chromadb";

import type { DocumentChunk } from "@/lib/types/document";

const COLLECTION_NAME = "document_chunks";

export interface ChromaSearchResult {
  id: string;
  content: string;
  page: number;
  documentId: string;
  documentName: string;
  distance: number;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `La variable d'environnement ${name} n'est pas configurée.`,
    );
  }

  return value;
}

function getChromaClient(): CloudClient {
  return new CloudClient({
    apiKey: getRequiredEnv("CHROMA_API_KEY"),
    tenant: getRequiredEnv("CHROMA_TENANT"),
    database: getRequiredEnv("CHROMA_DATABASE"),
  });
}

/**
 * Récupère ou crée la collection unique utilisée pour stocker
 * tous les chunks des documents.
 *
 * La métadonnée documentId permettra ensuite de limiter
 * les recherches à un PDF donné.
 */
async function getChunksCollection() {
  const client = getChromaClient();

  const schema = new Schema();

  schema.createIndex(
    new VectorIndexConfig({
      space: "cosine",
    }),
  );

  return client.getOrCreateCollection({
    name: COLLECTION_NAME,
    schema,
    embeddingFunction: null,
  });
}

/**
 * Stocke ou met à jour les chunks avec leurs embeddings
 * déjà calculés.
 */
export async function storeChunks(
  chunks: DocumentChunk[],
  embeddings: number[][],
): Promise<void> {
  if (chunks.length === 0) {
    return;
  }

  if (chunks.length !== embeddings.length) {
    throw new Error(
      "Le nombre de chunks doit être identique au nombre d'embeddings.",
    );
  }

  const collection = await getChunksCollection();

  await collection.upsert({
    ids: chunks.map((chunk) => chunk.id),

    documents: chunks.map((chunk) => chunk.content),

    embeddings,

    metadatas: chunks.map((chunk) => ({
      page: chunk.page,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
    })),
  });
}

/**
 * Recherche les chunks les plus similaires à l'intérieur
 * d'un document donné.
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  documentId: string,
  topK = 5,
): Promise<ChromaSearchResult[]> {
  if (queryEmbedding.length === 0) {
    throw new Error("L'embedding de la question ne doit pas être vide.");
  }

  if (!documentId.trim()) {
    throw new Error("Le documentId est obligatoire.");
  }

  if (topK <= 0) {
    throw new Error("La valeur de topK doit être supérieure à zéro.");
  }

  const collection = await getChunksCollection();

  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,

    where: {
      documentId: {
        $eq: documentId,
      },
    },

    include: ["documents", "metadatas", "distances"],
  });

  const ids = result.ids[0] ?? [];
  const documents = result.documents?.[0] ?? [];
  const metadatas = result.metadatas?.[0] ?? [];
  const distances = result.distances?.[0] ?? [];

  return ids.map((id, index) => {
    const metadata = metadatas[index];

    if (!metadata) {
      throw new Error(
        `Métadonnées manquantes pour le résultat Chroma ${id}.`,
      );
    }

    return {
      id,
      content: documents[index] ?? "",
      page: Number(metadata.page),
      documentId: String(metadata.documentId),
      documentName: String(metadata.documentName),
      distance: distances[index] ?? Number.POSITIVE_INFINITY,
    };
  });
}