# Engineering Report

## 1) Architecture Decisions

### Why this stack
- **Frontend:** React + TypeScript + Vite (`frontend/`) for fast iteration, simple state handling, and quick local demos.
- **Backend:** TypeScript on Google Cloud Functions 2nd gen (`backend/src/index.ts`) to keep deployment and ops minimal for a prototype.
- **Content extraction:** `fetch` + `jsdom` + `@mozilla/readability` (`backend/src/extractData/`) to normalize arbitrary article pages into structured text.
- **LLM layer:** Direct Gemini REST call (`backend/src/llm/llm.ts`) with `response_schema` forcing JSON array output (`title`, `rationale`) for predictable UI parsing.

### How the pieces connect
1. User submits a URL in the UI (`frontend/src/components/InputForm/InputForm.tsx`).
2. Frontend sends `POST { url }` to `VITE_API_BASE_URL` (`frontend/src/App.tsx`).
3. Cloud Function validates input, applies CORS handling, and calls `extractData()` (`backend/src/index.ts`).
4. `extractData()` fetches HTML safely, parses metadata/content, and returns `{ url, type, title, description, textContent }`.
5. `buildPrompt()` builds a task prompt with extracted fields and injection warning (`backend/src/llm/prompts/buildPrompt.ts`).
6. `generateWithGemini()` sends system + user prompt to Gemini and returns up to 3 ideas (`backend/src/llm/llm.ts`).
7. Frontend renders title ideas with rationale (`frontend/src/components/TitleIdeas/TitleIdeas.tsx`).

## 2) Prompt Design

### Prompt used
System prompt (`backend/src/llm/prompts/systemPrompt.ts`) focuses on HN-style constraints:
- concise titles (7 words or fewer)
- technical/deadpan tone
- distinct angles
- one-sentence rationale
- optional `Show HN:` format for technical links

User prompt (`backend/src/llm/prompts/buildPrompt.ts`) provides:
- URL, type, current title, description, text content
- explicit warning that extracted content is untrusted
- task: generate **three** HN title proposals + rationale

### Reasoning
- I split prompt responsibilities: **system prompt** defines enduring style rules, **built prompt** injects request-specific content.
- I included prompt-injection resistance explicitly in the user prompt because scraped pages are adversarial by default.
- I enforced JSON output via API schema instead of relying only on prompt wording, reducing parser failures.

### What makes a good HN title
- Concrete and specific (what was built/found, not vague hype).
- Short and scannable (quick to parse in a dense feed).
- Technically legible (signals substance to HN readers).
- Curiosity without clickbait (invites discussion, avoids marketing tone).
- Correct format for context (`Show HN:` when showcasing a project/tool).

## 3) Trade-offs

### Corners cut for prototype
- Single hardcoded model/provider (`gemini-2.5-flash`), no model routing.
- No retries/backoff/circuit breaker around LLM API calls.
- Limited scraping robustness (no JS-rendering fallback for dynamic sites).
- Basic SSRF protections only; URL validation is not fully comprehensive.
- Open CORS (`*`), no auth, no rate limiting, no abuse controls.
- Minimal observability (console logs, no structured tracing/metrics).
- `fetchUrl()` can fall back to empty HTML on some failures, prioritizing continuity over quality.

### How I would harden for production
1. Add auth + per-user rate limiting + quota enforcement.
2. Strengthen SSRF defenses (DNS/IP resolution checks, IPv6/private range blocking, allow/deny policies).
3. Implement retry/backoff and timeout budgets for external calls, plus graceful degradation paths.
4. Add rendered-page fallback (headless browser) behind strict resource limits.
5. Improve output contracts with runtime validation (e.g., Zod) and strict response typing end-to-end.
6. Add structured logs, request IDs, metrics dashboards, and alerts.
7. Expand testing to include integration/e2e tests and regression fixtures for tricky URLs.
8. Add caching (URL-content and prompt-result) to reduce latency/cost and smooth traffic spikes.
