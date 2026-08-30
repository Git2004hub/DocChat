"use client";

import { useState } from "react";

import Upload from "@/components/Upload";
import Chat from "@/components/Chat";

import type { UploadResponse } from "@/lib/types/api";

export default function Home() {
  const [document, setDocument] =
    useState<UploadResponse | null>(null);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            RAG · PDF · IA
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            DocChat
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Importez un document PDF puis posez vos questions.
            Les réponses sont générées uniquement à partir du
            contenu du document.
          </p>
        </header>

        <div className="space-y-6">
          <Upload onUploadSuccess={setDocument} />

          {document ? (
            <>
              <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Document actif
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {document.documentName}
                  </p>
                </div>

                <p className="text-sm text-slate-500">
                  {document.pageCount} page
                  {document.pageCount > 1 ? "s" : ""}
                  {" · "}
                  {document.chunkCount} chunks
                </p>
              </section>

              <Chat
                key={document.documentId}
                documentId={document.documentId}
                documentName={document.documentName}
              />
            </>
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Le chat sera disponible après le traitement
              d&apos;un document.
            </section>
          )}
        </div>
      </div>
    </main>
  );
}