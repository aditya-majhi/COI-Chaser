# COI Compliance Agent

COI Compliance Agent is an operational system for vendor insurance compliance. Its core promise is: **Keep every vendor insured, compliant, and cleared to work.**

This repository is intentionally being built in phases. Phase 1 established the independent application boundaries and integration foundations. Phase 2 added the Supabase domain schema, seed template, RLS policies, and authentication helpers. Phases 3 and 4 now provide organization-scoped vendor and requirement APIs plus the guarded COI case state machine and event history.

## Repository Layout

```text
frontend/   React + TypeScript + Vite + Tailwind client
backend/    Node.js + Express + TypeScript REST API
agent/      Isolated Python exception decision service using OpenAI
lambdas/    AWS Lambda placeholders for inbound email and scheduled work
supabase/   Database migration boundary (Phase 2)
docs/       Architecture documentation
```

The frontend and backend are separate applications with separate `package.json` files. The frontend communicates with the backend over REST. Express owns business logic and server-side integrations; the browser never receives service-role or AWS credentials.

## Phase 1 Setup

Prerequisites: Node.js 20+ and npm.

1. Copy `frontend/.env.example` to `frontend/.env.local` and provide the public Supabase URL and anon key.
2. Copy `backend/.env.example` to `backend/.env` and provide the Supabase URL, anon key, and service-role key.
3. Install and run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

4. In another terminal, install and run the API:

```powershell
cd backend
npm install
npm run dev
```

The Vite client runs at `http://localhost:5173`. The API health endpoint is `http://localhost:3000/api/health`.

## Security Boundaries

- Supabase Auth JWTs are verified by Express for protected routes.
- The frontend uses only `VITE_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`, AWS credentials, and agent secrets stay server-side.
- Environment files containing secrets are ignored by git.

## Phase 2

Phase 2 includes the initial Supabase migration, organization membership model, organization-scoped Row Level Security, the standard MVP requirement template, frontend Supabase Auth helpers, and Express JWT verification. Apply the database setup from [supabase/README.md](supabase/README.md).

## Phases 3 and 4

The Express API now provides:

- `GET/POST /api/vendors`
- `GET/PATCH /api/vendors/:id`
- `PUT /api/vendors/:id/requirements`
- `POST /api/vendors/:id/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/transition`
- `GET /api/cases/:id/events`

Protected vendor and case routes require both a Supabase bearer token and `X-Organization-Id`. Case status changes are validated by the backend transition map and recorded as immutable case events.

## Phases 5 and 7

Manual evidence upload is available through `POST /api/cases/:id/documents` as multipart form data with a `file` field. Only PDFs up to 10 MB are accepted. Files are stored privately in the `coi-documents` Supabase Storage bucket and document metadata is recorded in `documents`.

Deterministic compliance rechecks are available through `POST /api/cases/:id/recheck`. The backend normalizes limits such as `$1,000,000`, `1M`, and `1000000`, evaluates the MVP requirements, persists individual checks, and returns `PASS`, `FAIL`, or `REVIEW` results. Missing or low-confidence critical evidence never clears automatically.

## Phases 6 and 8

OpenAI extraction is available through `POST /api/:caseId/documents/:documentId/extract`. The backend downloads the private PDF, sends it to the configured OpenAI model as an input file, and stores strict structured insurance JSON. Configure `OPENAI_API_KEY` and `OPENAI_MODEL_ID` in the backend environment.

The frontend now provides an operational dashboard with vendor totals, cleared/agent-handling/attention counts, vendor queue status, and refresh behavior. Set `VITE_ORGANIZATION_ID` alongside the authenticated Supabase configuration to load an organization queue.

## Phases 9 and 10

`POST /api/cases/:id/request` sends a case-specific SES request with the case address in `Reply-To`, records the outbound message, sets the request deadline, and moves the case to `WAITING_FOR_DOCUMENT`.

The inbound Lambda parses SES raw mail from S3, extracts PDF attachments, and calls the protected `/api/inbound/email` endpoint. Provider message IDs make inbound processing idempotent; the backend associates replies through the case-specific recipient address.

Scheduled follow-ups and agent execution remain deferred to later phases. The exception agent uses the same OpenAI provider with its own service boundary.

## Phases 11 and 12

The isolated Python exception decision service exposes `/health` and authenticated `/decide` endpoints. It is built using the **AWS Strands Agents SDK** (`strands.Agent`) with a custom model provider for Google Gemini (`GeminiStrandsModel`). When invoked, the Strands Agent evaluates the compliance exception within bounded operational safety boundaries and returns structured next actions (`REQUEST_CORRECTION` or `HUMAN_REVIEW`). If Gemini is unavailable, it uses a deterministic fallback. It never receives database or SES credentials.

Express exposes `POST /api/cases/:id/resolve` for exception handling. Express validates the organization, claims an idempotent `agent_actions` record, executes only the returned correction or human-review action, sends correction email when appropriate, transitions the case, and records audit events. The agent stops after a deadline or three follow-ups.

## Phases 13 and 14

Scheduled processing is available through the internal `POST /api/internal/followups/run` endpoint used by the EventBridge Lambda. It checks due cases, sends no more than three automated reminders, and escalates unanswered work to `HUMAN_REVIEW`.

Human review is available through `POST /api/cases/:id/human-review` with `REQUEST_MORE_EVIDENCE`, `REJECT`, or `APPROVE_EXCEPTION`. Every decision includes the authenticated user and optional note in the case event log. Only a human can approve an exception; the agent cannot waive requirements.

The core workflow implementation is complete. Remaining work is synthetic demo data/documents and broader integration/demo testing.
