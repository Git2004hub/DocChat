import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/ingestion";

import type {
  ApiError,
  UploadResponse,
} from "@/lib/types/api";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Traite l'upload d'un fichier PDF et déclenche
 * son pipeline complet d'ingestion.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      const response: ApiError = {
        error: "FILE_REQUIRED",
        message: "Aucun fichier PDF n'a été fourni.",
      };

      return NextResponse.json(response, {
        status: 400,
      });
    }

    if (file.size === 0) {
      const response: ApiError = {
        error: "EMPTY_FILE",
        message: "Le fichier envoyé est vide.",
      };

      return NextResponse.json(response, {
        status: 400,
      });
    }

    if (file.type !== "application/pdf") {
      const response: ApiError = {
        error: "INVALID_FILE_TYPE",
        message: "Seuls les fichiers PDF sont acceptés.",
      };

      return NextResponse.json(response, {
        status: 400,
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      const response: ApiError = {
        error: "FILE_TOO_LARGE",
        message:
          "Le fichier PDF ne doit pas dépasser 10 Mo.",
      };

      return NextResponse.json(response, {
        status: 413,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const documentId = randomUUID();

    const result: UploadResponse = await ingestDocument(
      buffer,
      documentId,
      file.name,
    );

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "Erreur lors du traitement du fichier PDF :",
      error,
    );

    const response: ApiError = {
      error: "INGESTION_ERROR",
      message:
        "Une erreur est survenue pendant le traitement du document.",
    };

    return NextResponse.json(response, {
      status: 500,
    });
  }
}