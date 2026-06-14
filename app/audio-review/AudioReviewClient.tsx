"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AudioReviewClient.module.css";

type SpeechLanguage = "en" | "zh" | "ar";

export type AudioReviewEntry = {
  id: string;
  word: string;
  normalized_word?: string | null;
  learning_language: string;
  explanation_language: string;
  pronunciation?: string | null;
  part_of_speech?: string | null;
  meaning?: string | null;
  example_sentence?: string | null;
  translated_example?: string | null;
  source_name?: string | null;
  source_title?: string | null;
  source_url?: string | null;
  source_verified?: boolean | null;
  review_status?: string | null;
  times_reviewed?: number | null;
  created_at?: string | null;
};

type AudioReviewClientProps = {
  entries: AudioReviewEntry[];
};

type ReviewSpeed = 0.75 | 1 | 1.25;
type AutoDelay = 3 | 5 | 8;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeLanguage(value?: string | null): SpeechLanguage {
  if (value === "zh" || value === "ar" || value === "en") {
    return value;
  }

  return "en";
}

function languageToSpeechCode(value?: string | null) {
  if (value === "zh") return "zh-CN";
  if (value === "ar") return "ar-SA";
  return "en-US";
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

function containsMojibake(value: string) {
  return /[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîï]/.test(
    value,
  );
}

function repairMojibake(value?: string | null) {
  if (!value) return "";

  if (!containsMojibake(value)) return value;

  try {
    const bytes = Array.from(value).map((char) => char.charCodeAt(0));

    if (bytes.some((byte) => byte > 255)) return value;

    const encoded = bytes
      .map((byte) => `%${byte.toString(16).padStart(2, "0")}`)
      .join("");

    return decodeURIComponent(encoded);
  } catch {
    return value;
  }
}

function getUsableEntries(entries: AudioReviewEntry[]) {
  return entries.filter((entry) => repairMojibake(entry.word));
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function pickVoice(language: SpeechLanguage) {
  if (typeof window === "undefined") return null;

  const voices = window.speechSynthesis.getVoices();
  const languageCode = languageToSpeechCode(language);

  return (
    voices.find((voice) => voice.lang === languageCode) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(language)) ??
    null
  );
}

function speakText({
  text,
  language,
  speed,
}: {
  text: string;
  language: SpeechLanguage;
  speed: ReviewSpeed;
}) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !text.trim()) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageToSpeechCode(language);
    utterance.rate = speed;
    utterance.pitch = 1;
    utterance.voice = pickVoice(language);

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export function AudioReviewClient({ entries }: AudioReviewClientProps) {
  const [reviewEntries, setReviewEntries] = useState<AudioReviewEntry[]>(entries);
  const usableEntries = useMemo(
    () => getUsableEntries(reviewEntries),
    [reviewEntries],
  );

  const [reviewQueue, setReviewQueue] = useState<AudioReviewEntry[]>(() =>
    getUsableEntries(entries),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [speed, setSpeed] = useState<ReviewSpeed>(1);
  const [autoDelay, setAutoDelay] = useState<AutoDelay>(5);
  const [isAutoReviewing, setIsAutoReviewing] = useState(false);
  const [statusText, setStatusText] = useState("Ready for review");
  const [reviewCountStatus, setReviewCountStatus] =
    useState("Review count ready");

  const autoRunIdRef = useRef(0);
  const reviewedVisitKeysRef = useRef<Set<string>>(new Set());

  const currentEntry = reviewQueue[currentIndex] ?? null;
  const progress =
    reviewQueue.length === 0
      ? 0
      : Math.round(((currentIndex + 1) / reviewQueue.length) * 100);

  useEffect(() => {
    return () => {
      autoRunIdRef.current += 1;

      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function updateEntryLocally(
    entryId: string,
    updates: Partial<AudioReviewEntry>,
  ) {
    setReviewEntries((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry,
      ),
    );

    setReviewQueue((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry,
      ),
    );
  }

  async function markReviewed(entry = currentEntry) {
    if (!entry) return;

    const visitKey = `${entry.id}:${currentIndex}`;

    if (reviewedVisitKeysRef.current.has(visitKey)) {
      return;
    }

    reviewedVisitKeysRef.current.add(visitKey);

    const optimisticCount = (entry.times_reviewed ?? 0) + 1;

    updateEntryLocally(entry.id, {
      times_reviewed: optimisticCount,
      review_status: entry.review_status === "mastered" ? "mastered" : "reviewed",
    });

    setReviewCountStatus(`Saved: reviewed ${optimisticCount} times`);

    try {
      const response = await fetch("/api/vocabulary/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entryId: entry.id,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        entry?: Partial<AudioReviewEntry>;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Review update failed.");
      }

      if (data.entry?.times_reviewed !== undefined) {
        updateEntryLocally(entry.id, {
          times_reviewed: data.entry.times_reviewed,
          review_status: data.entry.review_status ?? "reviewed",
        });

        setReviewCountStatus(
          `Saved: reviewed ${data.entry.times_reviewed} times`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Review count was not saved.";

      setReviewCountStatus(message);
    }
  }

  function stopAudio() {
    autoRunIdRef.current += 1;
    setIsAutoReviewing(false);
    setStatusText("Stopped");

    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  }

  async function playWord(entry = currentEntry) {
    if (!entry) return;

    setStatusText("Playing word...");
    await speakText({
      text: repairMojibake(entry.word),
      language: safeLanguage(entry.learning_language),
      speed,
    });
    setStatusText("Ready");
  }

  async function playMeaning(entry = currentEntry) {
    if (!entry) return;

    setShowAnswer(true);
    void markReviewed(entry);

    setStatusText("Playing meaning...");
    await speakText({
      text: repairMojibake(entry.meaning),
      language: safeLanguage(entry.explanation_language),
      speed,
    });
    setStatusText("Ready");
  }

  async function playExample(entry = currentEntry) {
    if (!entry) return;

    const example = repairMojibake(entry.example_sentence);

    if (!example) {
      setStatusText("No example sentence available");
      return;
    }

    setShowAnswer(true);
    void markReviewed(entry);

    setStatusText("Playing example...");
    await speakText({
      text: example,
      language: safeLanguage(entry.learning_language),
      speed,
    });
    setStatusText("Ready");
  }

  async function playTranslation(entry = currentEntry) {
    if (!entry) return;

    const translation = repairMojibake(entry.translated_example);

    if (!translation) {
      setStatusText("No translation available");
      return;
    }

    setShowAnswer(true);
    void markReviewed(entry);

    setStatusText("Playing translation...");
    await speakText({
      text: translation,
      language: safeLanguage(entry.explanation_language),
      speed,
    });
    setStatusText("Ready");
  }

  async function playFullReview(
    entry = currentEntry,
    runId = autoRunIdRef.current,
  ) {
    if (!entry) return;

    setShowAnswer(true);
    void markReviewed(entry);

    setStatusText("Full review playing...");

    await speakText({
      text: repairMojibake(entry.word),
      language: safeLanguage(entry.learning_language),
      speed,
    });

    if (runId !== autoRunIdRef.current) return;
    await wait(450);

    if (repairMojibake(entry.meaning)) {
      await speakText({
        text: repairMojibake(entry.meaning),
        language: safeLanguage(entry.explanation_language),
        speed,
      });
    }

    if (runId !== autoRunIdRef.current) return;
    await wait(450);

    if (repairMojibake(entry.example_sentence)) {
      await speakText({
        text: repairMojibake(entry.example_sentence),
        language: safeLanguage(entry.learning_language),
        speed,
      });
    }

    if (runId !== autoRunIdRef.current) return;
    await wait(450);

    if (repairMojibake(entry.translated_example)) {
      await speakText({
        text: repairMojibake(entry.translated_example),
        language: safeLanguage(entry.explanation_language),
        speed,
      });
    }

    setStatusText("Ready");
  }

  function goToIndex(nextIndex: number) {
    if (reviewQueue.length === 0) return;

    stopAudio();

    const safeIndex =
      ((nextIndex % reviewQueue.length) + reviewQueue.length) %
      reviewQueue.length;

    setCurrentIndex(safeIndex);
    setShowAnswer(false);
    setStatusText("Ready for review");
  }

  function nextWord() {
    goToIndex(currentIndex + 1);
  }

  function previousWord() {
    goToIndex(currentIndex - 1);
  }

  function shuffleReview() {
    stopAudio();
    reviewedVisitKeysRef.current = new Set();

    const shuffled = shuffleArray(usableEntries);

    setReviewQueue(shuffled);
    setCurrentIndex(0);
    setShowAnswer(false);
    setStatusText("Random review queue created");
  }

  function resetReviewOrder() {
    stopAudio();
    reviewedVisitKeysRef.current = new Set();

    setReviewQueue(usableEntries);
    setCurrentIndex(0);
    setShowAnswer(false);
    setStatusText("Saved order restored");
  }

  async function startAutoReview() {
    if (reviewQueue.length === 0) return;

    autoRunIdRef.current += 1;

    const runId = autoRunIdRef.current;
    let index = currentIndex;

    setIsAutoReviewing(true);
    setStatusText("Auto review started");

    while (runId === autoRunIdRef.current) {
      const entry = reviewQueue[index % reviewQueue.length];

      setCurrentIndex(index % reviewQueue.length);
      setShowAnswer(true);

      await playFullReview(entry, runId);

      if (runId !== autoRunIdRef.current) break;

      setStatusText(`Next word in ${autoDelay} seconds...`);
      await wait(autoDelay * 1000);

      index += 1;
    }
  }

  function toggleAnswer() {
    if (!currentEntry) return;

    if (showAnswer) {
      setShowAnswer(false);
      return;
    }

    setShowAnswer(true);
    void markReviewed(currentEntry);
  }

  if (usableEntries.length === 0 || !currentEntry) {
    return (
      <article className={styles.emptyCard}>
        <h2>No audio review data yet</h2>
        <p>
          Add vocabulary from AI Example Search or Telegram first. The audio
          review needs saved words.
        </p>
      </article>
    );
  }

  return (
    <section className={styles.layout}>
      <article className={styles.playerCard}>
        <div className={styles.playerTop}>
          <div>
            <p className={styles.kicker}>Current Review Word</p>
            <h2>{repairMojibake(currentEntry.word)}</h2>
            <p>
              {repairMojibake(currentEntry.pronunciation) ||
                "Pronunciation pending"}
            </p>
          </div>

          <span className={styles.statusPill}>{statusText}</span>
        </div>

        <div className={styles.reviewCountBox}>
          <div>
            <span>Times reviewed</span>
            <strong>{currentEntry.times_reviewed ?? 0}</strong>
          </div>
          <p>{reviewCountStatus}</p>
        </div>

        <div className={styles.progressBlock}>
          <div>
            <span>
              Word {currentIndex + 1} of {reviewQueue.length}
            </span>
            <strong>{progress}%</strong>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className={styles.hiddenAnswerBox}>
          <span>Meaning</span>

          {showAnswer ? (
            <p dir={directionFor(currentEntry.explanation_language)}>
              {repairMojibake(currentEntry.meaning) || "Meaning pending"}
            </p>
          ) : (
            <p className={styles.hiddenText}>
              Hidden. Click reveal or play full review.
            </p>
          )}
        </div>

        {showAnswer && currentEntry.example_sentence ? (
          <div className={styles.exampleBox}>
            <span>Example</span>
            <p>{repairMojibake(currentEntry.example_sentence)}</p>
          </div>
        ) : null}

        {showAnswer && currentEntry.translated_example ? (
          <div
            className={styles.exampleBox}
            dir={directionFor(currentEntry.explanation_language)}
          >
            <span>Translation</span>
            <p>{repairMojibake(currentEntry.translated_example)}</p>
          </div>
        ) : null}

        <div className={styles.audioButtons}>
          <button type="button" onClick={() => void playWord()}>
            Play word
          </button>

          <button type="button" onClick={() => void playMeaning()}>
            Play meaning
          </button>

          <button type="button" onClick={() => void playExample()}>
            Play example
          </button>

          <button type="button" onClick={() => void playTranslation()}>
            Play translation
          </button>

          <button type="button" onClick={() => void playFullReview()}>
            Full review
          </button>
        </div>

        <div className={styles.navigationRow}>
          <button type="button" onClick={previousWord}>
            Previous
          </button>

          <button type="button" onClick={toggleAnswer}>
            {showAnswer ? "Hide answer" : "Reveal answer"}
          </button>

          <button type="button" onClick={nextWord}>
            Next
          </button>
        </div>
      </article>

      <aside className={styles.controlPanel}>
        <section className={styles.controlCard}>
          <p className={styles.kicker}>Auto Review</p>
          <h3>Hands-free mode</h3>
          <p>
            Play word, meaning, example, and translation automatically, then move
            to the next word.
          </p>

          <div className={styles.controlGrid}>
            <label>
              <span>Speed</span>
              <select
                value={speed}
                onChange={(event) =>
                  setSpeed(Number(event.target.value) as ReviewSpeed)
                }
              >
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
              </select>
            </label>

            <label>
              <span>Auto next</span>
              <select
                value={autoDelay}
                onChange={(event) =>
                  setAutoDelay(Number(event.target.value) as AutoDelay)
                }
              >
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={8}>8 seconds</option>
              </select>
            </label>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void startAutoReview()}
              disabled={isAutoReviewing}
            >
              Start auto review
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={stopAudio}
            >
              Stop
            </button>
          </div>
        </section>

        <section className={styles.controlCard}>
          <p className={styles.kicker}>Review Queue</p>
          <h3>{reviewQueue.length} saved words</h3>
          <p>
            Words are loaded from Supabase. You can review in saved order or
            shuffle the queue.
          </p>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={shuffleReview}
            >
              Shuffle words
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={resetReviewOrder}
            >
              Reset order
            </button>
          </div>
        </section>

        <section className={styles.wordInfoCard}>
          <p className={styles.kicker}>Word Info</p>
          <h3>{repairMojibake(currentEntry.word)}</h3>

          <div className={styles.metaRow}>
            <span>{languageLabel(currentEntry.learning_language)}</span>
            <span>{languageLabel(currentEntry.explanation_language)}</span>
            <span>{currentEntry.review_status ?? "new"}</span>
            <span>{currentEntry.times_reviewed ?? 0} reviews</span>
          </div>

          <div className={styles.meaningMini}>
            <span>Part of speech</span>
            <p>
              {repairMojibake(currentEntry.part_of_speech) || "Not available"}
            </p>
          </div>

          {currentEntry.source_url ? (
            <a
              href={currentEntry.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Open verified source
            </a>
          ) : null}
        </section>
      </aside>
    </section>
  );
}