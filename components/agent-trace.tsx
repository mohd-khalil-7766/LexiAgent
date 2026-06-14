"use client";

import type { AgentWorkflowTrace } from "@/lib/agent-workflow";
import styles from "./agent-trace.module.css";

type AgentTraceProps = {
  trace: AgentWorkflowTrace;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

function renderList(values: string[]) {
  if (values.length === 0) {
    return <p className={styles.empty}>Not available for this entry.</p>;
  }

  return (
    <div className={styles.list}>
      {values.map((value) => (
        <span className={styles.chip} key={value}>
          {value}
        </span>
      ))}
    </div>
  );
}

function AgentTraceContent({ trace }: { trace: AgentWorkflowTrace }) {
  const sourceStatusClass =
    trace.sourceRetrieval.status === "real_source_found"
      ? styles.statusFound
      : styles.statusFallback;

  return (
    <div className={styles.content}>
      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Source Retrieval Agent</h4>
        <div className={styles.grid}>
          <div className={styles.row}>
            <span className={styles.label}>Input word</span>
            <p className={styles.value}>{trace.sourceRetrieval.inputWord}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>External tool</span>
            <p className={styles.value}>{trace.sourceRetrieval.externalTool}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Status</span>
            <span className={sourceStatusClass}>
              Source Retrieval Agent: {trace.sourceRetrieval.statusText}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Source</span>
            <p className={styles.value}>
              {trace.sourceRetrieval.sourceName ?? "No real source found."}
            </p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>URL</span>
            {trace.sourceRetrieval.sourceUrl ? (
              <a
                className={styles.link}
                href={trace.sourceRetrieval.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {trace.sourceRetrieval.sourceUrl}
              </a>
            ) : (
              <p className={styles.empty}>No real source found, fallback used.</p>
            )}
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Retrieved example/snippet</span>
            <p className={styles.value}>
              {trace.sourceRetrieval.retrievedSnippet ??
                "No verified source snippet is stored for this entry."}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>
          {trace.vocabularyTutor.agentLabel}
        </h4>
        <div className={styles.grid}>
          <div className={styles.row}>
            <span className={styles.label}>LLM</span>
            <p className={styles.value}>
              {trace.vocabularyTutor.llm ?? "Configured model not recorded."}
            </p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Generated phonetic symbol</span>
            <p className={styles.value}>
              {trace.vocabularyTutor.pronunciation ?? "Not available"}
            </p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Generated meaning</span>
            <p className={styles.value}>
              {trace.vocabularyTutor.meaning ?? "Not available"}
            </p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Translated example</span>
            <p className={styles.value}>
              {trace.vocabularyTutor.translatedExample ?? "Not available"}
            </p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Collocations</span>
            {renderList(trace.vocabularyTutor.collocations)}
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Synonyms</span>
            {renderList(trace.vocabularyTutor.synonyms)}
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Antonyms</span>
            {renderList(trace.vocabularyTutor.antonyms)}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Storage</h4>
        <div className={styles.grid}>
          <div className={styles.row}>
            <span className={styles.label}>Supabase</span>
            <p className={styles.value}>
              {trace.storage.savedToSupabase
                ? "Saved final vocabulary entry to Supabase."
                : "Supabase save not confirmed."}
            </p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Returned to interfaces</span>
            <p className={styles.value}>{trace.storage.statusText}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AgentTrace({
  trace,
  collapsible = false,
  defaultOpen = false,
}: AgentTraceProps) {
  if (!collapsible) {
    return (
      <section className={`${styles.card} ${styles.staticCard}`}>
        <div className={styles.summaryText}>
          <span className={styles.eyebrow}>Agent Workflow Trace</span>
          <h3 className={styles.title}>Agent Workflow Trace</h3>
          <p className={styles.subtitle}>
            User Input → Source Retrieval Agent → Vocabulary Tutor Agent →
            Supabase → Web UI / Telegram
          </p>
        </div>
        <AgentTraceContent trace={trace} />
      </section>
    );
  }

  return (
    <details
      className={`${styles.card} ${styles.collapsible}`}
      open={defaultOpen}
    >
      <summary className={styles.summary}>
        <div className={styles.summaryText}>
          <span className={styles.eyebrow}>Agent Workflow Trace</span>
          <h3 className={styles.title}>Agent Workflow Trace</h3>
          <p className={styles.subtitle}>
            User Input → Source Retrieval Agent → Vocabulary Tutor Agent →
            Supabase → Web UI / Telegram
          </p>
        </div>
        <span className={styles.chevron}>▼</span>
      </summary>
      <AgentTraceContent trace={trace} />
    </details>
  );
}
