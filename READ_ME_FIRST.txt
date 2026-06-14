LexiAgent Critical Fix 1

Replace these files in your project:
1. app/page.tsx
2. app/globals.css
3. app/api/agent/search/route.ts

Fixes included:
- Removes demo vocabulary arrays and fake quiz options.
- Quiz options now use verified saved Supabase records only.
- Corrects the CSS media-query nesting that caused unstyled quiz options on desktop.
- Removes OpenRouter structured-output request parameters that blocked free endpoints.
- Adds clearer Tavily/OpenRouter network error messages and retry handling.
- Keeps Arabic support as an optional mode while preserving Chinese as the required demonstration path.

After replacing:
npm run lint
npm run dev

Test first:
word: school
learningLanguage: en
explanationLanguage: zh

Then test optional Arabic:
word: hospital
learningLanguage: en
explanationLanguage: ar

Do not commit .env.local.
