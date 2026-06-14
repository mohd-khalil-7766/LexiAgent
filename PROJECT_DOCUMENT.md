# LexiAgent Agent Workflow

This project uses a two-agent workflow for vocabulary retrieval and tutoring.

It is not a simple:

`User Input -> LLM -> Answer`

It is:

`User Input -> Source Retrieval Agent -> Real Source / Tavily Search API -> Vocabulary Tutor Agent / LLM -> Supabase -> Web UI / Telegram`

## 1. Source Retrieval Agent

The Source Retrieval Agent receives the requested word and finds a real source sentence before any tutoring data is generated.

Responsibilities:

- receive the user word and language settings
- search authentic sources with Tavily Search API
- reuse a previously verified saved source when available
- verify that the retrieved sentence really contains the requested word
- return:
  - source name
  - source URL
  - retrieved snippet / verified sentence
  - retrieval status

In the codebase this stage is labeled inside:

- [app/api/agent/search/route.ts](/Users/Admin2/Desktop/web-course/LexiAgent/lexiagent-app/app/api/agent/search/route.ts)
  - `runSourceRetrievalAgent(...)`

## 2. Vocabulary Tutor Agent

The Vocabulary Tutor Agent receives the user word plus the verified retrieved source sentence and enriches it into learning content.

Responsibilities:

- receive the verified source sentence from the Source Retrieval Agent
- call the configured OpenRouter-backed LLM stage for vocabulary tutoring
- generate:
  - phonetic symbol
  - meaning
  - translated example
  - collocations
  - synonyms
  - antonyms

In the codebase this stage is labeled inside:

- [app/api/agent/search/route.ts](/Users/Admin2/Desktop/web-course/LexiAgent/lexiagent-app/app/api/agent/search/route.ts)
  - `runVocabularyTutorAgent(...)`

## 3. Storage

After both agents complete, the final vocabulary entry is saved to Supabase and recorded in the workflow history.

Storage path:

- verified vocabulary entry saved into `vocabulary_entries`
- learning activity recorded in `learning_history`
- workflow state recorded in `agent_runs`

## 4. UI Visibility

The app now displays an **Agent Workflow Trace** so the workflow is visible to reviewers.

Visible locations:

- Search result page after a successful word add/query
- Vocabulary detail area as a collapsible trace section

Relevant files:

- [components/agent-trace.tsx](/Users/Admin2/Desktop/web-course/LexiAgent/lexiagent-app/components/agent-trace.tsx)
- [lib/agent-workflow.ts](/Users/Admin2/Desktop/web-course/LexiAgent/lexiagent-app/lib/agent-workflow.ts)
- [app/search/SearchClient.tsx](/Users/Admin2/Desktop/web-course/LexiAgent/lexiagent-app/app/search/SearchClient.tsx)
- [app/vocabulary/VocabularyClient.tsx](/Users/Admin2/Desktop/web-course/LexiAgent/lexiagent-app/app/vocabulary/VocabularyClient.tsx)
