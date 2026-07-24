# Pike

Pike is a focused document-research workspace: add source material, ask questions in plain language, and get answers grounded in the most relevant passages. The web app pairs a responsive React interface with an Express API, local in-memory storage, semantic retrieval, and a deliberately capped Gemini integration.

![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-20232A?logo=react)
![License](https://img.shields.io/badge/license-MIT-6b5bd2)

## What makes it useful

- Research-first chat with source relevance shown alongside each answer
- PDF, Markdown, text, DOC, and DOCX ingestion up to 10 MB
- Semantic retrieval across uploaded and auto-acquired material
- LaTeX rendering for inline and block equations
- Light/dark themes and a responsive three-pane workspace
- Server-enforced AI budgets covering chat, embeddings, and generated titles
- Render-ready production deployment

## Quick start

Requirements: Node.js 20+, npm, and a [Google AI Studio API key](https://aistudio.google.com/app/apikey).

```bash
git clone https://github.com/YOUR_USERNAME/pike.git
cd pike
npm install
cp .env.example .env
# Add your GEMINI_API_KEY to .env
npm run dev
```

Open `http://localhost:5000`. Data is currently held in memory, so documents and conversations reset when the server restarts.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | required | Google Generative AI credential |
| `AI_MODEL` | `gemini-3.5-flash-lite` | Chat and title model |
| `AI_REQUESTS_PER_MINUTE` | `10` | Process-wide burst ceiling |
| `AI_REQUESTS_PER_DAY` | `50` | Process-wide daily ceiling (UTC) |
| `PORT` | `5000` | HTTP server port |

The limiter runs immediately before every outbound AI request. It therefore covers more than the chat route: document embeddings and title generation consume the same allowance. When a limit is reached, the API responds with HTTP `429` and a `Retry-After` header. The workspace displays the remaining daily budget.

The counters are intentionally process-local for a simple public demo. For multi-instance production hosting, replace the in-memory counters in `server/services/aiQuota.ts` with a shared Redis-backed limiter so every instance sees one budget.

## Architecture

```text
client/                 React + Vite workspace
  src/components/       Library, conversation, composer, run inspector
server/                 Express API
  services/             Gemini, AI quota, retrieval, document processing
shared/schema.ts        Shared Drizzle/Zod data contracts
```

Request flow:

1. A document is parsed and split into searchable chunks.
2. Pike embeds chunks and stores them in the local vector store.
3. A question retrieves the closest chunks and assembles grounded context.
4. The quota guard reserves one outbound request.
5. Gemini 3.5 Flash-Lite produces an answer; Pike stores it with source metadata.

## Development

```bash
npm run dev          # Express API + Vite middleware
npm run check        # TypeScript validation
npm run build        # Production client and server build
npm run start        # Run the production build
```

## Deployment

Pike cannot run as a functional bot on GitHub Pages. Pages only hosts static files, while Pike requires the Express server for API-key protection, Gemini requests, document parsing, and in-memory storage. Never put `GEMINI_API_KEY` into Vite client variables or browser code.

Deploy the full repository to a Node.js host instead:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Required secret: `GEMINI_API_KEY`
- Optional variables: `AI_MODEL`, `PORT`, `AI_REQUESTS_PER_MINUTE`, `AI_REQUESTS_PER_DAY`
- Health check: `/api/stats`

### Render

The included `render.yaml` is ready for a Render Blueprint deployment. Push the repository to GitHub, create a new Blueprint from it in Render, and enter `GEMINI_API_KEY` when prompted. Render supplies `PORT` automatically and deploys future pushes.

Static-only hosts such as GitHub Pages cannot safely run the bot unless the Express API is deployed separately and the client is reconfigured to call it.

The checked-in `.env.example` contains placeholders only. Copy it to `.env` for local development; `.env` and `.env.*` are ignored by Git, except for `.env.example`.

Before publishing, do not commit `.env` or API keys. Set the environment variables in your hosting provider, keep the public daily limit conservative, and rotate any credential that has previously been committed.

## API overview

- `GET /api/documents` — list the current library
- `POST /api/documents/upload` — ingest one supported document
- `DELETE /api/documents/:id` — remove a document
- `POST /api/documents/auto-acquire` — gather web material for a query
- `GET /api/sessions/:id/messages` — read a conversation
- `POST /api/sessions/:id/messages` — retrieve context and answer
- `POST /api/search` — semantic library search
- `GET /api/stats` — document, model, and quota status

## Security notes

This repository is suitable as a personal demo baseline, not a multi-tenant service. Before accepting untrusted public traffic, add authentication, persistent storage, a distributed rate limiter, stricter URL controls for web acquisition, and deployment-level request/body limits.

## License

MIT
