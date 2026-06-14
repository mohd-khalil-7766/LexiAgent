"use client";

import { useMemo } from "react";
import styles from "./AnalyticsClient.module.css";

export type AnalyticsEntry = {
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
  updated_at?: string | null;
};

type AnalyticsClientProps = {
  entries: AnalyticsEntry[];
};

type BreakdownItem = {
  label: string;
  count: number;
  percentage: number;
};

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

function languageLabel(value?: string | null) {
  const labels: Record<string, string> = {
    en: "English",
    zh: "Chinese",
    ar: "Arabic",
  };

  return value ? labels[value] ?? value : "Unknown";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function daysAgo(value?: string | null) {
  if (!value) {
    return 999999;
  }

  const date = new Date(value).getTime();
  const now = Date.now();

  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

function percentage(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function buildBreakdown(
  entries: AnalyticsEntry[],
  getLabel: (entry: AnalyticsEntry) => string,
) {
  const map = new Map<string, number>();

  entries.forEach((entry) => {
    const label = getLabel(entry);
    map.set(label, (map.get(label) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: percentage(count, entries.length),
    }))
    .sort((a, b) => b.count - a.count);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
  );
}

function topWords(entries: AnalyticsEntry[]) {
  return [...entries]
    .sort((a, b) => {
      const left = a.times_reviewed ?? 0;
      const right = b.times_reviewed ?? 0;

      if (right !== left) {
        return right - left;
      }

      return new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
        new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    })
    .slice(0, 6);
}

function recentWords(entries: AnalyticsEntry[]) {
  return [...entries]
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )
    .slice(0, 8);
}

function BreakdownList({ items }: { items: BreakdownItem[] }) {
  if (items.length === 0) {
    return (
      <div className={styles.emptyMini}>
        <p>No data available yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.breakdownList}>
      {items.map((item) => (
        <div className={styles.breakdownItem} key={item.label}>
          <div>
            <strong>{item.label}</strong>
            <span>
              {item.count} entries · {item.percentage}%
            </span>
          </div>

          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsClient({ entries }: AnalyticsClientProps) {
  const analytics = useMemo(() => {
    const total = entries.length;
    const verified = entries.filter((entry) => entry.source_verified).length;
    const unverified = total - verified;
    const reviewed = entries.filter(
      (entry) => (entry.times_reviewed ?? 0) > 0,
    ).length;
    const newWords = entries.filter(
      (entry) => (entry.review_status ?? "new") === "new",
    ).length;
    const addedThisWeek = entries.filter(
      (entry) => daysAgo(entry.created_at) <= 7,
    ).length;

    const reviewCounts = entries.map((entry) => entry.times_reviewed ?? 0);

    return {
      total,
      verified,
      unverified,
      reviewed,
      newWords,
      addedThisWeek,
      verifiedPercentage: percentage(verified, total),
      reviewPercentage: percentage(reviewed, total),
      averageReviews: average(reviewCounts),
      languagePairs: buildBreakdown(
        entries,
        (entry) =>
          `${languageLabel(entry.learning_language)} → ${languageLabel(
            entry.explanation_language,
          )}`,
      ),
      reviewStatus: buildBreakdown(
        entries,
        (entry) => entry.review_status ?? "new",
      ),
      sourceCoverage: buildBreakdown(
        entries,
        (entry) => entry.source_name ?? "Unknown source",
      ),
      topReviewed: topWords(entries),
      recent: recentWords(entries),
    };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <article className={styles.emptyCard}>
        <h2>No analytics yet</h2>
        <p>
          Add vocabulary from AI Example Search or Telegram first. Analytics will
          appear after saved words are available.
        </p>
      </article>
    );
  }

  return (
    <section className={styles.analyticsLayout}>
      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.kicker}>Saved Words</p>
          <strong>{analytics.total}</strong>
          <span>Total vocabulary entries in Supabase.</span>
        </article>

        <article className={styles.statCard}>
          <p className={styles.kicker}>Verified Sources</p>
          <strong>{analytics.verifiedPercentage}%</strong>
          <span>
            {analytics.verified} verified, {analytics.unverified} pending.
          </span>
        </article>

        <article className={styles.statCard}>
          <p className={styles.kicker}>Review Progress</p>
          <strong>{analytics.reviewPercentage}%</strong>
          <span>{analytics.reviewed} words reviewed at least once.</span>
        </article>

        <article className={styles.statCard}>
          <p className={styles.kicker}>Added This Week</p>
          <strong>{analytics.addedThisWeek}</strong>
          <span>New words saved during the last 7 days.</span>
        </article>
      </div>

      <div className={styles.mainGrid}>
        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Language Coverage</p>
              <h2>Vocabulary by language pair</h2>
            </div>
            <span className={styles.livePill}>LIVE DB</span>
          </div>

          <BreakdownList items={analytics.languagePairs} />
        </article>

        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Review Status</p>
              <h2>Learning status breakdown</h2>
            </div>
            <span className={styles.livePill}>{analytics.newWords} new</span>
          </div>

          <BreakdownList items={analytics.reviewStatus} />
        </article>
      </div>

      <div className={styles.mainGrid}>
        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Source Quality</p>
              <h2>Verified source coverage</h2>
            </div>
            <span className={styles.livePill}>
              {analytics.verifiedPercentage}% verified
            </span>
          </div>

          <div className={styles.largeProgress}>
            <div>
              <span>Verified source ratio</span>
              <strong>{analytics.verifiedPercentage}%</strong>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${analytics.verifiedPercentage}%` }}
              />
            </div>
          </div>

          <BreakdownList items={analytics.sourceCoverage} />
        </article>

        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Review Intensity</p>
              <h2>Most reviewed words</h2>
            </div>
            <span className={styles.livePill}>
              Avg {analytics.averageReviews}
            </span>
          </div>

          <div className={styles.wordList}>
            {analytics.topReviewed.map((entry) => (
              <div className={styles.wordItem} key={entry.id}>
                <div>
                  <strong>{repairMojibake(entry.word)}</strong>
                  <span>{repairMojibake(entry.meaning) || "No meaning"}</span>
                </div>
                <em>{entry.times_reviewed ?? 0} reviews</em>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className={styles.panelCard}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.kicker}>Recent Activity</p>
            <h2>Recently saved vocabulary</h2>
          </div>
          <span className={styles.livePill}>Latest 8</span>
        </div>

        <div className={styles.recentGrid}>
          {analytics.recent.map((entry) => (
            <div className={styles.recentCard} key={entry.id}>
              <div>
                <strong>{repairMojibake(entry.word)}</strong>
                <span>{formatDate(entry.created_at)}</span>
              </div>

              <p>{repairMojibake(entry.meaning) || "Meaning pending"}</p>

              <small>
                {languageLabel(entry.learning_language)} →{" "}
                {languageLabel(entry.explanation_language)}
              </small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}