# Kafka Hybrid RAG – React Frontend

A small React page for demoing the [Spring Boot hybrid RAG service](https://github.com/mr-mtd/springboot_hybrid_RAG).

The backend holds **1,000 Kafka questions and answers** in a **Qdrant** vector database. Each question you ask runs a **hybrid query** (BM25 keyword search plus semantic vector search, fused with Reciprocal Rank Fusion), and the top matches are passed to an LLM that writes a grounded answer. This frontend lets you type a Kafka question, sends it to the backend's `/api/ask` endpoint, and shows the answer along with the source questions it was built from.

## Prerequisites

- **Node.js 20.19+ or 22.12+** (required by Vite 8). Check with `node -v`.
- npm (bundled with Node).
- The Spring Boot backend running locally on port 8080, or a deployed copy you can point at (see below).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 and ask a question about Kafka.

### Pointing at a different backend

The backend does not enable CORS, so the browser never calls it directly. The Vite dev server proxies every `/api` request to the backend instead. By default it proxies to `http://localhost:8080`. To use another backend, copy `.env.example` to `.env` and set `VITE_API_TARGET`:

```bash
cp .env.example .env
# then edit .env, e.g.
# VITE_API_TARGET=https://your-backend.example.com
```

Restart `npm run dev` after changing `.env`.

### Production build

```bash
npm run build     # outputs static files to dist/
npm run preview   # serves dist/ on http://localhost:4173 with the same /api proxy
```

If you host `dist/` somewhere else, serve it behind a reverse proxy that forwards `/api` to the backend, or enable CORS on the backend for the frontend's origin.

## API contract

`POST /api/ask`

```json
{ "question": "How do I guarantee message ordering in Kafka?" }
```

Response:

```json
{
  "answer": "Kafka only guarantees ordering within a partition [Source 1] ...",
  "sources": [{ "id": "101", "question": "Does Kafka guarantee message order across partitions?" }]
}
```

The question must be non-blank and at most 4,000 characters.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | The page: intro, question form, example questions, answer and sources. |
| `src/api.js` | `fetch` wrapper for `POST /api/ask`. |
| `src/index.css` | Styles, with automatic light and dark themes. |
| `vite.config.js` | Vite config and the `/api` proxy. |
