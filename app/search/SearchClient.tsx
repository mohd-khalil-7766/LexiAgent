"use client";

/* eslint-disable @next/next/no-img-element -- Source images are dynamic and only shown when relevant. */

import { FormEvent, useMemo, useState } from "react";
import { AgentTrace } from "@/components/agent-trace";
import { SpeakButton } from "@/components/SpeakButton";
import {
  buildWorkflowTraceFromEntry,
  type AgentWorkflowTrace,
} from "@/lib/agent-workflow";

type LearningLanguage = "en" | "zh";
type ExplanationLanguage = "en" | "ar" | "zh";

type AgentEntry = {
  id: string;
  word: string;
  pronunciation: string | null;
  part_of_speech: string | null;
  meaning: string | null;
  example_sentence: string | null;
  translated_example: string | null;
  source_name: string | null;
  source_title: string | null;
  source_url: string | null;
  source_image_url?: string | null;
  source_image_description?: string | null;
  source_favicon_url?: string | null;
  source_verified: boolean | null;
  review_status: string | null;
  collocations?: string[] | null;
  synonyms?: string[] | null;
  antonyms?: string[] | null;
};

type AgentResponse = {
  success: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
  entry?: AgentEntry;
  workflowTrace?: AgentWorkflowTrace;
};

type SimpleExampleResponse = {
  success: boolean;
  example_sentence?: string;
  translated_example?: string;
  error?: string;
  warning?: string;
  model?: string;
};

const explanationLabels: Record<ExplanationLanguage, string> = {
  en: "English",
  ar: "Arabic",
  zh: "Chinese",
};

const learningLabels: Record<LearningLanguage, string> = {
  en: "English Vocabulary",
  zh: "Chinese Vocabulary",
};

function shouldShowSourceImage(entry: AgentEntry) {
  if (!entry.source_image_url || !entry.source_image_description) {
    return false;
  }

  const word = entry.word.toLowerCase();
  const description = entry.source_image_description.toLowerCase();

  const looksLikeAd =
    /ad|advert|linguix|grammarly|write better|assistant|promo|banner|sponsor/i.test(
      description,
    );

  return description.includes(word) && !looksLikeAd;
}

export function SearchClient() {
  const [word, setWord] = useState("culture");
  const [learningLanguage, setLearningLanguage] =
    useState<LearningLanguage>("en");
  const [explanationLanguage, setExplanationLanguage] =
    useState<ExplanationLanguage>("zh");
  const [isLoading, setIsLoading] = useState(false);
  const [isExampleLoading, setIsExampleLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [simpleExample, setSimpleExample] =
    useState<SimpleExampleResponse | null>(null);

  const telegramCommand = useMemo(
    () =>
      `add ${word.trim() || "word"} --learn ${learningLanguage} --explain ${explanationLanguage}`,
    [word, learningLanguage, explanationLanguage],
  );

  const workflowTrace = useMemo(() => {
    if (!result?.success || !result.entry) {
      return null;
    }

    return result.workflowTrace ?? buildWorkflowTraceFromEntry(result.entry);
  }, [result]);

  async function generateSimpleExample(entry: AgentEntry) {
    setIsExampleLoading(true);
    setSimpleExample(null);

    try {
      const response = await fetch("/api/agent/simple-example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: entry.word,
          meaning: entry.meaning,
          learningLanguage,
          explanationLanguage,
        }),
      });

      const payload = (await response.json()) as SimpleExampleResponse;
      setSimpleExample(payload);
    } catch (error) {
      setSimpleExample({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Simple example generation failed.",
      });
    } finally {
      setIsExampleLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanWord = word.trim();

    if (!cleanWord) {
      setResult({
        success: false,
        error: "Enter a vocabulary word first.",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setSimpleExample(null);

    try {
      const response = await fetch("/api/agent/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: cleanWord,
          learningLanguage,
          explanationLanguage,
          channel: "web",
        }),
      });

      const payload = (await response.json()) as AgentResponse;
      setResult(payload);

      if (payload.success && payload.entry) {
        await generateSimpleExample(payload.entry);
      }
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "The browser could not reach the Agent API.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-grid two-columns">
      <article className="page-card">
        <h2>Add word with Agent</h2>
        <p>
          Search a real source, generate a clean AI learning example, verify the
          vocabulary workflow, and save the result to Supabase.
        </p>

        <form className="agent-form" onSubmit={handleSubmit}>
          <label>
            Word
            <input
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="Enter a word, for example: culture"
            />
          </label>

          <div className="form-grid">
            <label>
              Learning language
              <select
                value={learningLanguage}
                onChange={(event) =>
                  setLearningLanguage(event.target.value as LearningLanguage)
                }
              >
                <option value="en">English Vocabulary</option>
                <option value="zh">Chinese Vocabulary</option>
              </select>
            </label>

            <label>
              Explain in
              <select
                value={explanationLanguage}
                onChange={(event) =>
                  setExplanationLanguage(
                    event.target.value as ExplanationLanguage,
                  )
                }
              >
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div className="telegram-command-box">
            <span>Planned Telegram command</span>
            <code>{telegramCommand}</code>
          </div>

          <button className="primary-button button-reset" disabled={isLoading}>
            {isLoading ? "Searching and saving..." : "Search authentic example"}
          </button>
        </form>
      </article>

      <article className="page-card">
        <div className="section-heading-row">
          <div>
            <h2>Agent result preview</h2>
            <p>
              {learningLabels[learningLanguage]} explained in{" "}
              {explanationLabels[explanationLanguage]}.
            </p>
          </div>
          <span className={result?.success ? "live-pill" : "pending-pill"}>
            {result?.success ? "SAVED" : "READY"}
          </span>
        </div>

        {!result ? (
          <div className="empty-state compact-empty">
            <h3>No search result yet</h3>
            <p>Run the Agent to show the vocabulary card here.</p>
          </div>
        ) : result.success && result.entry ? (
          <div className="agent-result-card">
            <div className="vocab-card-top">
              <div>
                <h3>{result.entry.word}</h3>
                <p>{result.entry.pronunciation || "Pronunciation pending"}</p>
              </div>
              <span>{result.entry.part_of_speech || "word"}</span>
            </div>

            <div className="audio-row">
  <SpeakButton
    text={result.entry.word}
    language={learningLanguage}
    label="Listen to word"
  />

  {result.entry.meaning ? (
    <SpeakButton
      text={result.entry.meaning}
      language={explanationLanguage}
      label="Listen to meaning"
    />
  ) : null}

  {simpleExample?.example_sentence ? (
    <SpeakButton
      text={simpleExample.example_sentence}
      language={learningLanguage}
      label="Listen to AI example"
    />
  ) : null}

  {simpleExample?.translated_example ? (
    <SpeakButton
      text={simpleExample.translated_example}
      language={explanationLanguage}
      label="Listen to translation"
    />
  ) : null}
</div>

            <p className="vocab-meaning">
              {result.entry.meaning || "Meaning pending"}
            </p>

            <div className="simple-example-card">
              <div className="source-proof-header">
                <strong>AI learner example</strong>
                <span>{isExampleLoading ? "Generating..." : "Simple sentence"}</span>
              </div>

              {isExampleLoading ? (
                <p>Generating a simple example sentence...</p>
              ) : simpleExample?.success ? (
                <>
                  <p>{simpleExample.example_sentence}</p>
                  <div className="translation-box">
                    <strong>Translation</strong>
                    <p>{simpleExample.translated_example}</p>
                  </div>
                </>
              ) : (
                <p>{simpleExample?.error ?? "Simple example unavailable."}</p>
              )}
            </div>

            <div className="source-proof-card">
              <div className="source-proof-header">
                <strong>Real source proof</strong>
                <span>{result.entry.source_verified ? "Verified" : "Pending"}</span>
              </div>

              {shouldShowSourceImage(result.entry) ? (
                <div className="source-image-card">
                  <img
                    src={result.entry.source_image_url ?? ""}
                    alt={result.entry.source_image_description ?? "Source image"}
                  />
                </div>
              ) : null}

              <div className="source-row source-row-large">
                <div>
                  <strong>{result.entry.source_name ?? "Source pending"}</strong>
                  <p>{result.entry.source_title ?? "Source title unavailable"}</p>
                </div>

                {result.entry.source_url ? (
                  <a
                    href={result.entry.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open original source
                  </a>
                ) : (
                  <span>No URL</span>
                )}
              </div>

              {result.entry.example_sentence ? (
                <details className="verified-sentence-details">
                  <summary>Show verified source sentence</summary>
                  <p>{result.entry.example_sentence}</p>
                </details>
              ) : null}

              <p className="saved-date">
                The source proves the word was found online. The learning
                example above is generated by AI for clarity.
              </p>
            </div>

            {workflowTrace ? <AgentTrace trace={workflowTrace} /> : null}
          </div>
        ) : (
          <div className="agent-error-box">
            <h3>Agent request failed</h3>
            <p>{result.error ?? "Unknown Agent error."}</p>
          </div>
        )}
      </article>
    </div>
  );
}
