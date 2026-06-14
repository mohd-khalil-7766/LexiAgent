import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      type: "JavaScript Error",
    };
  }

  if (typeof error === "object" && error !== null) {
    const databaseError = error as SupabaseLikeError;

    return {
      message: databaseError.message ?? "Database request failed",
      code: databaseError.code ?? null,
      details: databaseError.details ?? null,
      hint: databaseError.hint ?? null,
      status: databaseError.status ?? null,
      type: "Supabase Error",
    };
  }

  return {
    message: String(error),
    type: "Unknown Error",
  };
}

export async function GET() {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("learner_profiles")
      .select(
        "display_name, interface_language, default_learning_language, default_explanation_language",
      )
      .eq("display_name", "LexiAgent Student")
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const [
      { count: vocabularyCount, error: vocabularyError },
      { count: agentRunsCount, error: agentRunsError },
      { count: historyCount, error: historyError },
    ] = await Promise.all([
      supabaseAdmin
        .from("vocabulary_entries")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("agent_runs")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("learning_history")
        .select("*", { count: "exact", head: true }),
    ]);

    if (vocabularyError) {
      throw vocabularyError;
    }

    if (agentRunsError) {
      throw agentRunsError;
    }

    if (historyError) {
      throw historyError;
    }

    return NextResponse.json({
      connected: true,
      database: "Supabase PostgreSQL",
      profile: profile ?? null,
      totals: {
        vocabularyEntries: vocabularyCount ?? 0,
        agentRuns: agentRunsCount ?? 0,
        learningHistory: historyCount ?? 0,
      },
    });
  } catch (error) {
    const diagnostic = formatError(error);

    console.error("LexiAgent database check failed:", diagnostic);

    return NextResponse.json(
      {
        connected: false,
        error: diagnostic,
      },
      { status: 500 },
    );
  }
}