import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnvValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name];

    if (value && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getSupabaseAdmin() {
  const supabaseUrl = getEnvValue([
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  ]);

  const serviceRoleKey = getEnvValue([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Need Supabase URL and service role key.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { entryId?: unknown };
    const entryId = typeof body.entryId === "string" ? body.entryId : "";

    if (!entryId) {
      return NextResponse.json(
        { success: false, error: "Missing entryId." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: currentEntry, error: readError } = await supabase
      .from("vocabulary_entries")
      .select("id,times_reviewed")
      .eq("id", entryId)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (!currentEntry) {
      return NextResponse.json(
        { success: false, error: "Vocabulary entry not found." },
        { status: 404 },
      );
    }

    const nextTimesReviewed = Number(currentEntry.times_reviewed ?? 0) + 1;

    const { data: updatedEntry, error: updateError } = await supabase
      .from("vocabulary_entries")
      .update({
        times_reviewed: nextTimesReviewed,
        review_status: "reviewed",
      })
      .eq("id", entryId)
      .select("id,times_reviewed,review_status")
      .single();

    if (updateError) {
      const fallback = await supabase
        .from("vocabulary_entries")
        .update({
          times_reviewed: nextTimesReviewed,
        })
        .eq("id", entryId)
        .select("id,times_reviewed")
        .single();

      if (fallback.error) {
        throw fallback.error;
      }

      return NextResponse.json({
        success: true,
        entry: fallback.data,
      });
    }

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update review count.";

    console.error("[vocabulary/review] failed:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}