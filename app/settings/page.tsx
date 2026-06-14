import { AppShell } from "@/components/AppShell";
import { getLexiAgentProfile } from "@/lib/lexiagent-data";
import {
  SettingsClient,
  type IntegrationStatus,
  type SettingsProfile,
} from "./SettingsClient";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Failed to load settings data.";
}

function hasEnv(names: string[]) {
  return names.some((name) => {
    const value = process.env[name];
    return Boolean(value && value.trim());
  });
}

function buildIntegrations(profile: SettingsProfile): IntegrationStatus[] {
  return [
    {
      name: "Supabase Database",
      description: "Stores learner profile, vocabulary entries, sources, and review counts.",
      configured: hasEnv([
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
      ]),
      detail: "Project URL detected",
    },
    {
      name: "Supabase Service Key",
      description: "Allows server routes to save vocabulary and update review progress.",
      configured: hasEnv([
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_SERVICE_ROLE",
        "SUPABASE_SERVICE_KEY",
        "SUPABASE_SECRET_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ]),
      detail: "Server-side key detected",
    },
    {
      name: "OpenRouter AI",
      description: "Generates meanings, translations, examples, and agent responses.",
      configured: hasEnv([
        "OPENROUTER_API_KEY",
        "NEXT_PUBLIC_OPENROUTER_API_KEY",
      ]),
      detail: "AI model key status",
    },
    {
      name: "Tavily Search",
      description: "Searches real web sources before saving vocabulary examples.",
      configured: hasEnv(["TAVILY_API_KEY", "NEXT_PUBLIC_TAVILY_API_KEY"]),
      detail: "Search API status",
    },
    {
      name: "Telegram / OpenClaw",
      description: "Receives Telegram commands and sends them to the local LexiAgent app.",
      configured: Boolean(profile.telegram_bot),
      detail: profile.telegram_bot ?? "Telegram bot not stored in profile",
    },
  ];
}

export default async function SettingsPage() {
  const result = await getLexiAgentProfile()
    .then((profile) => ({
      profile: profile as SettingsProfile,
      error: null as string | null,
    }))
    .catch((error: unknown) => ({
      profile: null,
      error: getErrorMessage(error),
    }));

  return (
    <AppShell
      eyebrow="SYSTEM SETTINGS"
      title="Settings"
      description="Review language defaults, Telegram commands, OpenClaw status, API configuration, and final project setup."
    >
      {result.error || !result.profile ? (
        <article className="page-card error-card">
          <h2>Settings data failed</h2>
          <p>{result.error}</p>
        </article>
      ) : (
        <SettingsClient
          profile={result.profile}
          integrations={buildIntegrations(result.profile)}
        />
      )}
    </AppShell>
  );
}