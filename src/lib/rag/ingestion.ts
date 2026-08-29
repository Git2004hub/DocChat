import { parsePdf } from "@/lib/pdf";
import { chunkDocument } from "@/lib/rag/chunking";
import { embedDocuments } from "@/lib/rag/embeddings";
import { storeChunks } from "@/lib/chroma";

import type { UploadResponse } from "@/lib/types/api";

/**
 * Orchestre l'ensemble du pipeline d'ingestion d'un document PDF :
 * analyse, découpage en chunks, génération des embeddings
 * et stockage dans la base vectorielle.
 */
export async function ingestDocument(
  buffer: Buffer,
  documentId: string,
  documentName: string,
): Promise<UploadResponse> {
  if (!documentId.trim()) {
    throw new Error("Le documentId est obligatoire.");
  }

  if (!documentName.trim()) {
    throw new Error("Le nom du document est obligatoire.");
  }

  // 1. Extraction du texte du PDF page par page.
  const parsedPdf = await parsePdf(buffer);

  // 2. Découpage du texte en chunks en conservant les métadonnées.
  const chunks = await chunkDocument(
    parsedPdf.pages,
    documentId,
    documentName,
  );

  if (chunks.length === 0) {
    throw new Error(
      "Aucun chunk exploitable n'a été généré à partir du document.",
    );
  }

  // 3. Extraction du contenu textuel nécessaire à la vectorisation.
  const contents = chunks.map((chunk) => chunk.content);

  // 4. Génération des embeddings des chunks.
  const embeddings = await embedDocuments(contents);

  // 5. Stockage des chunks, embeddings et métadonnées dans Chroma.
  await storeChunks(chunks, embeddings);

  // 6. Résumé du traitement retourné à la couche API.
  return {
    documentId,
    documentName,
    pageCount: parsedPdf.pageCount,
    chunkCount: chunks.length,
  };
}