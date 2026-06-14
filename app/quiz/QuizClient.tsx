"use client";

import { useMemo, useState } from "react";
import { SpeakButton } from "@/components/SpeakButton";
import styles from "./QuizClient.module.css";

type SpeechLanguage = "en" | "zh" | "ar";
type QuizMode = "meaning" | "sentence";

export type QuizEntry = {
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

type QuizClientProps = {
  entries: QuizEntry[];
};

type QuizQuestion = {
  id: string;
  mode: QuizMode;
  entry: QuizEntry;
  prompt: string;
  sentence?: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
};

function safeLanguage(value?: string | null): SpeechLanguage {
  if (value === "zh" || value === "ar" || value === "en") {
    return value;
  }

  return "en";
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

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const cleanValue = value.trim();
    const key = normalizeText(cleanValue);

    if (cleanValue && !seen.has(key)) {
      seen.add(key);
      result.push(cleanValue);
    }
  });

  return result;
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function fallbackMeanings(language: string) {
  if (language === "zh") {
    return ["水", "学校", "房子", "食物", "朋友", "颜色", "电脑", "工作"];
  }

  if (language === "ar") {
    return ["ماء", "مدرسة", "بيت", "طعام", "صديق", "لون", "حاسوب", "عمل"];
  }

  return [
    "water",
    "school",
    "house",
    "food",
    "friend",
    "color",
    "computer",
    "work",
  ];
}

function rotateOptions(options: string[], seed: number) {
  if (options.length <= 1) {
    return options;
  }

  const offset = seed % options.length;

  return [...options.slice(offset), ...options.slice(0, offset)];
}

function buildOptions({
  correctAnswer,
  candidates,
  fallback,
  seed,
}: {
  correctAnswer: string;
  candidates: string[];
  fallback: string[];
  seed: number;
}) {
  const cleanCorrect = correctAnswer.trim();

  const distractors = uniqueValues([
    ...shuffleArray(
      candidates.filter(
        (candidate) => normalizeText(candidate) !== normalizeText(cleanCorrect),
      ),
    ),
    ...fallback.filter(
      (candidate) => normalizeText(candidate) !== normalizeText(cleanCorrect),
    ),
  ]);

  const options = uniqueValues([cleanCorrect, ...distractors]).slice(0, 4);

  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`);
  }

  return rotateOptions(options, seed);
}

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createBlankSentence(entry: QuizEntry) {
  const word = repairMojibake(entry.word);
  const sentence = repairMojibake(entry.example_sentence);

  if (!sentence || !word) {
    return "";
  }

  if (entry.learning_language === "zh") {
    return sentence.replace(word, "____");
  }

  const escapedWord = escapeRegularExpression(word);
  const pattern = new RegExp(`\\b${escapedWord}(?:s|es|ed|ing)?\\b`, "i");

  return sentence.replace(pattern, "____");
}

function createQuestion({
  allEntries,
  entry,
  index,
  mode,
}: {
  allEntries: QuizEntry[];
  entry: QuizEntry;
  index: number;
  mode: QuizMode;
}): QuizQuestion {
  const word = repairMojibake(entry.word);
  const meaning = repairMojibake(entry.meaning);
  const sentence = repairMojibake(entry.example_sentence);
  const translatedExample = repairMojibake(entry.translated_example);

  if (mode === "meaning") {
    const meaningCandidates = allEntries
      .filter((item) => item.id !== entry.id)
      .map((item) => repairMojibake(item.meaning))
      .filter(Boolean);

    return {
      id: `${entry.id}-meaning-${index}`,
      mode,
      entry,
      prompt: `What is the meaning of "${word}"?`,
      correctAnswer: meaning,
      options: buildOptions({
        correctAnswer: meaning,
        candidates: meaningCandidates,
        fallback: fallbackMeanings(entry.explanation_language),
        seed: index + word.length,
      }),
      explanation:
        translatedExample ||
        sentence ||
        `The correct meaning of "${word}" is "${meaning}".`,
    };
  }

  const blankSentence = createBlankSentence(entry);

  const wordCandidates = allEntries
    .filter((item) => item.id !== entry.id)
    .map((item) => repairMojibake(item.word))
    .filter(Boolean);

  return {
    id: `${entry.id}-sentence-${index}`,
    mode,
    entry,
    prompt: "Choose the correct word for the blank.",
    sentence:
      blankSentence && blankSentence !== sentence
        ? blankSentence
        : `Which word matches this example? ${sentence || translatedExample}`,
    correctAnswer: word,
    options: buildOptions({
      correctAnswer: word,
      candidates: wordCandidates,
      fallback: ["water", "school", "house", "food", "friend", "computer"],
      seed: index + meaning.length,
    }),
    explanation: meaning,
  };
}

function getUsableEntries(entries: QuizEntry[]) {
  return entries.filter(
    (entry) => repairMojibake(entry.word) && repairMojibake(entry.meaning),
  );
}

function createRandomQueue(entries: QuizEntry[], size: number) {
  const usableEntries = getUsableEntries(entries);
  const safeSize = Math.max(1, Math.min(size, usableEntries.length));

  return shuffleArray(usableEntries).slice(0, safeSize);
}

function reinsertWrongEntryLater({
  queue,
  currentIndex,
  entry,
}: {
  queue: QuizEntry[];
  currentIndex: number;
  entry: QuizEntry;
}) {
  const remainingCount = queue.length - currentIndex - 1;
  const minimumInsertOffset = 2;
  const maximumInsertOffset = Math.max(2, Math.min(5, remainingCount + 1));
  const randomOffset =
    minimumInsertOffset +
    Math.floor(Math.random() * (maximumInsertOffset - minimumInsertOffset + 1));

  const insertIndex = Math.min(queue.length, currentIndex + randomOffset);

  return [
    ...queue.slice(0, insertIndex),
    entry,
    ...queue.slice(insertIndex),
  ];
}

async function saveReviewAttempt(entryId: string) {
  try {
    await fetch("/api/vocabulary/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entryId,
      }),
    });
  } catch {
    // Keep quiz working even if review tracking fails.
  }
}

export function QuizClient({ entries }: QuizClientProps) {
  const usableEntries = useMemo(() => getUsableEntries(entries), [entries]);
  const initialSize = Math.min(10, Math.max(1, usableEntries.length));

  const [mode, setMode] = useState<QuizMode>("meaning");
  const [quizSize, setQuizSize] = useState(initialSize);
  const [questionQueue, setQuestionQueue] = useState<QuizEntry[]>(() =>
    createRandomQueue(entries, initialSize),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [wrongReviewEntry, setWrongReviewEntry] = useState<QuizEntry | null>(
    null,
  );

  const currentEntry = questionQueue[questionIndex] ?? null;

  const question = useMemo(() => {
    if (!currentEntry) {
      return null;
    }

    return createQuestion({
      allEntries: usableEntries,
      entry: currentEntry,
      index: questionIndex,
      mode,
    });
  }, [currentEntry, mode, questionIndex, usableEntries]);

  const isCorrect =
    submitted &&
    question &&
    normalizeText(selectedAnswer) === normalizeText(question.correctAnswer);

  const finished = questionQueue.length > 0 && questionIndex >= questionQueue.length;

  function startNewExam(nextMode = mode, nextSize = quizSize) {
    const safeSize = Math.max(1, Math.min(nextSize, usableEntries.length));

    setMode(nextMode);
    setQuizSize(safeSize);
    setQuestionQueue(createRandomQueue(entries, safeSize));
    setQuestionIndex(0);
    setSelectedAnswer("");
    setSubmitted(false);
    setCorrectCount(0);
    setAnsweredCount(0);
    setWrongReviewEntry(null);
  }

  function submitAnswer() {
    if (!question || !selectedAnswer || submitted) {
      return;
    }

    const correct =
      normalizeText(selectedAnswer) === normalizeText(question.correctAnswer);

    setSubmitted(true);
    setAnsweredCount((current) => current + 1);

    void saveReviewAttempt(question.entry.id);

    if (correct) {
      setCorrectCount((current) => current + 1);
      setWrongReviewEntry(null);
      return;
    }

    setWrongReviewEntry(question.entry);

    setQuestionQueue((currentQueue) =>
      reinsertWrongEntryLater({
        queue: currentQueue,
        currentIndex: questionIndex,
        entry: question.entry,
      }),
    );
  }

  function nextQuestion() {
    setQuestionIndex((current) => current + 1);
    setSelectedAnswer("");
    setSubmitted(false);
    setWrongReviewEntry(null);
  }

  const accuracy =
    answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);

  if (usableEntries.length === 0) {
    return (
      <article className={styles.emptyCard}>
        <h2>No quiz data yet</h2>
        <p>
          Add vocabulary from AI Example Search or Telegram first. The quiz needs
          saved words with meanings.
        </p>
      </article>
    );
  }

  if (finished || !question) {
    return (
      <section className={styles.layout}>
        <article className={styles.quizCard}>
          <p className={styles.kicker}>Exam Complete</p>
          <h2 className={styles.completeTitle}>Quiz finished</h2>
          <p className={styles.completeText}>
            You answered {answeredCount} questions. Your final accuracy is{" "}
            <strong>{accuracy}%</strong>.
          </p>

          <div className={styles.finalStats}>
            <div>
              <span>Correct</span>
              <strong>{correctCount}</strong>
            </div>
            <div>
              <span>Answered</span>
              <strong>{answeredCount}</strong>
            </div>
            <div>
              <span>Accuracy</span>
              <strong>{accuracy}%</strong>
            </div>
          </div>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => startNewExam()}
          >
            Start new random exam
          </button>
        </article>

        <aside className={styles.sidePanel}>
          <div className={styles.scoreCard}>
            <p className={styles.kicker}>Quiz Progress</p>
            <h2>{accuracy}%</h2>
            <p>
              {correctCount} correct out of {answeredCount} answered questions.
            </p>
          </div>
        </aside>
      </section>
    );
  }

  return (
    <section className={styles.layout}>
      <article className={styles.quizCard}>
        <div className={styles.quizTop}>
          <div>
            <p className={styles.kicker}>Live Random Review</p>
            <h2>
              {mode === "meaning" ? "Meaning question" : "Sentence question"}
            </h2>
            <p>
              Question {Math.min(questionIndex + 1, questionQueue.length)} of{" "}
              {questionQueue.length}
            </p>
          </div>

          <span className={styles.statusPill}>Random Exam</span>
        </div>

        <div className={styles.examControls}>
          <div className={styles.modeSwitch}>
            <button
              type="button"
              className={mode === "meaning" ? styles.activeMode : ""}
              onClick={() => startNewExam("meaning", quizSize)}
            >
              Meaning quiz
            </button>

            <button
              type="button"
              className={mode === "sentence" ? styles.activeMode : ""}
              onClick={() => startNewExam("sentence", quizSize)}
            >
              Sentence quiz
            </button>
          </div>

          <label className={styles.sizeControl}>
            <span>Random words</span>
            <select
              value={
                [10, 15, 20, 25, 30].includes(quizSize)
                  ? String(quizSize)
                  : "custom"
              }
              onChange={(event) => {
                const value = event.target.value;

                if (value === "custom") {
                  return;
                }

                startNewExam(mode, Number(value));
              }}
            >
              <option value="10">10 words</option>
              <option value="15">15 words</option>
              <option value="20">20 words</option>
              <option value="25">25 words</option>
              <option value="30">30 words</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className={styles.customControl}>
            <span>Custom</span>
            <input
              type="number"
              min={1}
              max={usableEntries.length}
              value={quizSize}
              onChange={(event) => {
                const value = Number(event.target.value);

                if (Number.isFinite(value)) {
                  setQuizSize(Math.max(1, Math.min(value, usableEntries.length)));
                }
              }}
            />
          </label>

          <button
            type="button"
            className={styles.startButton}
            onClick={() => startNewExam(mode, quizSize)}
          >
            Start random exam
          </button>
        </div>

        <div className={styles.questionBox}>
          <span>Question</span>
          <h3>{question.prompt}</h3>

          {question.sentence ? (
            <p className={styles.sentence}>{question.sentence}</p>
          ) : null}
        </div>

        <div className={styles.audioRow}>
          {mode === "sentence" && question.sentence ? (
            <SpeakButton
              text={question.sentence.replace("____", question.correctAnswer)}
              language={safeLanguage(question.entry.learning_language)}
              label="Listen sentence"
            />
          ) : null}
        </div>

        <div className={styles.optionsGrid}>
          {question.options.map((option, optionIndex) => {
            const optionIsCorrect =
              normalizeText(option) === normalizeText(question.correctAnswer);
            const optionIsSelected =
              normalizeText(option) === normalizeText(selectedAnswer);

            let className = styles.optionButton;

            if (submitted && optionIsCorrect) {
              className = `${className} ${styles.correct}`;
            } else if (submitted && optionIsSelected && !optionIsCorrect) {
              className = `${className} ${styles.incorrect}`;
            } else if (optionIsSelected) {
              className = `${className} ${styles.selected}`;
            }

            return (
              <button
                key={option}
                type="button"
                className={className}
                onClick={() => setSelectedAnswer(option)}
                disabled={submitted}
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span>
                <strong>{option}</strong>
              </button>
            );
          })}
        </div>

        {submitted ? (
          <div
            className={
              isCorrect
                ? `${styles.feedback} ${styles.good}`
                : `${styles.feedback} ${styles.bad}`
            }
          >
            <strong>{isCorrect ? "Correct answer" : "Wrong answer"}</strong>
            <p>
              Correct: <b>{question.correctAnswer}</b>
            </p>
            <p>{question.explanation}</p>
            {!isCorrect ? (
              <p>
                This word was added back into the random queue for another
                review later.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={submitAnswer}
            disabled={!selectedAnswer || submitted}
          >
            Submit answer
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={nextQuestion}
          >
            Next question
          </button>

          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => startNewExam()}
          >
            Restart
          </button>
        </div>
      </article>

      <aside className={styles.sidePanel}>
        <div className={styles.scoreCard}>
          <p className={styles.kicker}>Quiz Progress</p>
          <h2>{accuracy}%</h2>
          <p>
            {correctCount} correct out of {answeredCount} answered questions.
          </p>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {wrongReviewEntry ? (
          <div className={styles.reviewCard}>
            <p className={styles.kicker}>Mistake Review</p>
            <h3>{repairMojibake(wrongReviewEntry.word)}</h3>
            <p>{repairMojibake(wrongReviewEntry.pronunciation)}</p>

            <div className={styles.audioRow}>
              <SpeakButton
                text={repairMojibake(wrongReviewEntry.word)}
                language={safeLanguage(wrongReviewEntry.learning_language)}
                label="Listen word"
              />

              {wrongReviewEntry.example_sentence ? (
                <SpeakButton
                  text={repairMojibake(wrongReviewEntry.example_sentence)}
                  language={safeLanguage(wrongReviewEntry.learning_language)}
                  label="Listen example"
                />
              ) : null}
            </div>

            <div className={styles.wordMeta}>
              <span>
                {repairMojibake(wrongReviewEntry.part_of_speech) ||
                  "Part pending"}
              </span>
              <span>{wrongReviewEntry.review_status ?? "new"}</span>
            </div>

            <div className={styles.meaningBox}>
              <span>Meaning</span>
              <p>{repairMojibake(wrongReviewEntry.meaning)}</p>
            </div>

            {wrongReviewEntry.example_sentence ? (
              <div className={styles.exampleReview}>
                <span>Example</span>
                <p>{repairMojibake(wrongReviewEntry.example_sentence)}</p>
              </div>
            ) : null}

            {wrongReviewEntry.source_url ? (
              <a
                href={wrongReviewEntry.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Open verified source
              </a>
            ) : null}
          </div>
        ) : (
          <div className={styles.hiddenReviewCard}>
            <p className={styles.kicker}>Mistake Review</p>
            <h3>Hidden until needed</h3>
            <p>
              The answer word will stay hidden during the quiz. If you make a
              mistake, the full word card appears here for instant review.
            </p>
          </div>
        )}

        <div className={styles.examInfoCard}>
          <p className={styles.kicker}>Exam Setup</p>
          <h3>{quizSize} random words</h3>
          <p>
            The quiz draws random entries from your saved vocabulary. Wrong
            answers are reviewed again later in the same session.
          </p>
          <small>
            Available vocabulary: {usableEntries.length} saved usable words.
          </small>
        </div>
      </aside>
    </section>
  );
}