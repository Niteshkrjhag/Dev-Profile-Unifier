# Effiflo Dev Profile Unifier 🚀

A high-performance asynchronous API designed to ingest, resolve, and unify a software developer's footprint across multiple fragmented platforms (GitHub, StackOverflow, Dev.to, and HackerNews). 

Built as a take-home assessment for the AI Data Engineer role at Effiflo.

## 🏗 Architecture & Design Decisions

### 1. The Entity Resolution Engine (Tiered Approach)
The core difficulty of Master Data Management (MDM) is determining when two profiles belong to the same human. We solve this using a tiered deterministic-to-heuristic funnel:
*   **Tier 1 (Explicit Anchor):** If a user provides an exact handle for a platform in the payload, we trust it as a 1.0 confidence match.
*   **Tier 2 (Cross-Pollination):** (Planned) Checking if a GitHub repo links to a specific Twitter or Dev.to handle.
*   **Tier 3 (Heuristic Overlaps):** (Planned) Hardcoded string distancing on names, locations, and intersecting tech stacks.
*   **Tier 4 (LLM Tie-Breaker):** We pass the raw JSON of an ambiguous profile against our anchor profile to `Gemini 3.5 Flash`. Gemini acts as a semantic judge, analyzing nuanced signals like repo contributions, writing style, and language frequencies.

### 2. Disambiguation Strategy (Approach 2)
What happens if the LLM is only 60% sure? Rather than silently merging (creating false positives) or silently dropping (creating false negatives), we implement an HTTP `300 Multiple Choices` pattern.
If `confidence < 0.85` but `>= 0.50`, the API halts the merge, flags the link as `pending_review` in the database, and returns the ambiguous candidates to the client. This allows a Human-in-the-Loop (HITL) or frontend user to manually click "Yes, this is me."

### 3. Data Ingestion (Fully Asynchronous)
The fetcher layer uses `httpx` and `asyncio.gather` to hit all 4 APIs simultaneously. What would normally take 4-5 seconds of sequential blocking I/O now resolves in `< 1.5 seconds` bounded only by the slowest API (usually StackOverflow).

### 4. Storage (Supabase & RLS)
The system uses Supabase Postgres with a strict 3-table schema:
1.  `raw_profiles`: Untouched JSON dumps from the platforms (Event Sourcing pattern).
2.  `canonical_entities`: The resolved "Human" identity containing an LLM-generated executive summary.
3.  `entity_links`: The junction table storing the confidence score and status (`confirmed`, `pending_review`).
**Security Note:** The API requires the `service_role` (Secret) API key to bypass Row-Level Security when performing backend ingestion.

## 🚀 Running Locally

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
```
SUPABASE_URL=your_url
SUPABASE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
GITHUB_TOKEN=optional_github_token
STACK_EXCHANGE_KEY=optional_so_key
DEVTO_API_KEY=optional_devto_key
```

3. Run the FastAPI Server:
```bash
uvicorn src.api.main:app --reload
```

## 🌐 Deployment (Render)
This repository contains a `render.yaml` file for zero-config Infrastructure-as-Code deployment on Render's free tier. 

## 🔮 Future Scaling Priorities
If this were to scale to 1 million developers, the following bottlenecks would need addressing:
1.  **Rate Limit Exhaustion:** Implement Redis-backed circuit breakers and a distributed proxy pool to cycle outbound IP addresses.
2.  **LLM Cost/Latency:** Replace the Gemini tie-breaker with a fine-tuned open-weight model (e.g., Llama 3 8B) deployed on Groq or a dedicated vLLM instance to bring resolution costs near zero.
3.  **Background Processing:** Move the ingestion layer out of the HTTP request cycle entirely. The `POST /resolve` endpoint should publish an event to a Kafka/RabbitMQ queue and return a `202 Accepted` with a Job ID for the client to poll.
