# Kafka Hybrid RAG – React Frontend
[![Build](https://github.com/mr-mtd/react_hybrid_RAG_frontend/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/mr-mtd/react_hybrid_RAG_frontend/actions/workflows/build.yml)
[![Deploy](https://github.com/mr-mtd/react_hybrid_RAG_frontend/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/mr-mtd/react_hybrid_RAG_frontend/actions/workflows/deploy.yml)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?logo=amazonwebservices&logoColor=white)

A small React page for demoing the [Spring Boot hybrid RAG service](https://github.com/mr-mtd/springboot_hybrid_RAG).

The backend holds **1,000 Kafka questions and answers** in a **Qdrant** vector database. Each question you ask runs a **hybrid query** (BM25 keyword search plus semantic vector search, fused with Reciprocal Rank Fusion), and the top matches are passed to an LLM that writes a grounded answer. This frontend lets you type a Kafka question, sends it to the backend's `/api/ask` endpoint, and shows the answer along with the source questions it was built from.

## Prerequisites

- **Node.js 20.19+ or 22.12+** (required by Vite 8). Check with `node -v`.
- npm (bundled with Node).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 and ask a question about Kafka. By default the dev server talks to the hosted backend at `https://hybrid-rag.9jn1qt7414py4.us-east-2.cs.amazonlightsail.com`.

## Configuration

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_TARGET` | `npm run dev`, `npm run preview` | the Lightsail backend | Where the Vite server proxies `/api` requests. Set to `http://localhost:8080` to use a backend running on your machine. |
| `VITE_API_BASE_URL` | `npm run build` | empty | Backend URL baked into the production build. Empty means the app calls `/api` on its own origin. |

Copy `.env.example` to `.env` to set these locally, then restart the dev server.

### CORS

The backend does not enable CORS. In development that doesn't matter, because the browser only talks to the Vite server and Vite forwards `/api` to the backend. A production build that calls the backend URL directly from another origin will be blocked by the browser until one of these is in place:

1. **Enable CORS on the backend** for the frontend's origin (for example a `WebMvcConfigurer` that allows `POST /api/**` from the deployed site). Then set `VITE_API_BASE_URL` to the backend URL.
2. **Serve both from one origin**, for example a CloudFront distribution with the static site as the default origin and an `/api/*` behaviour pointing at Lightsail. Then leave `VITE_API_BASE_URL` empty. **This is what the deployed site uses.**

## Continuous integration

`.github/workflows/build.yml` runs on pushes and pull requests to `main` and `feature/dev`. It installs dependencies with `npm ci`, runs `npm run build`, and uploads `dist/` as a build artifact.

The build reads `VITE_API_BASE_URL` from an optional **repository variable** (*Settings → Secrets and variables → Actions → Variables*). Leave it unset: the deployed site is served from the same origin as the API (see [Deployment](#deployment)), so the app calls `/api` on its own origin.

### Production build locally

```bash
npm run build     # outputs static files to dist/
npm run preview   # serves dist/ on http://localhost:4173 with the same /api proxy
```

## Deployment

The site is live at **https://dzo4l1wjzweva.cloudfront.net**.

```
browser ──► CloudFront ──┬─ /*      ──► S3 bucket (private, Origin Access Control)
                         └─ /api/*  ──► Lightsail backend (no caching, POST allowed)
```

- **S3** holds the built `dist/` files. The bucket blocks all public access; only this CloudFront distribution can read it.
- **CloudFront** serves the site over HTTPS and forwards `/api/*` to the Spring Boot backend on Lightsail. Because the browser sees a single origin, the backend needs no CORS configuration.

`.github/workflows/deploy.yml` runs on every push to `main` (and on demand from the Actions tab). It builds the app, syncs `dist/` to S3 (fingerprinted assets cached for a year, `index.html` always revalidated), and invalidates the CloudFront cache.

### AWS access without stored keys

The workflow authenticates with **GitHub OIDC** instead of long-lived access keys:

1. GitHub issues the job a short-lived signed token (`permissions: id-token: write`).
2. `aws-actions/configure-aws-credentials` exchanges it with AWS STS for temporary credentials of the IAM role `github-actions-hybrid-rag-frontend-deploy`.
3. The role's **trust policy** only accepts tokens whose `aud` is `sts.amazonaws.com` and whose `sub` is `repo:mr-mtd/react_hybrid_RAG_frontend:ref:refs/heads/main`, so forks, pull requests and other branches can't assume it.
4. The role's **permissions policy** allows only `s3:ListBucket`, `s3:PutObject` and `s3:DeleteObject` on the site bucket, and `cloudfront:CreateInvalidation` on this one distribution.

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
| `.github/workflows/build.yml` | CI build. |
