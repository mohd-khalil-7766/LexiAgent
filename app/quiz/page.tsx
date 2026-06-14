import { AppShell } from "@/components/AppShell";
import { getLexiAgentVocabularyEntries } from "@/lib/lexiagent-data";
import { QuizClient, type QuizEntry } from "./QuizClient";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Failed to load quiz vocabulary data.";
}

export default async function QuizPage() {
  const result = await getLexiAgentVocabularyEntries()
    .then((data) => ({ data, error: null as string | null }))
    .catch((error: unknown) => ({
      data: null,
      error: getErrorMessage(error),
    }));

  const entries = (result.data?.entries ?? []) as QuizEntry[];

  return (
    <AppShell
      eyebrow="REVIEW QUIZ"
      title="Multiple-choice vocabulary exam"
      description="Practice meanings and sentence questions using your saved LexiAgent vocabulary library."
    >
      {result.error ? (
        <article className="page-card error-card">
          <h2>Quiz data failed</h2>
          <p>{result.error}</p>
        </article>
      ) : (
        <QuizClient entries={entries} />
      )}
    </AppShell>
  );
}