import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DatabaseError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

function formatError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, type: "Application Error" };
  }

  if (typeof error === "object" && error !== null) {
    const databaseError = error as DatabaseError;
    return {
      message: databaseError.message ?? "Unknown database error",
      code: databaseError.code ?? null,
      details: databaseError.details ?? null,
      hint: databaseError.hint ?? null,
      type: "Supabase Error",
    };
  }

  return { message: "Unknown dashboard error", type: "Unknown Error" };
}

export async function GET() {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("learner_profiles")
      .select(
        "id, display_name, interface_language, default_learning_language, default_explanation_language, telegram_bot",
      )
      .eq("display_name", "LexiAgent Student")
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error("LexiAgent Student profile was not found.");

    const [
      vocabularyCountResult,
      agentRunsCountResult,
      learningHistoryCountResult,
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
        .select(
          "id, word, pronunciation, part_of_speech, meaning, example_sentence, translated_example, learning_language, explanation_language, source_name, source_title, source_url, source_image_url, source_image_description, source_favicon_url, source_verified, review_status, created_at",
        )
        .eq("learner_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);

    if (vocabularyCountResult.error) throw vocabularyCountResult.error;
    if (agentRunsCountResult.error) throw agentRunsCountResult.error;
    if (learningHistoryCountResult.error) throw learningHistoryCountResult.error;
    if (recentEntriesResult.error) throw recentEntriesResult.error;

    return NextResponse.json({
      connected: true,
      database: "Supabase PostgreSQL",
      profile,
      totals: {
        vocabularyEntries: vocabularyCountResult.count ?? 0,
        agentRuns: agentRunsCountResult.count ?? 0,
        learningHistory: learningHistoryCountResult.count ?? 0,
      },
      recentEntries: recentEntriesResult.data ?? [],
      recentAgentRuns: [],
    });
  } catch (error) {
    const diagnostic = formatError(error);
    console.error("LexiAgent dashboard API failed:", diagnostic);
    return NextResponse.json(
      { connected: false, error: diagnostic },
      { status: 500 },
    );
  }
}
