import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getLexiAgentDashboardData } from "@/lib/lexiagent-data";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load dashboard data.";
}

export default async function DashboardPage() {
  const result = await getLexiAgentDashboardData()
    .then((data) => ({ data, error: null as string | null }))
    .catch((error: unknown) => ({
      data: null,
      error: getErrorMessage(error),
    }));

  return (
    <AppShell
      eyebrow="AI-NATIVE LANGUAGE PLATFORM"
      title="Learning Dashboard"
      description="Track saved vocabulary, verified sources, quiz readiness, and the Telegram/OpenClaw learning workflow."
    >
      {result.error ? (
        <article className="page-card error-card">
          <h2>Dashboard data failed</h2>
          <p>{result.error}</p>
        </article>
      ) : (
        <>
          <div className="page-grid stats-grid">
            <article className="page-card">
              <h3>Saved Words</h3>
              <span className="stat-number">
                {result.data?.totals.vocabularyEntries ?? 0}
              </span>
              <p>Vocabulary currently stored in Supabase.</p>
            </article>

            <article className="page-card">
              <h3>Real Sources</h3>
              <span className="stat-number">
                {result.data?.totals.sourceRecords ?? 0}
              </span>
              <p>Entries with original article URLs.</p>
            </article>

            <article className="page-card">
              <h3>Agent Runs</h3>
              <span className="stat-number">
                {result.data?.totals.agentRuns ?? 0}
              </span>
              <p>Search and generation workflows recorded.</p>
            </article>

            <article className="page-card">
              <h3>Learning History</h3>
              <span className="stat-number">
                {result.data?.totals.learningHistory ?? 0}
              </span>
              <p>Saved review and learning activity records.</p>
            </article>
          </div>

          <div className="page-grid two-columns">
            <article className="page-card">
              <h2>Recent vocabulary</h2>
              {(result.data?.recentEntries.length ?? 0) === 0 ? (
                <p>No vocabulary has been saved yet.</p>
              ) : (
                <div className="compact-entry-list">
                  {result.data?.recentEntries.map((entry) => (
                    <div className="compact-entry" key={entry.id}>
                      <div>
                        <strong>{entry.word}</strong>
                        <span>{entry.part_of_speech ?? "part of speech pending"}</span>
                      </div>
                      <p>{entry.meaning ?? "Meaning pending"}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="page-card">
              <h2>Quick actions</h2>
              <p>Use the main pages to add words, inspect your library, or start review.</p>
              <div className="action-row">
                <Link className="primary-button" href="/search">Add word</Link>
                <Link className="secondary-button" href="/vocabulary">Vocabulary</Link>
                <Link className="secondary-button" href="/quiz">Start quiz</Link>
                <Link className="secondary-button" href="/audio-review">Audio review</Link>
              </div>
            </article>
          </div>
        </>
      )}
    </AppShell>
  );
}
