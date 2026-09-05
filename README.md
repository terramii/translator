# Dịch bèo 🦄

A Vietnamese–English learning website with a playful, flat notebook interface. Translate sentences in either language, then hover over words to understand what they mean **in that sentence**.

## Features

- Automatic Vietnamese/English detection and two-way sentence translation.
- Gemini-powered contextual explanations, including idioms, collocations, and phrases such as **so much**.
- Hover or keyboard-focus a word to preview its meaning; click to pin its info panel. Press Escape to dismiss it.
- Blue hover highlights and purple pinned-word highlights, with the interpreted phrase highlighted in its sentence.
- Vietnamese explanations, usage notes, bilingual examples, pronunciation playback, and copy controls.
- Local vocabulary and grammar datasets for reference and limited offline fallback.
- Responsive blue notebook styling with clouds, unicorn accents, pink headers, and yellow direction controls.

## Requirements

- Node.js **22.9+** (Node.js 24 recommended) and npm.
- A Gemini API key for contextual word analysis.
- Internet access for Gemini and online sentence translation.

## Local setup

```sh
git clone https://github.com/terramii/translator.git
cd translator
npm install
```

Copy `.env.example` to `.env`:

```powershell
# PowerShell
Copy-Item .env.example .env
```

```sh
# macOS / Linux
cp .env.example .env
```

Set these values in `.env`:

```dotenv
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Keep it in the root `.env`, never in frontend code or a `VITE_` variable. `.env` is excluded from Git. Restart the server after changing it. API availability and usage limits depend on your provider account.

Start development:

```sh
npm run dev
```

Open **http://localhost:3000**. Vite serves the frontend and backend API together.

## Build and run locally

```sh
npm run build
npm start
```

The Node server serves `dist/` and the API at port 3000. Set `PORT` to change the production server port. This app needs its backend; hosting only the static `dist/` files will not provide translation or contextual lookups.

## How contextual lookup works

The frontend sends the full sentence, selected word, language, and exact UTF-16 selection offsets to `POST /api/word/context`. Gemini identifies the relevant phrase and returns its contextual meaning, grammatical role, usage, and examples as structured JSON. The backend validates the response and verifies that the phrase contains the selected occurrence.

For example, **so** in “Thank you so much” is an intensifier, while **so** in “It was raining, so I stayed home” expresses a result. Caches include sentence and selection position so these senses are not mixed up.

If Gemini is unavailable or no key is configured, the UI explicitly says contextual analysis is unavailable. Any local dictionary entry is shown separately as a **general reference**, not as a confirmed contextual meaning. Model explanations can still be imperfect.

Implementation reference: [Gemini generateContent API](https://ai.google.dev/api/generate-content).

## Sentence translation and local fallback

Sentence translation tries a public Google translation endpoint, then MyMemory. These services may rate-limit or become unavailable. If both fail, the backend checks matching words and example sentences in:

- `data/vn_english_learning_db.json`: vocabulary, Vietnamese usage notes, and bilingual examples.
- `data/english_grammar_for_vietnamese_db.json`: grammar topics, structures, and bilingual example sentences.

Offline coverage is limited to matching dataset entries. Unmatched sentences return an error instead of a guessed word-by-word translation. The datasets also provide general reference material for contextual analysis.

## Project structure

```text
frontend/
  index.html
  src/
    components/        Interface and interactive word panels
    services/          Tokenization and backend requests
    data/              Original bundled dictionary
    App.jsx
    index.css
backend/
  server.js            Production HTTP server
  api.js               Translation and lookup endpoints
  semanticAgent.js     Gemini contextual analysis
  localData.js         Dataset indexes and fallback
  config.js            Server-side environment loading
  *.test.js            Automated tests
data/                  Local bilingual learning datasets
.env.example           Safe configuration template
vite.config.js         Development server and API middleware
```

## API endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/translate` | Translate `{ text, sourceLang, targetLang }`; input limit: 500 characters. |
| `POST /api/word/context` | Analyze `{ word, lang, sentence, start, end }` in context. |
| `GET /api/word?word=...&lang=en` | General dictionary lookup, without contextual interpretation. |

## Verification

```sh
npm test
npm run build
```

Tests cover language detection, text offsets, repeated-word selections, dataset fallback, provider errors, API validation, and contextual request/cache handling. Gemini responses in automated tests are mocked; they verify integration behavior, not model accuracy. Live checks require a configured key.

## Before public deployment

The current server is intended for local use. Add authentication and request rate limits before exposing the Gemini-backed endpoints publicly. Submitted sentences are sent to the configured translation/model providers. Secrets and generated files (`.env`, `node_modules/`, `dist/`) are excluded from version control.
