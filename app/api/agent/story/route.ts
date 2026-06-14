import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LearningLanguage = "en" | "zh";
type ExplanationLanguage = "en" | "zh" | "ar";
type StoryLevel = "easy" | "medium";

type StoryRequestBody = {
  words?: unknown;
  learningLanguage?: unknown;
  explanationLanguage?: unknown;
  level?: unknown;
};

type OpenRouterResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    metadata?: {
      raw?: string;
    };
  };
};

type StoryResult = {
  title: string;
  story: string;
  translation: string;
  words_used: string[];
  level: StoryLevel;
};

function requireEnvironmentValue(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }

  return value;
}

function isLearningLanguage(value: unknown): value is LearningLanguage {
  return value === "en" || value === "zh";
}

function isExplanationLanguage(value: unknown): value is ExplanationLanguage {
  return value === "en" || value === "zh" || value === "ar";
}

function isStoryLevel(value: unknown): value is StoryLevel {
  return value === "easy" || value === "medium";
}

function extractWords(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,，،;；]+/u)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word, index, array) => array.indexOf(word) === index)
    .slice(0, 12);
}

function languageName(language: LearningLanguage | ExplanationLanguage) {
  const names = {
    en: "English",
    zh: "Simplified Chinese",
    ar: "Arabic",
  };

  return names[language];
}

function parseJsonObject(content: string) {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("The AI returned text instead of JSON.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Partial<StoryResult>;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function generateStory({
  words,
  learningLanguage,
  explanationLanguage,
  level,
}: {
  words: string[];
  learningLanguage: LearningLanguage;
  explanationLanguage: ExplanationLanguage;
  level: StoryLevel;
}) {
  const openRouterKey = requireEnvironmentValue("OPENROUTER_API_KEY");
  const configuredModel = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  const models = Array.from(new Set([configuredModel, "openrouter/free"]));

  const wordList = words.join(", ");

  const systemPrompt = `
You are LexiAgent, a multilingual vocabulary learning assistant.

Create a short learner paragraph or mini story using ALL requested words.

Rules:
- The story language must be ${languageName(learningLanguage)}.
- The translation language must be ${languageName(explanationLanguage)}.
- Use every requested word naturally at least once.
- Keep the story simple and useful for vocabulary learning.
- easy level: 3 to 5 short sentences.
- medium level: 5 to 7 sentences.
- Do not use markdown.
- Return exactly one valid JSON object.

JSON shape:
{
  "title": "short title",
  "story": "paragraph using all words",
  "translation": "natural translation",
  "words_used": ["word1", "word2"],
  "level": "${level}"
}
`.trim();

  const userPrompt = `
Words: ${wordList}
Learning language: ${languageName(learningLanguage)}
Explanation language: ${languageName(explanationLanguage)}
Level: ${level}
`.trim();

  let lastError = "Story generation failed.";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const model = models[(attempt - 1) % models.length];

    const response = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "LexiAgent Story Builder",
        },
        body: JSON.stringify({
          model,
          temperature: 0.55,
          max_tokens: 1000,
          provider: {
            allow_fallbacks: true,
          },
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
      },
      70000,
    );

    const responseText = await response.text();

    let completion: OpenRouterResponse;

    try {
      completion = JSON.parse(responseText) as OpenRouterResponse;
    } catch {
      lastError = `OpenRouter returned invalid JSON on attempt ${attempt}.`;
      continue;
    }

    if (!response.ok || completion.error) {
      lastError =
        completion.error?.metadata?.raw ??
        completion.error?.message ??
        `OpenRouter failed with status ${response.status}.`;
      continue;
    }

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      lastError = `OpenRouter returned empty story content on attempt ${attempt}.`;
      continue;
    }

    const parsed = parseJsonObject(content);

    if (
      !parsed.title ||
      !parsed.story ||
      !parsed.translation ||
      !Array.isArray(parsed.words_used)
    ) {
      lastError = "The AI returned incomplete story data.";
      continue;
    }

    return {
      title: parsed.title.trim(),
      story: parsed.story.trim(),
      translation: parsed.translation.trim(),
      words_used: parsed.words_used.map(String),
      level,
      model,
    };
  }

  throw new Error(lastError);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StoryRequestBody;

    const words = extractWords(body.words);
    const learningLanguage = body.learningLanguage;
    const explanationLanguage = body.explanationLanguage;
    const level = body.level ?? "easy";

    if (words.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter at least one word.",
        },
        { status: 400 },
      );
    }

    if (words.length > 12) {
      return NextResponse.json(
        {
          success: false,
          error: "Use 12 words or fewer.",
        },
        { status: 400 },
      );
    }

    if (!isLearningLanguage(learningLanguage)) {
      return NextResponse.json(
        {
          success: false,
          error: "Learning language must be en or zh.",
        },
        { status: 400 },
      );
    }

    if (!isExplanationLanguage(explanationLanguage)) {
      return NextResponse.json(
        {
          success: false,
          error: "Explanation language must be en, zh, or ar.",
        },
        { status: 400 },
      );
    }

    if (!isStoryLevel(level)) {
      return NextResponse.json(
        {
          success: false,
          error: "Level must be easy or medium.",
        },
        { status: 400 },
      );
    }

    const story = await generateStory({
      words,
      learningLanguage,
      explanationLanguage,
      level,
    });

    return NextResponse.json({
      success: true,
      story,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      { status: 500 },
    );
  }
}
