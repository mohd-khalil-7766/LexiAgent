import { AppShell } from "@/components/AppShell";
import { getLexiAgentVocabularyEntries } from "@/lib/lexiagent-data";
import {
  AudioReviewClient,
  type AudioReviewEntry,
} from "./AudioReviewClient";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Failed to load audio review data.";
}

export default async function AudioReviewPage() {
  const result = await getLexiAgentVocabularyEntries()
    .then((data) => ({ data, error: null as string | null }))
    .catch((error: unknown) => ({
      data: null,
      error: getErrorMessage(error),
    }));

  const entries = (result.data?.entries ?? []) as AudioReviewEntry[];

  return (
    <AppShell
      eyebrow="AUDIO REVIEW"
      title="Hands-free vocabulary review"
      description="Listen to saved words, reveal meanings, review examples, and practice vocabulary one by one."
    >
      {result.error ? (
        <article className="page-card error-card">
          <h2>Audio review data failed</h2>
          <p>{result.error}</p>
        </article>
      ) : (
        <AudioReviewClient entries={entries} />
      )}
    </AppShell>
  );
}