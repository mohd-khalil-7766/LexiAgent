"use client";

import { useState } from "react";
import { SpeakButton } from "@/components/SpeakButton";
import styles from "./StoryClient.module.css";

type LearningLanguage = "en" | "zh";
type ExplanationLanguage = "en" | "zh" | "ar";
type StoryLevel = "easy" | "medium";

type StoryResult = {
  title: string;
  story: string;
  translation: string;
  words_used: string[];
  level: StoryLevel;
  model: string;
};

type StoryApiResponse =
  | {
      success: true;
      story: StoryResult;
    }
  | {
      success: false;
      error: string;
    };

export function StoryClient() {
  const [words, setWords] = useState("dog, house, school, food");
  const [learningLanguage, setLearningLanguage] =
    useState<LearningLanguage>("en");
  const [explanationLanguage, setExplanationLanguage] =
    useState<ExplanationLanguage>("zh");
  const [level, setLevel] = useState<StoryLevel>("easy");
  const [story, setStory] = useState<StoryResult | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateStory() {
    setIsGenerating(true);
    setError("");
    setStory(null);

    try {
      const response = await fetch("/api/agent/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          words,
          learningLanguage,
          explanationLanguage,
          level,
        }),
      });

      const payload = (await response.json()) as StoryApiResponse;

      if (!payload.success) {
        throw new Error(payload.error);
      }

      setStory(payload.story);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Story generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>AI STORY BUILDER</span>
        <h2 className={styles.heroTitle}>AI vocabulary paragraph practice</h2>
        <p className={styles.heroText}>
          Build a clean learner paragraph from your vocabulary list, translate
          it into your study language, then use the audio tools to review both
          versions naturally.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Build a paragraph</h3>
              <p className={styles.cardText}>
                Add one word or many words. LexiAgent will use all of them in a
                short learner-friendly story.
              </p>
            </div>

            <span className={styles.status}>Input</span>
          </div>

          <div className={styles.form}>
            <label className={styles.label} htmlFor="story-words">
              <span className={styles.labelText}>
                <span>Vocabulary words</span>
                <span className={styles.hint}>Separate words with commas</span>
              </span>

              <textarea
                id="story-words"
                className={styles.textarea}
                value={words}
                onChange={(event) => setWords(event.target.value)}
                rows={6}
                placeholder="dog, house, school, food"
              />
            </label>

            <div className={styles.controls}>
              <label className={styles.field}>
                <span>Learning language</span>
                <select
                  className={styles.select}
                  value={learningLanguage}
                  onChange={(event) =>
                    setLearningLanguage(event.target.value as LearningLanguage)
                  }
                >
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Translate to</span>
                <select
                  className={styles.select}
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

              <label className={styles.field}>
                <span>Level</span>
                <select
                  className={styles.select}
                  value={level}
                  onChange={(event) => setLevel(event.target.value as StoryLevel)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                </select>
              </label>
            </div>

            <div className={styles.buttonRow}>
              <button
                className={styles.button}
                type="button"
                onClick={generateStory}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating paragraph..." : "Generate paragraph"}
              </button>

              <p className={styles.buttonNote}>
                Keep your list concise for the smoothest paragraph and
                translation quality.
              </p>
            </div>

            {error ? (
              <div className={`${styles.message} ${styles.error}`}>
                <strong className={styles.errorTitle}>Story request failed</strong>
                <p>{error}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Generated story</h3>
              <p className={styles.cardText}>
                Review the generated paragraph, translation, and listen back to
                both versions.
              </p>
            </div>

            <span
              className={`${styles.status} ${
                error
                  ? styles.statusError
                  : isGenerating
                    ? styles.statusGenerating
                    : story
                      ? ""
                      : styles.statusWaiting
              }`}
            >
              {error
                ? "Error"
                : isGenerating
                  ? "Generating"
                  : story
                    ? "Ready"
                    : "Waiting"}
            </span>
          </div>

          {story ? (
            <div className={styles.result}>
              <div className={styles.resultHeading}>
                <h4 className={styles.resultTitle}>{story.title}</h4>

                <div className={styles.metaRow}>
                  <div className={styles.chips}>
                    {story.words_used.map((word) => (
                      <span className={styles.chip} key={word}>
                        {word}
                      </span>
                    ))}
                  </div>

                  <span className={styles.levelBadge}>{story.level} level</span>
                </div>
              </div>

              <div className={styles.audioRow}>
                <SpeakButton
                  text={story.story}
                  language={learningLanguage}
                  label="Listen to story"
                />

                <SpeakButton
                  text={story.translation}
                  language={explanationLanguage}
                  label="Listen to translation"
                />
              </div>

              <div className={styles.panelGrid}>
                <article className={styles.panel}>
                  <h5 className={styles.panelLabel}>Story</h5>
                  <p className={styles.storyText}>{story.story}</p>
                </article>

                <article
                  className={styles.panel}
                  dir={explanationLanguage === "ar" ? "rtl" : "ltr"}
                >
                  <h5 className={styles.panelLabel}>Translation</h5>
                  <p className={styles.translationText}>{story.translation}</p>
                </article>
              </div>

              <p className={styles.model}>Generated by {story.model}</p>
            </div>
          ) : isGenerating ? (
            <div className={styles.loadingBox}>
              <div className={styles.loadingBar} />
              <div className={`${styles.loadingBar} ${styles.loadingBarShort}`} />
              <div className={`${styles.loadingBar} ${styles.loadingBarMedium}`} />
              <p className={styles.loadingText}>
                LexiAgent is building your paragraph and translation now.
              </p>
            </div>
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyInner}>
                <h4 className={styles.emptyTitle}>Nothing generated yet</h4>
                <p className={styles.emptyText}>
                  Enter vocabulary words, choose languages, and generate a
                  learner paragraph. Your finished story will appear here with
                  translation and audio review controls.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
