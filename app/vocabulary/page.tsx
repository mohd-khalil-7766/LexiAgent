import { AppShell } from "@/components/AppShell";
import { getLexiAgentVocabularyEntries } from "@/lib/lexiagent-data";
import {
  VocabularyClient,
  type VocabularyClientEntry,
} from "./VocabularyClient";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Failed to load vocabulary data.";
}

export default async function VocabularyPage() {
  const result = await getLexiAgentVocabularyEntries()
    .then((data) => ({ data, error: null as string | null }))
    .catch((error: unknown) => ({
      data: null,
      error: getErrorMessage(error),
    }));

  const entries = (result.data?.entries ?? []) as VocabularyClientEntry[];

  return (
    <AppShell
      eyebrow="VOCABULARY LIBRARY"
      title="My Vocabulary"
      description="Review all saved words, inspect examples, listen to audio, and open verified source links."
    >
      {result.error ? (
        <article className="page-card error-card">
          <h2>Vocabulary data failed</h2>
          <p>{result.error}</p>
        </article>
      ) : (
        <VocabularyClient entries={entries} />
      )}
    </AppShell>
  );
}