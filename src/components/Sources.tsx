import type { Source } from "@/lib/types/chat";

interface SourcesProps {
  sources: Source[];
}

const MAX_PREVIEW_LENGTH = 320;

function createPreview(content: string): string {
  const cleaned = content.trim();

  if (cleaned.length <= MAX_PREVIEW_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, MAX_PREVIEW_LENGTH)}...`;
}

export default function Sources({
  sources,
}: SourcesProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Sources utilisées
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Passages récupérés dans le document pour la dernière
          réponse.
        </p>
      </div>

      <div className="space-y-2">
        {sources.map((source, index) => (
          <details
            key={`${source.page}-${index}`}
            className="group rounded-lg border border-slate-200 bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">
                Source {index + 1} · Page {source.page}
              </span>

              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                score {source.score.toFixed(3)}
              </span>
            </summary>

            <div className="border-t border-slate-100 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {createPreview(source.content)}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}