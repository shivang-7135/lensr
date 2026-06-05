# Lensr — Python Agent Backend

LangGraph + LangChain agent service that powers the Lensr frontend.

- **LLM**: AWS Bedrock (Claude 3.5 Sonnet, Claude 3 Haiku)
- **Search**: Serper.dev (real Google SERPs as JSON)
- **Graph**: LangGraph `StateGraph` per intent + a top-level router
- **API**: FastAPI with Server-Sent Events streaming

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # fill in your values
uvicorn app.main:app --reload --port 8000
```

Then in the Lovable project set the secret:

- `BACKEND_BASE_URL` = `http://localhost:8000` (or your deployed URL)
- `BACKEND_SHARED_SECRET` = a long random string (must match `BACKEND_SHARED_SECRET` in `.env`)

The frontend route `src/routes/api/search.ts` proxies SSE from this service. If `BACKEND_BASE_URL` is unset, the frontend falls back to a mock agent using the Lovable AI Gateway so the UI keeps working.

## Endpoints

- `POST /search` — JSON `{ "query": string, "intent_hint"?: string }` → `text/event-stream`. Events:
  - `intent_detected` `{intent, entities}`
  - `tool_call` / `tool_result`
  - `partial_answer` `{delta}`
  - `final` `{markdown, sources, intent}`
  - `error` `{message}`
- `GET /healthz`

## Architecture

```
              ┌──► shopping_graph ──┐
classify ─────┤                     ├──► format ──► stream
              ├──► price_graph ─────┤
              ├──► trip_graph ──────┤
              ├──► insta_graph ─────┤
              └──► general_graph ───┘
```

Each per-intent graph is a `StateGraph` with nodes: `search → extract → reason → answer`, max-iteration guard, and retries.

## Layout

```
app/
  main.py              FastAPI + SSE
  config.py            env / model IDs
  llm.py               Bedrock ChatBedrockConverse
  router_graph.py      classify → dispatch
  agents/
    shopping.py
    price_history.py
    trip.py
    insta.py
    general.py
  tools/
    serper.py
    scraper.py
    price_store.py
    bedrock_vision.py
    places.py
  schemas.py
  cache.py
```

## Deploy

Recommended: AWS App Runner or ECS Fargate (close to Bedrock; IAM roles instead of static keys). Fly.io and Render also work — set the env vars and expose port 8000.

A `Dockerfile` is included; build with `docker build -t lensr-backend .`.

## Env vars

See `.env.example`. The important ones:

- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or IAM role)
- `BEDROCK_MODEL_REASONING` — e.g. `anthropic.claude-3-5-sonnet-20241022-v2:0`
- `BEDROCK_MODEL_ROUTER` — e.g. `anthropic.claude-3-haiku-20240307-v1:0`
- `BEDROCK_MODEL_VISION` — e.g. `anthropic.claude-3-5-sonnet-20241022-v2:0`
- `SERPER_API_KEY` — https://serper.dev
- `DATABASE_URL` — Postgres for price history
- `BACKEND_SHARED_SECRET` — must match the secret you set in Lovable
