import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: {
      id?: number;
    };
  };
};

type AgentSearchResponse = {
  success: boolean;
  error?: string;
  entry?: {
    word?: string | null;
    meaning?: string | null;
    example_sentence?: string | null;
    translated_example?: string | null;
    source_url?: string | null;
  };
};

function getEnvValue(name: string) {
  const value = process.env[name];
  return value?.trim() || "";
}

function getTelegramToken() {
  return getEnvValue("TELEGRAM_BOT_TOKEN");
}

function getWebhookSecret() {
  return getEnvValue("TELEGRAM_WEBHOOK_SECRET");
}

function jsonOk() {
  return NextResponse.json({ ok: true });
}

function extractWord(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  if (/^add\s+/i.test(normalized)) {
    return normalized.replace(/^add\s+/i, "").trim();
  }

  if (/^query\s+/i.test(normalized)) {
    return normalized.replace(/^query\s+/i, "").trim();
  }

  return normalized;
}

async function sendTelegramMessage({
  token,
  chatId,
  text,
}: {
  token: string;
  chatId: number;
  text: string;
}) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    console.error("[telegram webhook] sendMessage failed:", responseText);
    return false;
  }

  console.log("[telegram webhook] sendMessage success");
  return true;
}

async function callAgentSearch(origin: string, word: string) {
  const response = await fetch(`${origin}/api/agent/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      word,
      learningLanguage: "en",
      explanationLanguage: "zh",
      channel: "telegram",
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as AgentSearchResponse;

  if (!response.ok || !payload.success || !payload.entry) {
    throw new Error(payload.error ?? "LexiAgent search/save failed.");
  }

  return payload;
}

function buildHelpMessage() {
  return [
    "LexiAgent Telegram Bot",
    "",
    "Usage:",
    "- Send a word: light",
    "- Or use: add light",
    "- Or use: query light",
    "",
    "Commands:",
    "/start",
    "/help",
  ].join("\n");
}

function buildWelcomeMessage() {
  return [
    "Welcome to LexiAgent.",
    "",
    "Send a vocabulary word like:",
    "light",
    "",
    "Or use:",
    "add light",
    "",
    "Type /help for more examples.",
  ].join("\n");
}

function buildAgentReply(payload: AgentSearchResponse) {
  const entry = payload.entry;

  return [
    "Saved to LexiAgent",
    "",
    `Word: ${entry?.word ?? "Not available"}`,
    `Meaning: ${entry?.meaning ?? "Not available"}`,
    `Example: ${entry?.example_sentence ?? "Not available"}`,
    `Translation: ${entry?.translated_example ?? "Not available"}`,
    `Source: ${entry?.source_url ?? "Not available"}`,
    "",
    "Agent Workflow:",
    "Source Retrieval Agent -> Vocabulary Tutor Agent -> Supabase -> Telegram/Web UI",
    "",
    "The word was saved to LexiAgent.",
  ].join("\n");
}

function buildFriendlyErrorMessage() {
  return [
    "LexiAgent could not process that word right now.",
    "Please try again in a moment with a simple word like: light",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const token = getTelegramToken();

    if (!token) {
      console.error("[telegram webhook] missing TELEGRAM_BOT_TOKEN");
      return jsonOk();
    }

    const expectedSecret = getWebhookSecret();
    const receivedSecret =
      request.headers.get("x-telegram-bot-api-secret-token")?.trim() || "";

    if (expectedSecret && receivedSecret && expectedSecret !== receivedSecret) {
      console.error("[telegram webhook] invalid webhook secret");
      return jsonOk();
    }

    const update = (await request.json()) as TelegramUpdate;
    const chatId = update.message?.chat?.id;
    const text = update.message?.text?.trim() || "";

    console.log("[telegram webhook] received chat id:", chatId ?? "missing");
    console.log("[telegram webhook] received text:", text || "missing");

    if (!chatId) {
      console.error("[telegram webhook] missing chat id");
      return jsonOk();
    }

    if (!text) {
      console.error("[telegram webhook] missing text");
      return jsonOk();
    }

    if (text === "/start") {
      await sendTelegramMessage({
        token,
        chatId,
        text: buildWelcomeMessage(),
      });
      return jsonOk();
    }

    if (text === "/help") {
      await sendTelegramMessage({
        token,
        chatId,
        text: buildHelpMessage(),
      });
      return jsonOk();
    }

    const word = extractWord(text);

    console.log("[telegram webhook] extracted word:", word || "missing");

    if (!word) {
      await sendTelegramMessage({
        token,
        chatId,
        text: buildHelpMessage(),
      });
      return jsonOk();
    }

    try {
      const origin = request.nextUrl.origin;
      const payload = await callAgentSearch(origin, word);

      console.log("[telegram webhook] search/save success");

      await sendTelegramMessage({
        token,
        chatId,
        text: buildAgentReply(payload),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown telegram workflow error.";

      console.error("[telegram webhook] search/save failure:", message);

      await sendTelegramMessage({
        token,
        chatId,
        text: buildFriendlyErrorMessage(),
      });
    }

    return jsonOk();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook error.";

    console.error("[telegram webhook] fatal error:", message);
    return jsonOk();
  }
}
