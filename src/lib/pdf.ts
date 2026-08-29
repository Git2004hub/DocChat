import { PDFParse } from "pdf-parse";
import { getPath } from "pdf-parse/worker";

import type { ParsedPage, ParsedPdf } from "@/lib/types/document";

/*
 * Configure explicitement le worker PDF afin qu'il puisse être
 * résolu correctement dans l'environnement serveur Next.js.
 */
PDFParse.setWorker(getPath());

/*
 * Normalisation légère du texte tout en préservant les limites
 * utiles des lignes et des paragraphes.
 */
function normalizePageText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Analyse un fichier PDF et en extrait le contenu textuel page par page.
 *
 * Cette fonction est volontairement indépendante du chunking,
 * des embeddings, du stockage vectoriel et de la logique LLM.
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Le buffer PDF est vide ou invalide.");
  }

  /*
   * L'utilisation d'un nouveau Uint8Array évite de partager inutilement
   * le Buffer original avec les mécanismes internes d'analyse du PDF.
   */
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
  });

  try {
    const result = await parser.getText();

    const pages: ParsedPage[] = result.pages
      .map((page) => ({
        pageNumber: page.num,
        content: normalizePageText(page.text),
      }))
      .filter((page) => page.content.length > 0);

    if (pages.length === 0) {
      throw new Error("Aucun texte lisible n'a été trouvé dans le PDF.");
    }

    return {
      pageCount: result.total,
      pages,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur inconnue lors de l'analyse du PDF.";

    throw new Error(`Échec de l'analyse du PDF : ${message}`, {
      cause: error,
    });
  } finally {
    await parser.destroy();
  }
}