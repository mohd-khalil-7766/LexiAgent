/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { AgentTrace } from "@/components/agent-trace";
import { SpeakButton } from "@/components/SpeakButton";
import { buildWorkflowTraceFromEntry } from "@/lib/agent-workflow";
import styles from "./VocabularyClient.module.css";

type SpeechLanguage = "en" | "zh" | "ar";

export type VocabularyClientEntry = {
  id: string;
  word: string;
  normalized_word?: string | null;
  learning_language: string;
  explanation_language: string;
  pronunciation?: string | null;
  part_of_speech?: string | null;
  meaning?: string | null;
  collocations?: string[] | null;
  synonyms?: string[] | null;
  antonyms?: string[] | null;
  example_sentence?: string | null;
  translated_example?: string | null;
  source_name?: string | null;
  source_title?: string | null;
  source_url?: string | null;
  source_verified?: boolean | null;
  review_status?: string | null;
  times_reviewed?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  source_image_url?: string | null;
  source_image_description?: string | null;
  source_favicon_url?: string | null;
};

type VocabularyClientProps = {
  entries: VocabularyClientEntry[];
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Saved date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function safeLanguage(value?: string | null): SpeechLanguage {
  if (value === "zh" || value === "ar" || value === "en") {
    return value;
  }

  return "en";
}

function languageLabel(value?: string | null) {
  const labels: Record<string, string> = {
    en: "English",
    zh: "Chinese",
    ar: "Arabic",
  };

  return value ? labels[value] ?? value : "Unknown";
}

function directionFor(value?: string | null) {
  return value === "ar" ? "rtl" : "ltr";
}

function arrayPreview(values?: string[] | null) {
  if (!values || values.length === 0) {
    return "Not available";
  }

  return values.join(", ");
}

function containsMojibake(value: string) {
  return /[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîï]/.test(
    value,
  );
}

function repairMojibake(value?: string | null) {
  if (!value) {
    return "";
  }

  if (!containsMojibake(value)) {
    return value;
  }

  try {
    const bytes = Array.from(value).map((char) => char.charCodeAt(0));

    if (bytes.some((byte) => byte > 255)) {
      return value;
    }

    const encoded = bytes
      .map((byte) => `%${byte.toString(16).padStart(2, "0")}`)
      .join("");

    return decodeURIComponent(encoded);
  } catch {
    return value;
  }
}

export function VocabularyClient({ entries }: VocabularyClientProps) {
  const [query, setQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? "");

  const filteredEntries = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const searchableText = [
        entry.word,
        entry.pronunciation,
        entry.part_of_speech,
        entry.meaning,
        entry.example_sentence,
        entry.translated_example,
        entry.source_name,
        entry.source_title,
        entry.learning_language,
        entry.explanation_language,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = cleanQuery
        ? searchableText.includes(cleanQuery)
        : true;

      const pair = `${entry.learning_language}-${entry.explanation_language}`;
      const matchesLanguage =
        languageFilter === "all" ? true : pair === languageFilter;

      return matchesQuery && matchesLanguage;
    });
  }, [entries, query, languageFilter]);

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ??
    filteredEntries[0] ??
    entries[0] ??
    null;

  const selectedTrace = useMemo(() => {
    if (!selectedEntry) {
      return null;
    }

    return buildWorkflowTraceFromEntry(selectedEntry);
  }, [selectedEntry]);

  const languagePairs = useMemo(() => {
    const pairs = new Map<string, string>();

    entries.forEach((entry) => {
      const key = `${entry.learning_language}-${entry.explanation_language}`;
      const label = `${languageLabel(entry.learning_language)} → ${languageLabel(
        entry.explanation_language,
      )}`;

      pairs.set(key, label);
    });

    return Array.from(pairs.entries());
  }, [entries]);

  return (
    <section className={styles.layout}>
      <article className={styles.libraryCard}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.kicker}>Live Supabase Library</p>
            <h2>Saved vocabulary</h2>
            <p>
              {entries.length} saved entries. Filter, review, listen, and open
              verified source pages.
            </p>
          </div>

          <span className={styles.livePill}>LIVE DB</span>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.field}>
            <span>Search library</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search word, meaning, example, source..."
            />
          </label>

          <label className={styles.field}>
            <span>Language pair</span>
            <select
              value={languageFilter}
              onChange={(event) => setLanguageFilter(event.target.value)}
            >
              <option value="all">All languages</option>
              {languagePairs.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredEntries.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No matching vocabulary</h3>
            <p>Try another search word or remove the language filter.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredEntries.map((entry) => {
              const active = selectedEntry?.id === entry.id;

              return (
                <button
                  key={entry.id}
                  type="button"
                  className={
                    active ? `${styles.listItem} ${styles.active}` : styles.listItem
                  }
                  onClick={() => setSelectedId(entry.id)}
                >
                  <span className={styles.wordRow}>
                    <strong>{repairMojibake(entry.word)}</strong>
                    <em>{entry.review_status ?? "new"}</em>
                  </span>

                  <span className={styles.meaningPreview}>
                    {repairMojibake(entry.meaning) || "Meaning pending"}
                  </span>

                  <small>
                    {languageLabel(entry.learning_language)} →{" "}
                    {languageLabel(entry.explanation_language)} ·{" "}
                    {formatDate(entry.created_at)}
                  </small>
                </button>
              );
            })}
          </div>
        )}
      </article>

      <article className={styles.detailCard}>
        {selectedEntry ? (
          <>
            <div className={styles.detailTop}>
              <div>
                <p className={styles.kicker}>Selected Entry</p>
                <h2>{repairMojibake(selectedEntry.word)}</h2>
                <p>
                  {repairMojibake(selectedEntry.pronunciation) ||
                    "Pronunciation pending"}
                </p>
              </div>

              <span className={styles.statusPill}>
                {selectedEntry.source_verified ? "Verified" : "Pending"}
              </span>
            </div>

            <div className={styles.audioRow}>
              <SpeakButton
                text={repairMojibake(selectedEntry.word)}
                language={safeLanguage(selectedEntry.learning_language)}
                label="Listen word"
              />

              {selectedEntry.example_sentence ? (
                <SpeakButton
                  text={repairMojibake(selectedEntry.example_sentence)}
                  language={safeLanguage(selectedEntry.learning_language)}
                  label="Listen source example"
                />
              ) : null}

              {selectedEntry.translated_example ? (
                <SpeakButton
                  text={repairMojibake(selectedEntry.translated_example)}
                  language={safeLanguage(selectedEntry.explanation_language)}
                  label="Listen translation"
                />
              ) : null}
            </div>

            <div className={styles.metaGrid}>
              <div>
                <span>Part of speech</span>
                <strong>
                  {repairMojibake(selectedEntry.part_of_speech) ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>Language pair</span>
                <strong>
                  {languageLabel(selectedEntry.learning_language)} →{" "}
                  {languageLabel(selectedEntry.explanation_language)}
                </strong>
              </div>

              <div>
                <span>Reviews</span>
                <strong>{selectedEntry.times_reviewed ?? 0}</strong>
              </div>

              <div>
                <span>Saved</span>
                <strong>{formatDate(selectedEntry.created_at)}</strong>
              </div>
            </div>

            <section
              className={styles.meaningBox}
              dir={directionFor(selectedEntry.explanation_language)}
            >
              <span>Meaning</span>
              <p>{repairMojibake(selectedEntry.meaning) || "Meaning pending"}</p>
            </section>

            {selectedEntry.example_sentence ? (
              <section className={styles.exampleBox}>
                <span>Verified source sentence</span>
                <p>{repairMojibake(selectedEntry.example_sentence)}</p>
              </section>
            ) : null}

            {selectedEntry.translated_example ? (
              <section
                className={`${styles.exampleBox} ${styles.translationBox}`}
                dir={directionFor(selectedEntry.explanation_language)}
              >
                <span>Translation</span>
                <p>{repairMojibake(selectedEntry.translated_example)}</p>
              </section>
            ) : null}

            <div className={styles.extraGrid}>
              <section>
                <span>Collocations</span>
                <p>{arrayPreview(selectedEntry.collocations)}</p>
              </section>

              <section>
                <span>Synonyms</span>
                <p>{arrayPreview(selectedEntry.synonyms)}</p>
              </section>

              <section>
                <span>Antonyms</span>
                <p>{arrayPreview(selectedEntry.antonyms)}</p>
              </section>
            </div>

            <section className={styles.sourceCard}>
              {selectedEntry.source_image_url ? (
                <img
                  src={selectedEntry.source_image_url}
                  alt={
                    selectedEntry.source_image_description ??
                    selectedEntry.source_title ??
                    selectedEntry.word
                  }
                />
              ) : (
                <div className={styles.sourceFallback}>
                  <span>Verified source</span>
                </div>
              )}

              <div className={styles.sourceBody}>
                <span>Source</span>
                <h3>{selectedEntry.source_name ?? "Source pending"}</h3>
                <p>
                  {repairMojibake(selectedEntry.source_title) ||
                    "Source title unavailable"}
                </p>

                {selectedEntry.source_url ? (
                  <a
                    href={selectedEntry.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source
                  </a>
                ) : (
                  <strong>No URL available</strong>
                )}
              </div>
            </section>

            {selectedTrace ? (
              <AgentTrace
                trace={selectedTrace}
                collapsible
                defaultOpen={false}
              />
            ) : null}
          </>
        ) : (
          <div className={styles.emptyState}>
            <h3>No saved vocabulary yet</h3>
            <p>Add words from AI Example Search or Telegram.</p>
          </div>
        )}
      </article>
    </section>
  );
}
