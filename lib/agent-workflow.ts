export type AgentWorkflowChannel = "web" | "telegram" | "saved-entry" | "unknown";

export type SourceRetrievalTrace = {
  inputWord: string;
  externalTool: string;
  status: "real_source_found" | "fallback_used";
  statusText: string;
  sourceName: string | null;
  sourceUrl: string | null;
  retrievedSnippet: string | null;
  searchProvider: string | null;
};

export type VocabularyTutorTrace = {
  agentLabel: string;
  llm: string | null;
  pronunciation: string | null;
  meaning: string | null;
  translatedExample: string | null;
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
};

export type StorageTrace = {
  savedToSupabase: boolean;
  returnedToWebUi: boolean;
  returnedToTelegram: boolean;
  channel: AgentWorkflowChannel;
  statusText: string;
};

export type AgentWorkflowTrace = {
  sourceRetrieval: SourceRetrievalTrace;
  vocabularyTutor: VocabularyTutorTrace;
  storage: StorageTrace;
};

type VocabularyLikeEntry = {
  word: string;
  pronunciation?: string | null;
  meaning?: string | null;
  translated_example?: string | null;
  collocations?: string[] | null;
  synonyms?: string[] | null;
  antonyms?: string[] | null;
  example_sentence?: string | null;
  source_name?: string | null;
  source_url?: string | null;
};

function cleanText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanList(values?: string[] | null) {
  if (!values) {
    return [];
  }

  return values.map((value) => value.trim()).filter(Boolean);
}

export function sourceRetrievalStatusFromUrl(sourceUrl?: string | null) {
  return cleanText(sourceUrl) ? "real_source_found" : "fallback_used";
}

export function sourceRetrievalStatusText(sourceUrl?: string | null) {
  return sourceRetrievalStatusFromUrl(sourceUrl) === "real_source_found"
    ? "Real source found"
    : "No real source found, fallback used.";
}

export function buildWorkflowTraceFromEntry(
  entry: VocabularyLikeEntry,
): AgentWorkflowTrace {
  const sourceUrl = cleanText(entry.source_url);

  return {
    sourceRetrieval: {
      inputWord: entry.word,
      externalTool: "Tavily Search API",
      status: sourceRetrievalStatusFromUrl(sourceUrl),
      statusText: sourceRetrievalStatusText(sourceUrl),
      sourceName: cleanText(entry.source_name),
      sourceUrl,
      retrievedSnippet: cleanText(entry.example_sentence),
      searchProvider: sourceUrl ? "Retrieved source" : "Fallback trace",
    },
    vocabularyTutor: {
      agentLabel: "Vocabulary Tutor Agent",
      llm: "Configured OpenRouter model",
      pronunciation: cleanText(entry.pronunciation),
      meaning: cleanText(entry.meaning),
      translatedExample: cleanText(entry.translated_example),
      collocations: cleanList(entry.collocations),
      synonyms: cleanList(entry.synonyms),
      antonyms: cleanList(entry.antonyms),
    },
    storage: {
      savedToSupabase: true,
      returnedToWebUi: true,
      returnedToTelegram: true,
      channel: "saved-entry",
      statusText:
        "Saved final vocabulary entry to Supabase and made it available to the Web UI and Telegram/OpenClaw workflow.",
    },
  };
}
