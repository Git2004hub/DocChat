"use client";

import { useState } from "react";

import type {
  ApiError,
  UploadResponse,
} from "@/lib/types/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type UploadStatus =
  | "idle"
  | "processing"
  | "success"
  | "error";

interface UploadProps {
  onUploadSuccess: (result: UploadResponse) => void;
}

export default function Upload({
  onUploadSuccess,
}: UploadProps) {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [status, setStatus] =
    useState<UploadStatus>("idle");

  const [error, setError] =
    useState<string | null>(null);

  const [uploadResult, setUploadResult] =
    useState<UploadResponse | null>(null);

  function validateFile(file: File): string | null {
    if (file.size === 0) {
      return "Le fichier sélectionné est vide.";
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return "Seuls les fichiers PDF sont acceptés.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "Le fichier PDF ne doit pas dépasser 10 Mo.";
    }

    return null;
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setError(null);
    setUploadResult(null);
    setStatus("idle");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateFile(file);

    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      setStatus("error");

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || status === "processing") {
      return;
    }

    setStatus("processing");
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const apiError =
          (await response.json()) as ApiError;

        throw new Error(
          apiError.message ||
            "Impossible de traiter le document.",
        );
      }

      const result =
        (await response.json()) as UploadResponse;

      setUploadResult(result);
      setStatus("success");

      onUploadSuccess(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.";

      setError(message);
      setStatus("error");
    }
  }

  const isProcessing = status === "processing";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Importer un document
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Sélectionnez un PDF textuel de 10 Mo maximum.
        </p>
      </div>

      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
        <label
          htmlFor="pdf-upload"
          className="block cursor-pointer text-center"
        >
          <span className="block font-medium text-slate-700">
            {selectedFile
              ? selectedFile.name
              : "Choisir un fichier PDF"}
          </span>

          <span className="mt-1 block text-sm text-slate-500">
            PDF uniquement · 10 Mo maximum
          </span>
        </label>

        <input
          id="pdf-upload"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={isProcessing}
          className="sr-only"
        />
      </div>

      {selectedFile && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            <span className="font-medium">
              {selectedFile.name}
            </span>

            <span className="ml-2 text-slate-400">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} Mo
            </span>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={isProcessing}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing
              ? "Traitement..."
              : "Importer le PDF"}
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />

            <div>
              <p className="text-sm font-medium text-blue-900">
                Traitement du document en cours...
              </p>

              <p className="mt-1 text-xs text-blue-700">
                Analyse PDF → Découpage → Vectorisation → Indexation
              </p>
            </div>
          </div>
        </div>
      )}

      {status === "success" && uploadResult && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-medium text-emerald-900">
            ✓ Document prêt
          </p>

          <p className="mt-1 text-sm text-emerald-700">
            {uploadResult.documentName} ·{" "}
            {uploadResult.pageCount} page
            {uploadResult.pageCount > 1 ? "s" : ""} ·{" "}
            {uploadResult.chunkCount} chunks
          </p>
        </div>
      )}

      {status === "error" && error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            {error}
          </p>
        </div>
      )}
    </section>
  );
}