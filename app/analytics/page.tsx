import { AppShell } from "@/components/AppShell";
import { getLexiAgentVocabularyEntries } from "@/lib/lexiagent-data";
import {
  AnalyticsClient,
  type AnalyticsEntry,
} from "./AnalyticsClient";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Failed to load analytics data.";
}

export default async function AnalyticsPage() {
  const result = await getLexiAgentVocabularyEntries()
    .then((data) => ({ data, error: null as string | null }))
    .catch((error: unknown) => ({
      data: null,
      error: getErrorMessage(error),
    }));

  const entries = (result.data?.entries ?? []) as AnalyticsEntry[];

  return (
    <AppShell
      eyebrow="PROGRESS ANALYTICS"
      title="Learning analytics"
      description="Track saved vocabulary, verified sources, review progress, language coverage, and recent learning activity."
    >
      {result.error ? (
        <article className="page-card error-card">
          <h2>Analytics data failed</h2>
          <p>{result.error}</p>
        </article>
      ) : (
        <AnalyticsClient entries={entries} />
      )}
    </AppShell>
  );
}