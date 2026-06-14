import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AgentWorkflowTrace } from "@/lib/agent-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LearningLanguage = "en" | "zh";
type ExplanationLanguage = "en" | "ar" | "zh";
type RequestChannel = "web" | "telegram";

type AgentRequestBody = {
  word?: unknown;
  learningLanguage?: unknown;
  explanationLanguage?: unknown;
  channel?: unknown;
};

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  raw_content?: string | null;
  score?: number;
  source_image_url?: string | null;
  source_image_description?: string | null;
  source_favicon_url?: string | null;
};

type TavilyResponse = {
  results?: TavilyResult[];
  request_id?: string;
};

type WikipediaSummaryResponse = {
  type?: string;
  title?: string;
  displaytitle?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
  thumbnail?: {
    source?: string;
  };
  originalimage?: {
    source?: string;
  };
  description?: string;
};

type VerifiedExample = {
  source: TavilyResult;
  sentence: string;
  matchedForm: string;
};

type ExistingVerifiedSource = {
  example_sentence: string;
  source_name: string;
  source_title: string | null;
  source_url: string;
};

type StructuredAgentResult = {
  found: boolean;
  pronunciation: string;
  part_of_speech: string;
  meaning: string;
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
  example_sentence: string;
  translated_example: string;
  ai_example_sentence: string;
  ai_translated_example: string;
  source_url: string;
  reason: string;
};

type OpenRouterResponse = {
  model?: string;
  provider?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      reasoning?: string | null;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
    metadata?: {
      raw?: string;
      provider_name?: string;
    };
  };
};

type AgentErrorObject = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

const ENGLISH_TRUSTED_DOMAINS = [
  "wikipedia.org",
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "npr.org",
  "voanews.com",
];

const CHINESE_TRUSTED_DOMAINS = [
  "wikipedia.org",
  "xinhuanet.com",
  "people.com.cn",
  "chinanews.com.cn",
  "thepaper.cn",
];

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  label: string,
  timeoutMs = 70000,
  retries = 4,
) {
  let lastError = "network request failed";

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);

      const errorCause =
        error instanceof Error
          ? (error as Error & { cause?: unknown }).cause
          : null;

      const errorText =
        error instanceof Error
          ? `${error.name}: ${error.message}${
              errorCause ? ` Details: ${String(errorCause)}` : ""
            }`
          : "network request failed";

      lastError = errorText;

      const retryable =
        /fetch failed|ConnectTimeoutError|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|AbortError/i.test(
          errorText,
        );

      if (!retryable || attempt === retries) {
        break;
      }

      await wait(attempt * 3000);
    }
  }

  throw new Error(
    `${label} connection failed after ${retries} attempts: ${lastError}`,
  );
}

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
  return value === "en" || value === "ar" || value === "zh";
}

function isRequestChannel(value: unknown): value is RequestChannel {
  return value === "web" || value === "telegram";
}

function cleanWord(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function normalizeWord(word: string, language: LearningLanguage) {
  return language === "en" ? word.toLowerCase() : word;
}

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeComparableText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSourceText(source: TavilyResult) {
  return `${source.content ?? ""}\n${source.raw_content ?? ""}`.trim();
}

function findTargetWordForm(
  sentence: string,
  targetWord: string,
  language: LearningLanguage,
) {
  if (language === "zh") {
    return sentence.includes(targetWord) ? targetWord : null;
  }

  const normalizedTarget = normalizeWord(targetWord, language);
  const escapedTarget = escapeRegularExpression(normalizedTarget);

  const exactMatch = sentence.match(new RegExp(`\\b${escapedTarget}\\b`, "i"));

  if (exactMatch) {
    return exactMatch[0];
  }

  const inflectedMatch = sentence.match(
    new RegExp(`\\b${escapedTarget}(?:s|es|ed|ing)?\\b`, "i"),
  );

  return inflectedMatch?.[0] ?? null;
}

function sentenceContainsTargetWord(
  sentence: string,
  targetWord: string,
  language: LearningLanguage,
) {
  return findTargetWordForm(sentence, targetWord, language) !== null;
}

function sourceContainsTargetWord(
  source: TavilyResult,
  targetWord: string,
  language: LearningLanguage,
) {
  return sentenceContainsTargetWord(
    getSourceText(source),
    targetWord,
    language,
  );
}

function sourceContainsExactSentence(source: TavilyResult, sentence: string) {
  const normalizedSource = normalizeComparableText(getSourceText(source));
  const normalizedSentence = normalizeComparableText(sentence);

  return normalizedSource.includes(normalizedSentence);
}

function cleanExtractedSentence(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”‘’\-–—•]+|[\s"'“”‘’]+$/gu, "")
    .trim();
}

function splitSourceIntoSentences(
  sourceText: string,
  learningLanguage: LearningLanguage,
) {
  const compactText = sourceText
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!compactText) {
    return [];
  }

  const sentencePattern =
    learningLanguage === "zh"
      ? /[^。！？!?]{8,}[。！？!?]/gu
      : /[^.!?]{20,}[.!?]/gu;

  return (compactText.match(sentencePattern) ?? [])
    .map(cleanExtractedSentence)
    .filter((sentence) =>
      learningLanguage === "zh"
        ? sentence.length >= 8 && sentence.length <= 280
        : sentence.length >= 25 && sentence.length <= 420,
    );
}

function findVerifiedExample(
  sources: TavilyResult[],
  targetWord: string,
  learningLanguage: LearningLanguage,
): VerifiedExample | null {
  const pageNoise =
    /cookie|privacy policy|javascript|subscribe|sign up|copyright|all rights reserved|newsletter|delivered to your inbox|handpicked selection|follow us|share this|related topics|advertisement|advertising|download (?:our|the) app|register now|log in/i;

  const navigationOrBrandList =
    /\b(?:BBC\s+)?(?:Future|Earth|Culture|Capital|Travel|Autos)(?:\s*,\s*(?:BBC\s+)?(?:Future|Earth|Culture|Capital|Travel|Autos)){2,}/i;

  const normalizedTarget = normalizeWord(targetWord, learningLanguage);

  for (const source of sources) {
    const candidates = splitSourceIntoSentences(
      getSourceText(source),
      learningLanguage,
    )
      .map((sentence) => ({
        sentence,
        matchedForm: findTargetWordForm(
          sentence,
          targetWord,
          learningLanguage,
        ),
      }))
      .filter(
        (
          candidate,
        ): candidate is { sentence: string; matchedForm: string } =>
          candidate.matchedForm !== null,
      )
      .filter((candidate) => !pageNoise.test(candidate.sentence))
      .filter((candidate) => !navigationOrBrandList.test(candidate.sentence))
      .filter((candidate) =>
        sourceContainsExactSentence(source, candidate.sentence),
      )
      .sort((left, right) => {
        const leftExact =
          normalizeWord(left.matchedForm, learningLanguage) ===
          normalizedTarget;
        const rightExact =
          normalizeWord(right.matchedForm, learningLanguage) ===
          normalizedTarget;

        if (leftExact !== rightExact) {
          return leftExact ? -1 : 1;
        }

        const preferredLength = learningLanguage === "zh" ? 55 : 125;

        return (
          Math.abs(left.sentence.length - preferredLength) -
          Math.abs(right.sentence.length - preferredLength)
        );
      });

    if (candidates.length > 0) {
      return {
        source,
        sentence: candidates[0].sentence,
        matchedForm: candidates[0].matchedForm,
      };
    }
  }

  return null;
}

function sourceLabelFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    const knownLabels: Record<string, string> = {
      "en.wikipedia.org": "Wikipedia",
      "zh.wikipedia.org": "Wikipedia",
      "wikipedia.org": "Wikipedia",
      "reuters.com": "Reuters",
      "apnews.com": "AP News",
      "bbc.com": "BBC",
      "bbc.co.uk": "BBC",
      "npr.org": "NPR",
      "voanews.com": "VOA Learning English",
      "learningenglish.voanews.com": "VOA Learning English",
      "xinhuanet.com": "Xinhua",
      "people.com.cn": "People's Daily",
      "chinanews.com.cn": "China News",
      "thepaper.cn": "The Paper",
    };

    return knownLabels[hostname] ?? hostname;
  } catch {
    return "Verified Source";
  }
}

function safeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function parseStructuredResult(content: string): StructuredAgentResult {
  const cleanedContent = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleanedContent.indexOf("{");
  const lastBrace = cleanedContent.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("OpenRouter returned text instead of JSON vocabulary data.");
  }

  const parsed = JSON.parse(
    cleanedContent.slice(firstBrace, lastBrace + 1),
  ) as Partial<StructuredAgentResult>;

  if (parsed.found !== true) {
    return {
      found: false,
      pronunciation: "",
      part_of_speech: "",
      meaning: "",
      collocations: [],
      synonyms: [],
      antonyms: [],
      example_sentence: "",
      translated_example: "",
      ai_example_sentence: "",
      ai_translated_example: "",
      source_url: "",
      reason:
        typeof parsed.reason === "string"
          ? parsed.reason
          : "No suitable source sentence was selected.",
    };
  }

  const requiredFields = {
    part_of_speech: parsed.part_of_speech,
    meaning: parsed.meaning,
    translated_example: parsed.translated_example,
    ai_example_sentence: parsed.ai_example_sentence,
    ai_translated_example: parsed.ai_translated_example,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => typeof value !== "string" || value.trim() === "")
    .map(([field]) => field);

  if (missingFields.length > 0) {
    throw new Error(
      `The language model returned incomplete vocabulary data. Missing: ${missingFields.join(
        ", ",
      )}.`,
    );
  }

  return {
    found: true,
    pronunciation:
      typeof parsed.pronunciation === "string"
        ? parsed.pronunciation.trim()
        : "",
    part_of_speech: parsed.part_of_speech!.trim(),
    meaning: parsed.meaning!.trim(),
    collocations: safeStringArray(parsed.collocations),
    synonyms: safeStringArray(parsed.synonyms),
    antonyms: safeStringArray(parsed.antonyms),
    example_sentence:
      typeof parsed.example_sentence === "string"
        ? parsed.example_sentence.trim()
        : "",
    translated_example: parsed.translated_example!.trim(),
    ai_example_sentence: parsed.ai_example_sentence!.trim(),
    ai_translated_example: parsed.ai_translated_example!.trim(),
    source_url:
      typeof parsed.source_url === "string" ? parsed.source_url.trim() : "",
    reason: "",
  };
}

function createSearchQuery(word: string, learningLanguage: LearningLanguage) {
  if (learningLanguage === "zh") {
    return `"${word}" 中文 百科 真实例句`;
  }

  return `"${word}" definition meaning example`;
}

async function tryWikipediaSource(
  word: string,
  learningLanguage: LearningLanguage,
): Promise<TavilyResult | null> {
  const wikiHost =
    learningLanguage === "zh" ? "zh.wikipedia.org" : "en.wikipedia.org";

  const title =
    learningLanguage === "en"
      ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      : word;

  const response = await fetchWithTimeout(
    `https://${wikiHost}/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "LexiAgent-Final-Project/1.0",
      },
    },
    "Wikipedia",
    45000,
    2,
  );

  if (!response.ok) {
    return null;
  }

  const summary = (await response.json()) as WikipediaSummaryResponse;

  if (
    summary.type === "disambiguation" ||
    !summary.extract ||
    !summary.content_urls?.desktop?.page
  ) {
    return null;
  }

  const result: TavilyResult = {
    title: `${summary.title ?? title} - Wikipedia`,
    url: summary.content_urls.desktop.page,
    content: summary.extract,
    raw_content: summary.extract,
    score: 1,
    source_image_url:
      summary.originalimage?.source ?? summary.thumbnail?.source ?? null,
    source_image_description:
      summary.description ?? summary.title ?? `${word} source image`,
    source_favicon_url: "https://en.wikipedia.org/static/favicon/wikipedia.ico",
  };

  if (!sourceContainsTargetWord(result, word, learningLanguage)) {
    return null;
  }

  return result;
}

async function callTavily(
  word: string,
  learningLanguage: LearningLanguage,
  includeDomains?: string[],
) {
  const tavilyApiKey = requireEnvironmentValue("TAVILY_API_KEY");

  const response = await fetchWithTimeout(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tavilyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: createSearchQuery(word, learningLanguage),
        topic: "general",
        search_depth: "basic",
        include_answer: false,
        include_raw_content: "text",
        max_results: 5,
        ...(includeDomains ? { include_domains: includeDomains } : {}),
      }),
    },
    "Tavily",
    70000,
    4,
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Tavily search failed: ${response.status} ${responseText.slice(0, 220)}`,
    );
  }

  return JSON.parse(responseText) as TavilyResponse;
}

async function findAuthenticSources(
  word: string,
  learningLanguage: LearningLanguage,
) {
  try {
    const wikipediaSource = await tryWikipediaSource(word, learningLanguage);

    if (wikipediaSource) {
      return [wikipediaSource];
    }
  } catch {
    // Continue to Tavily fallback.
  }

  const preferredDomains =
    learningLanguage === "en"
      ? ENGLISH_TRUSTED_DOMAINS
      : CHINESE_TRUSTED_DOMAINS;

  try {
    const preferredSearch = await callTavily(
      word,
      learningLanguage,
      preferredDomains,
    );

    const preferredResults = (preferredSearch.results ?? []).filter((source) =>
      sourceContainsTargetWord(source, word, learningLanguage),
    );

    if (preferredResults.length > 0) {
      return preferredResults.slice(0, 3);
    }
  } catch {
    // Continue to wider fallback.
  }

  const widerSearch = await callTavily(word, learningLanguage);

  const widerResults = (widerSearch.results ?? []).filter((source) =>
    sourceContainsTargetWord(source, word, learningLanguage),
  );

  return widerResults.slice(0, 3);
}

function explanationLanguageName(language: ExplanationLanguage) {
  const names: Record<ExplanationLanguage, string> = {
    en: "English",
    ar: "Arabic",
    zh: "Simplified Chinese",
  };

  return names[language];
}

function normalizePartOfSpeechValue(
  value: string,
  explanationLanguage: ExplanationLanguage,
) {
  const cleaned = value.trim().toLowerCase();

  const posMap: Record<string, Record<ExplanationLanguage, string>> = {
    noun: {
      en: "noun",
      zh: "名词",
      ar: "اسم",
    },
    "n.": {
      en: "noun",
      zh: "名词",
      ar: "اسم",
    },
    n: {
      en: "noun",
      zh: "名词",
      ar: "اسم",
    },
    verb: {
      en: "verb",
      zh: "动词",
      ar: "فعل",
    },
    "v.": {
      en: "verb",
      zh: "动词",
      ar: "فعل",
    },
    v: {
      en: "verb",
      zh: "动词",
      ar: "فعل",
    },
    adjective: {
      en: "adjective",
      zh: "形容词",
      ar: "صفة",
    },
    adj: {
      en: "adjective",
      zh: "形容词",
      ar: "صفة",
    },
    "adj.": {
      en: "adjective",
      zh: "形容词",
      ar: "صفة",
    },
    adverb: {
      en: "adverb",
      zh: "副词",
      ar: "حال",
    },
    adv: {
      en: "adverb",
      zh: "副词",
      ar: "حال",
    },
    "adv.": {
      en: "adverb",
      zh: "副词",
      ar: "حال",
    },
    preposition: {
      en: "preposition",
      zh: "介词",
      ar: "حرف جر",
    },
    conjunction: {
      en: "conjunction",
      zh: "连词",
      ar: "حرف عطف",
    },
    pronoun: {
      en: "pronoun",
      zh: "代词",
      ar: "ضمير",
    },
    phrase: {
      en: "phrase",
      zh: "短语",
      ar: "عبارة",
    },
  };

  if (posMap[cleaned]) {
    return posMap[cleaned][explanationLanguage];
  }

  if (explanationLanguage === "zh") {
    if (cleaned.includes("noun")) return "名词";
    if (cleaned.includes("verb")) return "动词";
    if (cleaned.includes("adjective") || cleaned.includes("adj")) {
      return "形容词";
    }
    if (cleaned.includes("adverb") || cleaned.includes("adv")) return "副词";
    if (cleaned.includes("preposition")) return "介词";
    if (cleaned.includes("conjunction")) return "连词";
    if (cleaned.includes("pronoun")) return "代词";
  }

  if (explanationLanguage === "ar") {
    if (cleaned.includes("noun")) return "اسم";
    if (cleaned.includes("verb")) return "فعل";
    if (cleaned.includes("adjective") || cleaned.includes("adj")) {
      return "صفة";
    }
    if (cleaned.includes("adverb") || cleaned.includes("adv")) return "حال";
    if (cleaned.includes("preposition")) return "حرف جر";
    if (cleaned.includes("conjunction")) return "حرف عطف";
    if (cleaned.includes("pronoun")) return "ضمير";
  }

  return value.trim();
}

function containsExpectedExplanationLanguage(
  value: string,
  language: ExplanationLanguage,
) {
  if (language === "zh") {
    return /[\u3400-\u9fff]/u.test(value);
  }

  if (language === "ar") {
    return /[\u0600-\u06ff]/u.test(value);
  }

  return /[A-Za-z]/u.test(value);
}

function findInvalidExplanationFields(
  output: StructuredAgentResult,
  explanationLanguage: ExplanationLanguage,
) {
  const explanatoryFields = [
    {
      name: "meaning",
      value: output.meaning,
    },
    {
      name: "translated_example",
      value: output.translated_example,
    },
    {
      name: "ai_translated_example",
      value: output.ai_translated_example,
    },
  ];

  return explanatoryFields
    .filter(
      (field) =>
        !containsExpectedExplanationLanguage(
          field.value,
          explanationLanguage,
        ),
    )
    .map((field) => field.name);
}

function isConciseMeaning(
  meaning: string,
  explanationLanguage: ExplanationLanguage,
) {
  const compactMeaning = meaning.replace(/\s+/g, "").trim();

  if (explanationLanguage === "zh") {
    return Array.from(compactMeaning).length <= 22;
  }

  if (explanationLanguage === "ar") {
    return Array.from(compactMeaning).length <= 70;
  }

  return meaning.trim().split(/\s+/).length <= 16;
}

async function askOpenRouterForVocabulary({
  word,
  learningLanguage,
  explanationLanguage,
  verifiedExample,
}: {
  word: string;
  learningLanguage: LearningLanguage;
  explanationLanguage: ExplanationLanguage;
  verifiedExample: VerifiedExample;
}) {
  const openRouterKey = requireEnvironmentValue("OPENROUTER_API_KEY");
  const configuredModel =
    process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-oss-120b:free";

  const candidateModels = Array.from(
    new Set([configuredModel, "openai/gpt-oss-120b:free", "openrouter/free"]),
  );

  const languageDescription =
    learningLanguage === "en" ? "English" : "Chinese";

  const systemPrompt = `
You are LexiAgent, a multilingual vocabulary tutor.

A deterministic server has already:
- searched an authentic external source,
- selected one exact source sentence,
- confirmed that the sentence contains an accepted form of the requested vocabulary word,
- confirmed that the sentence is copied from the source.

Do not reject the verified source sentence.

Your tasks:
1. Explain the requested word in the requested explanation language.
2. Translate the verified source sentence into the requested explanation language.
3. Create one new simple learner example sentence using the requested word. This sentence must be created by you, not copied from the source.
4. Translate your simple learner example sentence.
5. Provide pronunciation when confident.
6. Provide collocations, synonyms and antonyms in the learning language.

Rules:
- part_of_speech, meaning, translated_example and ai_translated_example must be written only in ${explanationLanguageName(
    explanationLanguage,
  )}.
- meaning must be a short dictionary translation, not a long explanation.
  - Chinese examples: love -> "爱；爱情", dog -> "狗；犬", house -> "房子；住宅".
  - Arabic examples: love -> "حُبّ؛ محبة", dog -> "كلب", house -> "منزل؛ بيت".
  - English example: love -> "strong affection".
- part_of_speech must contain only the part of speech.
- ai_example_sentence must be a simple sentence in ${languageDescription}.
- ai_example_sentence must contain the requested vocabulary word clearly.
- Return exactly one valid JSON object and no markdown.

Return exactly this shape:
{
  "found": true,
  "pronunciation": "string",
  "part_of_speech": "string",
  "meaning": "string",
  "collocations": ["string"],
  "synonyms": ["string"],
  "antonyms": ["string"],
  "translated_example": "string",
  "ai_example_sentence": "string",
  "ai_translated_example": "string",
  "reason": ""
}
`.trim();

  const userPrompt = `
REQUESTED VOCABULARY WORD: ${word}
VERIFIED MATCHED FORM IN SOURCE SENTENCE: ${verifiedExample.matchedForm}
LEARNING LANGUAGE: ${languageDescription}
EXPLANATION LANGUAGE: ${explanationLanguageName(explanationLanguage)}

AUTHENTIC VERIFIED SOURCE SENTENCE:
${verifiedExample.sentence}
`.trim();

  let lastError = "OpenRouter did not return usable vocabulary data.";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const model = candidateModels[(attempt - 1) % candidateModels.length];

    const requestBody = {
      model,
      temperature: 0.15,
      max_tokens: 900,
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
    };

    let response: Response;

    try {
      response = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "X-OpenRouter-Title": "LexiAgent Final Project",
          },
          body: JSON.stringify(requestBody),
        },
        "OpenRouter",
        70000,
        3,
      );
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "OpenRouter connection failed.";

      if (attempt < 4) {
        await wait(attempt * 2500);
        continue;
      }

      throw new Error(lastError);
    }

    const responseText = await response.text();
    let completion: OpenRouterResponse | null = null;

    try {
      completion = JSON.parse(responseText) as OpenRouterResponse;
    } catch {
      lastError = `OpenRouter returned invalid API JSON on attempt ${attempt}.`;

      if (attempt < 4) {
        await wait(attempt * 2000);
        continue;
      }

      throw new Error(lastError);
    }

    const providerMessage =
      completion.error?.metadata?.raw ??
      completion.error?.message ??
      responseText.slice(0, 220);

    if (!response.ok || completion.error) {
      lastError = `OpenRouter attempt ${attempt} failed: ${providerMessage}`;

      const retryable =
        response.status === 402 && model !== "openrouter/free"
          ? true
          : response.status === 429 ||
            response.status >= 500 ||
            /temporar|rate[- ]?limit|provider|no endpoints|no available|fetch|timeout/i.test(
              providerMessage,
            );

      if (retryable && attempt < 4) {
        await wait(attempt * 2500);
        continue;
      }

      throw new Error(lastError);
    }

    const messageContent = completion.choices?.[0]?.message?.content;

    if (!messageContent || typeof messageContent !== "string") {
      lastError = `OpenRouter attempt ${attempt} returned no vocabulary content.`;

      if (attempt < 4) {
        await wait(attempt * 2000);
        continue;
      }

      throw new Error(lastError);
    }

    try {
      const generatedOutput = parseStructuredResult(messageContent);

      const normalizedOutput: StructuredAgentResult = {
        ...generatedOutput,
        part_of_speech: normalizePartOfSpeechValue(
          generatedOutput.part_of_speech,
          explanationLanguage,
        ),
      };

      if (!normalizedOutput.found) {
        lastError =
          normalizedOutput.reason ||
          `OpenRouter attempt ${attempt} refused a server-verified sentence.`;

        if (attempt < 4) {
          await wait(attempt * 2000);
          continue;
        }

        throw new Error(lastError);
      }

      const invalidFields = findInvalidExplanationFields(
        normalizedOutput,
        explanationLanguage,
      );

      if (invalidFields.length > 0) {
        lastError = `OpenRouter returned ${invalidFields.join(
          ", ",
        )} outside ${explanationLanguageName(explanationLanguage)}.`;

        if (attempt < 4) {
          await wait(attempt * 2000);
          continue;
        }

        throw new Error(lastError);
      }

      if (!isConciseMeaning(normalizedOutput.meaning, explanationLanguage)) {
        lastError = `OpenRouter returned an overlong dictionary meaning in ${explanationLanguageName(
          explanationLanguage,
        )}.`;

        if (attempt < 4) {
          await wait(attempt * 2000);
          continue;
        }

        throw new Error(lastError);
      }

      return {
        output: {
          ...normalizedOutput,
          example_sentence: verifiedExample.sentence,
          source_url: verifiedExample.source.url,
        },
        model: completion.model ?? model,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "OpenRouter returned invalid vocabulary data.";

      if (attempt < 4) {
        await wait(attempt * 2000);
        continue;
      }

      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
}

function savedSourceLooksRelevant(
  savedSource: ExistingVerifiedSource,
  word: string,
  learningLanguage: LearningLanguage,
) {
  const normalizedWord = normalizeWord(word, learningLanguage);
  const title = normalizeComparableText(savedSource.source_title ?? "");
  const url = normalizeComparableText(savedSource.source_url);

  if (/\/wiki\/wikipedia:/i.test(savedSource.source_url)) {
    return false;
  }

  if (
    savedSource.source_url.includes("wikipedia.org") &&
    !url.includes(`/wiki/${encodeURIComponent(normalizedWord).toLowerCase()}`)
  ) {
    return false;
  }

  return (
    title.includes(normalizedWord) ||
    url.includes(normalizedWord) ||
    sentenceContainsTargetWord(
      savedSource.example_sentence,
      word,
      learningLanguage,
    )
  );
}

async function markRunAsFailed(runId: string, message: string) {
  await supabaseAdmin
    .from("agent_runs")
    .update({
      workflow_status: "failed",
      error_message: message.slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    const fullMessage = `${error.message} ${cause ? String(cause) : ""}`;

    if (
      /fetch failed|ConnectTimeoutError|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|AbortError/i.test(
        fullMessage,
      )
    ) {
      return [
        "External API connection failed.",
        "This is a network timeout, not a page or CSS error.",
        "Try again, restart npm run dev, or check VPN/proxy/network access to Tavily, Wikipedia, and OpenRouter.",
        `Details: ${fullMessage}`,
      ].join(" ");
    }

    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const agentError = error as AgentErrorObject;

    return [
      agentError.message ?? "Agent request failed.",
      agentError.code ? `Code: ${agentError.code}.` : "",
      agentError.details ? `Details: ${agentError.details}.` : "",
      agentError.hint ? `Hint: ${agentError.hint}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return String(error);
}

async function saveVocabularyEntryWithFallback({
  learnerId,
  word,
  normalizedWord,
  learningLanguage,
  explanationLanguage,
  output,
  verifiedSentence,
  selectedSource,
  sourceName,
  searchProvider,
}: {
  learnerId: string;
  word: string;
  normalizedWord: string;
  learningLanguage: LearningLanguage;
  explanationLanguage: ExplanationLanguage;
  output: StructuredAgentResult;
  verifiedSentence: string;
  selectedSource: TavilyResult;
  sourceName: string;
  searchProvider: string;
}) {
  const basePayload: Record<string, unknown> = {
    learner_id: learnerId,
    word,
    normalized_word: normalizedWord,
    learning_language: learningLanguage,
    explanation_language: explanationLanguage,
    pronunciation: output.pronunciation || null,
    part_of_speech: output.part_of_speech,
    meaning: output.meaning,
    collocations: output.collocations,
    synonyms: output.synonyms,
    antonyms: output.antonyms,
    example_sentence: verifiedSentence,
    translated_example: output.translated_example,
    source_name: sourceName,
    source_title: selectedSource.title,
    source_url: selectedSource.url,
    search_provider: searchProvider,
    source_verified: true,
    review_status: "new",
  };

  const extendedPayload: Record<string, unknown> = {
    ...basePayload,
    source_image_url: selectedSource.source_image_url ?? null,
    source_image_description: selectedSource.source_image_description ?? null,
    source_favicon_url: selectedSource.source_favicon_url ?? null,
  };

  const baseSelect =
    "id, word, pronunciation, part_of_speech, meaning, example_sentence, translated_example, source_name, source_title, source_url, source_verified, review_status";
  const extendedSelect = `${baseSelect}, source_image_url, source_image_description, source_favicon_url`;

  const firstAttempt = await supabaseAdmin
    .from("vocabulary_entries")
    .upsert(extendedPayload, {
      onConflict:
        "learner_id,normalized_word,learning_language,explanation_language",
    })
    .select(extendedSelect)
    .single();

  if (!firstAttempt.error) {
    return firstAttempt.data;
  }

  const errorText = `${firstAttempt.error.message ?? ""} ${
    firstAttempt.error.details ?? ""
  } ${firstAttempt.error.hint ?? ""}`;

  if (
    !/source_image_url|source_image_description|source_favicon_url|schema cache/i.test(
      errorText,
    )
  ) {
    throw firstAttempt.error;
  }

  const secondAttempt = await supabaseAdmin
    .from("vocabulary_entries")
    .upsert(basePayload, {
      onConflict:
        "learner_id,normalized_word,learning_language,explanation_language",
    })
    .select(baseSelect)
    .single();

  if (secondAttempt.error) {
    throw secondAttempt.error;
  }

  return secondAttempt.data;
}

// Source Retrieval Agent:
// receives the word, searches authentic sources, verifies a real sentence,
// and returns source metadata plus a workflow trace object.
function buildSourceRetrievalAgentTrace({
  word,
  searchProvider,
  verifiedExample,
}: {
  word: string;
  searchProvider: string;
  verifiedExample: VerifiedExample;
}): AgentWorkflowTrace["sourceRetrieval"] {
  const sourceUrl = verifiedExample.source.url?.trim() || null;

  return {
    inputWord: word,
    externalTool: "Tavily Search API",
    status: sourceUrl ? "real_source_found" : "fallback_used",
    statusText: sourceUrl
      ? "Real source found"
      : "No real source found, fallback used.",
    sourceName: sourceLabelFromUrl(verifiedExample.source.url),
    sourceUrl,
    retrievedSnippet: verifiedExample.sentence,
    searchProvider,
  };
}

function buildVocabularyTutorAgentTrace({
  model,
  output,
}: {
  model: string;
  output: StructuredAgentResult;
}): AgentWorkflowTrace["vocabularyTutor"] {
  return {
    agentLabel: "Vocabulary Tutor Agent",
    llm: model,
    pronunciation: output.pronunciation || null,
    meaning: output.meaning || null,
    translatedExample: output.translated_example || null,
    collocations: output.collocations,
    synonyms: output.synonyms,
    antonyms: output.antonyms,
  };
}

function buildStorageTrace(
  channel: RequestChannel,
): AgentWorkflowTrace["storage"] {
  return {
    savedToSupabase: true,
    returnedToWebUi: true,
    returnedToTelegram: channel === "telegram",
    channel,
    statusText:
      channel === "telegram"
        ? "Saved final vocabulary entry to Supabase and returned the result to the Telegram/OpenClaw workflow."
        : "Saved final vocabulary entry to Supabase and returned the result to the Web UI. The entry also remains available to the Telegram/OpenClaw workflow.",
  };
}

async function runSourceRetrievalAgent({
  learnerId,
  word,
  normalizedWord,
  learningLanguage,
}: {
  learnerId: string;
  word: string;
  normalizedWord: string;
  learningLanguage: LearningLanguage;
}) {
  let verifiedExample: VerifiedExample | null = null;
  let sourceName = "";
  let searchProvider = "Wikipedia/Tavily";

  const { data: savedVerifiedSourceRaw, error: savedSourceError } =
    await supabaseAdmin
      .from("vocabulary_entries")
      .select("example_sentence, source_name, source_title, source_url")
      .eq("learner_id", learnerId)
      .eq("normalized_word", normalizedWord)
      .eq("learning_language", learningLanguage)
      .eq("source_verified", true)
      .not("example_sentence", "is", null)
      .not("source_url", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (savedSourceError) {
    throw savedSourceError;
  }

  const savedVerifiedSource =
    savedVerifiedSourceRaw as ExistingVerifiedSource | null;

  if (
    savedVerifiedSource &&
    savedSourceLooksRelevant(savedVerifiedSource, word, learningLanguage)
  ) {
    const matchedForm = findTargetWordForm(
      savedVerifiedSource.example_sentence,
      word,
      learningLanguage,
    );

    if (matchedForm) {
      verifiedExample = {
        source: {
          title:
            savedVerifiedSource.source_title ?? savedVerifiedSource.source_name,
          url: savedVerifiedSource.source_url,
          content: savedVerifiedSource.example_sentence,
          raw_content: savedVerifiedSource.example_sentence,
        },
        sentence: savedVerifiedSource.example_sentence,
        matchedForm,
      };
      sourceName = savedVerifiedSource.source_name;
      searchProvider = "Verified Saved Source";
    }
  }

  if (!verifiedExample) {
    const sources = await findAuthenticSources(word, learningLanguage);

    if (sources.length === 0) {
      throw new Error(
        "No retrieved source containing this target word was found. Try a different word.",
      );
    }

    verifiedExample = findVerifiedExample(sources, word, learningLanguage);

    if (!verifiedExample) {
      throw new Error(
        "Authentic sources were found, but no clean article sentence containing the word could be verified. Try another word or search again.",
      );
    }

    sourceName = sourceLabelFromUrl(verifiedExample.source.url);
  }

  return {
    verifiedExample,
    sourceName,
    searchProvider,
    trace: buildSourceRetrievalAgentTrace({
      word,
      searchProvider,
      verifiedExample,
    }),
  };
}

// Vocabulary Tutor Agent:
// receives the word plus the verified source sentence and asks the LLM
// to generate learner-friendly vocabulary fields and translations.
async function runVocabularyTutorAgent({
  word,
  learningLanguage,
  explanationLanguage,
  verifiedExample,
}: {
  word: string;
  learningLanguage: LearningLanguage;
  explanationLanguage: ExplanationLanguage;
  verifiedExample: VerifiedExample;
}) {
  const { output, model } = await askOpenRouterForVocabulary({
    word,
    learningLanguage,
    explanationLanguage,
    verifiedExample,
  });

  return {
    output,
    model,
    trace: buildVocabularyTutorAgentTrace({
      model,
      output,
    }),
  };
}

export async function POST(request: Request) {
  let runId: string | null = null;

  try {
    const body = (await request.json()) as AgentRequestBody;

    const word = cleanWord(body.word);
    const learningLanguage = body.learningLanguage;
    const explanationLanguage = body.explanationLanguage;
    const channel = body.channel ?? "web";

    if (word.length < 2 || word.length > 60) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a word between 2 and 60 characters.",
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
          error: "Explanation language must be en, ar or zh.",
        },
        { status: 400 },
      );
    }

    if (!isRequestChannel(channel)) {
      return NextResponse.json(
        {
          success: false,
          error: "Channel must be web or telegram.",
        },
        { status: 400 },
      );
    }

    const { data: learner, error: learnerError } = await supabaseAdmin
      .from("learner_profiles")
      .select("id, display_name")
      .eq("display_name", "LexiAgent Student")
      .maybeSingle();

    if (learnerError) {
      throw learnerError;
    }

    if (!learner) {
      throw new Error("LexiAgent Student profile was not found.");
    }

    const commandText = `add ${word} --learn ${learningLanguage} --explain ${explanationLanguage}`;

    const { data: agentRun, error: agentRunError } = await supabaseAdmin
      .from("agent_runs")
      .insert({
        learner_id: learner.id,
        command_text: commandText,
        target_word: word,
        learning_language: learningLanguage,
        explanation_language: explanationLanguage,
        channel,
        search_provider: "Wikipedia/Tavily",
        llm_provider: process.env.OPENROUTER_MODEL?.trim() || "openrouter/free",
        workflow_status: "searching",
      })
      .select("id")
      .single();

    if (agentRunError) {
      throw agentRunError;
    }

    runId = agentRun.id;

    const normalizedWord = normalizeWord(word, learningLanguage);
    const sourceRetrievalAgent = await runSourceRetrievalAgent({
      learnerId: learner.id,
      word,
      normalizedWord,
      learningLanguage,
    });

    const { verifiedExample, sourceName, searchProvider } =
      sourceRetrievalAgent;

    const { error: generatingError } = await supabaseAdmin
      .from("agent_runs")
      .update({
        workflow_status: "generating",
        search_provider: searchProvider,
      })
      .eq("id", runId);

    if (generatingError) {
      throw generatingError;
    }

    const vocabularyTutorAgent = await runVocabularyTutorAgent({
      word,
      learningLanguage,
      explanationLanguage,
      verifiedExample,
    });

    const { output, model } = vocabularyTutorAgent;

    if (!output.found) {
      throw new Error(output.reason || "No verified sentence was selected.");
    }

    const invalidLanguageFields = findInvalidExplanationFields(
      output,
      explanationLanguage,
    );

    if (invalidLanguageFields.length > 0) {
      throw new Error(
        `The Agent did not return ${invalidLanguageFields.join(
          ", ",
        )} in ${explanationLanguageName(explanationLanguage)}.`,
      );
    }

    const selectedSource = verifiedExample.source;
    const verifiedSentence = verifiedExample.sentence;

    if (
      !sentenceContainsTargetWord(verifiedSentence, word, learningLanguage) ||
      !sourceContainsExactSentence(selectedSource, verifiedSentence)
    ) {
      throw new Error("Server-side source sentence verification failed.");
    }

    const savedEntry = await saveVocabularyEntryWithFallback({
      learnerId: learner.id,
      word,
      normalizedWord,
      learningLanguage,
      explanationLanguage,
      output,
      verifiedSentence,
      selectedSource,
      sourceName,
      searchProvider,
    });

    const { error: historyError } = await supabaseAdmin
      .from("learning_history")
      .insert({
        learner_id: learner.id,
        vocabulary_id: savedEntry.id,
        activity_type: "added",
        notes: `Saved through ${channel} Agent search.`,
      });

    if (historyError) {
      throw historyError;
    }

    const { error: completedRunError } = await supabaseAdmin
      .from("agent_runs")
      .update({
        vocabulary_id: savedEntry.id,
        llm_provider: model,
        workflow_status: "saved",
        source_name: sourceName,
        source_url: selectedSource.url,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (completedRunError) {
      throw completedRunError;
    }

    const workflowTrace: AgentWorkflowTrace = {
      sourceRetrieval: sourceRetrievalAgent.trace,
      vocabularyTutor: vocabularyTutorAgent.trace,
      storage: buildStorageTrace(channel),
    };

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Authentic vocabulary example verified and saved.",
      entry: {
        ...savedEntry,
        ai_example_sentence: output.ai_example_sentence,
        ai_translated_example: output.ai_translated_example,
        source_image_url: selectedSource.source_image_url ?? null,
        source_image_description: selectedSource.source_image_description ?? null,
        source_favicon_url: selectedSource.source_favicon_url ?? null,
      },
      workflowTrace,
      agentRun: {
        id: runId,
        status: "saved",
        channel,
        model,
      },
    });
  } catch (error) {
    const message = errorMessage(error);

    if (runId) {
      await markRunAsFailed(runId, message);
    }

    console.error("LexiAgent Agent search failed:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
