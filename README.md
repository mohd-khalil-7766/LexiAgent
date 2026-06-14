# LexiAgent

LexiAgent is a Next.js vocabulary learning project that combines:

- real-source retrieval with Tavily Search API
- AI tutoring through OpenRouter
- Supabase storage
- review, quiz, audio, analytics, and story-building pages

## Requirements

- Node.js 20 or later is recommended
- npm
- Supabase project
- Tavily API access
- OpenRouter API access

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Start the production server locally:

```bash
npm start
```

## Required Environment Variables

Add these environment variables in your local `.env.local` file and in Vercel Project Settings.

Use your own values. Do not commit secrets.

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_service_key
TAVILY_API_KEY=your_tavily_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=your_openrouter_model
```

## Vercel Deployment

This project can be deployed to Vercel as a standard Next.js app.

### 1. Push the project to GitHub

Commit the code and push it to a GitHub repository.

### 2. Import the repository in Vercel

- Open Vercel
- Click `Add New...`
- Choose `Project`
- Import the GitHub repository for this app

### 3. Configure the framework

Vercel should detect this project automatically as:

- Framework Preset: `Next.js`

Default build settings are appropriate:

- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: leave default

### 4. Add Environment Variables in Vercel

In Vercel Project Settings -> Environment Variables, add:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `TAVILY_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

Do not paste example or public template keys into production.

### 5. Deploy

After saving the variables, trigger the deployment.

## Deployment Notes

- The project uses relative internal API calls from the frontend such as `/api/agent/search`, which is correct for Vercel deployment.
- I did not find hardcoded localhost URLs in the application code.
- The server routes call external services directly:
  - Tavily Search API
  - OpenRouter API
  - Wikipedia summary API
- Supabase access is handled with a server-side admin client, so the required server environment variables must be present in Vercel.

## Git Ignore and Secrets

The project `.gitignore` already excludes:

- `.env`
- `.env.local`
- other `.env*` files
- `.vercel`

It also keeps `.env.example` tracked intentionally as a template.

## Production Verification

Recommended verification after deployment:

- Open `/dashboard`
- Test `/search` with a word lookup
- Confirm `/vocabulary` loads saved entries
- Confirm `/quiz`, `/audio-review`, and `/story` load normally
- Confirm API routes work with the configured Vercel environment variables
