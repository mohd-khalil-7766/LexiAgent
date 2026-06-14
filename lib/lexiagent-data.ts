import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type VocabularyEntry = {
  id: string;
  word: string;
  pronunciation: string | null;
  part_of_speech: string | null;
  meaning: string | null;
  example_sentence: string | null;
  translated_example: string | null;
  learning_language: string;
  explanation_language: string;
  source_name: string | null;
  source_title: string | null;
  source_url: string | null;
  source_image_url: string | null;
  source_image_description: string | null;
  source_favicon_url: string | null;
  source_verified: boolean | null;
  review_status: string | null;
  times_reviewed: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LearnerProfile = {
  id: string;
  display_name: string;
  interface_language: string | null;
  default_learning_language: string | null;
  default_explanation_language: string | null;
  telegram_bot: string | null;
};

const entryColumns = `
  id,
  word,
  pronunciation,
  part_of_speech,
  meaning,
  example_sentence,
  translated_example,
  learning_language,
  explanation_language,
  source_name,
  source_title,
  source_url,
  source_image_url,
  source_image_description,
  source_favicon_url,
  source_verified,
  review_status,
  times_reviewed,
  created_at,
  updated_at
`;

export async function getLexiAgentProfile() {
  const { data, error } = await supabaseAdmin
    .from("learner_profiles")
    .select(
      "id, display_name, interface_language, default_learning_language, default_explanation_language, telegram_bot",
    )
    .eq("display_name", "LexiAgent Student")
    .maybeSingle<LearnerProfile>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("LexiAgent Student profile was not found.");
  }

  return data;
}

export async function getLexiAgentDashboardData() {
  const profile = await getLexiAgentProfile();

  const [
    vocabularyCountResult,
    agentRunsCountResult,
    learningHistoryCountResult,
    sourceCountResult,
    recentEntriesResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("vocabulary_entries")
      .select("*", { count: "exact", head: true })
      .eq("learner_id", profile.id),

    supabaseAdmin
      .from("agent_runs")
      .select("*", { count: "exact", head: true })
      .eq("learner_id", profile.id),

    supabaseAdmin
      .from("learning_history")
      .select("*", { count: "exact", head: true })
      .eq("learner_id", profile.id),

    supabaseAdmin
      .from("vocabulary_entries")
      .select("*", { count: "exact", head: true })
      .eq("learner_id", profile.id)
      .not("source_url", "is", null),

    supabaseAdmin
      .from("vocabulary_entries")
      .select(entryColumns)
      .eq("learner_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  if (vocabularyCountResult.error) throw vocabularyCountResult.error;
  if (agentRunsCountResult.error) throw agentRunsCountResult.error;
  if (learningHistoryCountResult.error) throw learningHistoryCountResult.error;
  if (sourceCountResult.error) throw sourceCountResult.error;
  if (recentEntriesResult.error) throw recentEntriesResult.error;

  return {
    profile,
    totals: {
      vocabularyEntries: vocabularyCountResult.count ?? 0,
      agentRuns: agentRunsCountResult.count ?? 0,
      learningHistory: learningHistoryCountResult.count ?? 0,
      sourceRecords: sourceCountResult.count ?? 0,
    },
    recentEntries: (recentEntriesResult.data ?? []) as VocabularyEntry[],
  };
}

export async function getLexiAgentVocabularyEntries() {
  const profile = await getLexiAgentProfile();

  const { data, error } = await supabaseAdmin
    .from("vocabulary_entries")
    .select(entryColumns)
    .eq("learner_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return {
    profile,
    entries: (data ?? []) as VocabularyEntry[],
  };
}