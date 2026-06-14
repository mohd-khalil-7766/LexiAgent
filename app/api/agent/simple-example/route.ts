import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LearningLanguage = "en" | "zh";
type ExplanationLanguage = "en" | "ar" | "zh";

type RequestBody = {
  word?: unknown;
  learningLanguage?: unknown;
  explanationLanguage?: unknown;
  meaning?: unknown;
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

type SimpleExample = {
  example_sentence: string;
  translated_example: string;
};

function isLearningLanguage(value: unknown): value is LearningLanguage {
  return value === "en" || value === "zh";
}

function isExplanationLanguage(value: unknown): value is ExplanationLanguage {
  return value === "en" || value === "ar" || value === "zh";
}

function languageName(language: LearningLanguage | ExplanationLanguage) {
  const names = {
    en: "English",
    zh: "Simplified Chinese",
    ar: "Arabic",
  };

  return names[language];
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requireEnvironmentValue(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }

  return value;
}

function parseSimpleExample(content: string): SimpleExample {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("The model did not return JSON.");
  }

  const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Partial<SimpleExample>;

  if (
    typeof parsed.example_sentence !== "string" ||
    typeof parsed.translated_example !== "string" ||
    parsed.example_sentence.trim().length < 4 ||
    parsed.translated_example.trim().length < 2
  ) {
    throw new Error("The model returned incomplete simple example data.");
  }

  return {
    example_sentence: parsed.example_sentence.trim(),
    translated_example: parsed.translated_example.trim(),
  };
}

function fallbackExample(
  word: string,
  learningLanguage: LearningLanguage,
  explanationLanguage: ExplanationLanguage,
): SimpleExample {
  if (learningLanguage === "en") {
    if (explanationLanguage === "zh") {
      return {
        example_sentence: `I learned the word ${word} today.`,
        translated_example: `我今天学习了 ${word} 这个词。`,
      };
    }

    if (explanationLanguage === "ar") {
      return {
        example_sentence: `I learned the word ${word} today.`,
        translated_example: `تعلمت كلمة ${word} اليوم.`,
      };
    }

    return {
      example_sentence: `I learned the word ${word} today.`,
      translated_example: `I learned the word ${word} today.`,
    };
  }

  if (explanationLanguage === "ar") {
    return {
      example_sentence: `我今天学习了“${word}”。`,
      translated_example: `تعلمت كلمة "${word}" اليوم.`,
    };
  }

  if (explanationLanguage === "en") {
    return {
      example_sentence: `我今天学习了“${word}”。`,
      translated_example: `I learned "${word}" today.`,
    };
  }

  return {
    example_sentence: `我今天学习了“${word}”。`,
    translated_example: `我今天学习了“${word}”。`,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const word = cleanString(body.word);
    const meaning = cleanString(body.meaning);
    const learningLanguage = body.learningLanguage;
    const explanationLanguage = body.explanationLanguage;

    if (word.length < 2 || word.length > 60) {
      return NextResponse.json(
        { success: false, error: "Enter a word between 2 and 60 characters." },
        { status: 400 },
      );
    }

    if (!isLearningLanguage(learningLanguage)) {
      return NextResponse.json(
        { success: false, error: "Learning language must be en or zh." },
        { status: 400 },
      );
    }

    if (!isExplanationLanguage(explanationLanguage)) {
      return NextResponse.json(
        { success: false, error: "Explanation language must be en, ar or zh." },
        { status: 400 },
      );
    }

    const openRouterKey = requireEnvironmentValue("OPENROUTER_API_KEY");

    const configuredModel = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
    const candidateModels = Array.from(
      new Set([
        configuredModel,
        "openrouter/free",
        "openai/gpt-oss-120b:free",
        "nvidia/nemotron-nano-9b-v2:free",
      ]),
    );

    const systemPrompt = `
You are LexiAgent, a vocabulary learning assistant.

Create one simple learner-friendly example sentence.

Rules:
- The example must be original and simple.
- It must NOT be copied from a website.
- It must use the target word naturally.
- The example sentence must be in ${languageName(learningLanguage)}.
- The translation must be in ${languageName(explanationLanguage)}.
- Avoid complex news sentences.
- Avoid long paragraphs.
- Return only valid JSON.

JSON shape:
{
  "example_sentence": "string",
  "translated_example": "string"
}
`.trim();

    const userPrompt = `
Target word: ${word}
Meaning: ${meaning || "not provided"}
Learning language: ${languageName(learningLanguage)}
Explanation language: ${languageName(explanationLanguage)}
`.trim();

    let lastError = "The model could not generate a simple example.";

    for (const model of candidateModels) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "LexiAgent Simple Example",
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 350,
          provider: {
            allow_fallbacks: true,
          },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      const responseText = await response.text();

      let completion: OpenRouterResponse | null = null;

      try {
        completion = JSON.parse(responseText) as OpenRouterResponse;
      } catch {
        lastError = "OpenRouter returned invalid JSON.";
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
        lastError = "OpenRouter returned an empty example.";
        continue;
      }

      const example = parseSimpleExample(content);

      return NextResponse.json({
        success: true,
        ...example,
        model: completion.model ?? model,
      });
    }

    const fallback = fallbackExample(word, learningLanguage, explanationLanguage);

    return NextResponse.json({
      success: true,
      ...fallback,
      model: "local-fallback",
      warning: lastError,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Simple example failed.",
      },
      { status: 500 },
    );
  }
}
