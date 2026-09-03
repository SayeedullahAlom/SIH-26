# Legal Metrology AI Inspection Backend

Backend for the SIH-26 Legal Metrology Compliance Application. Provides authentication, inspection session management, image ingestion via Cloudflare R2, a RAG pipeline for semantic retrieval of Legal Metrology rules, and a Vision AI pipeline that extracts structured package declarations from inspection images.

## Status

| Phase | Status | Purpose |
|---|---|---|
| 0 | ✅ Complete | Database schema & requirements finalized |
| 1 | ✅ Complete | Auth foundation — FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT |
| 2 | ✅ Complete | Image upload, R2 storage, inspection CRUD |
| 3 | ✅ Complete | Legal Metrology RAG pipeline & semantic rule retrieval |
| 4 | ✅ Complete | Vision AI package declaration extraction |
| 5 | 🚧 Next | Compliance verdict engine |

**Note:** Phase 4 extracts what's visible on a package. It does not assess legal compliance — that's Phase 5.

## Tech Stack

Python 3.12/3.13 · FastAPI · Uvicorn · PostgreSQL 13 + pgvector 0.8.6 · SQLAlchemy · Alembic · Pydantic v2 · JWT (Argon2/Passlib) · Cloudflare R2 (boto3) · pytest

## Architecture

```
Frontend → FastAPI
             ├── Auth/JWT → User DB
             └── Inspection API → PostgreSQL + R2 (images)
                                        │
                                   pgvector (rule embeddings)
                                        │
                              RAG Retrieval (Phase 3)
                                        │
                      Extracted Declarations (Phase 4)
                                        │
                        Compliance Verdict Engine (Phase 5)
```

## Repository Structure

```
SIH-26/backend/
├── .env / .env.example
├── requirements.txt
├── alembic.ini, alembic/
├── tests/
└── app/
    ├── main.py
    ├── api/            # routes_auth, routes_inspections, routes_rag
    ├── auth/deps.py
    ├── db/
    │   ├── session.py
    │   └── services/storage.py
    ├── models/          # user, inspection, inspection_image, declaration, checklist_result, report
    ├── services/        # embedding_service, retrieval_service, rag_service
    └── schemas/         # auth, inspection
```

Routes, business logic, AI/OCR logic, and DB models stay in separate layers.

## Setup

**Prerequisites:** Python 3.12+, PostgreSQL 13 with pgvector, Git

```bash
createdb legal_metrology          # or: CREATE DATABASE legal_metrology;
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` → `.env` and set:

```
DATABASE_URL=postgresql+psycopg2://postgres:PASSWORD@localhost:5432/legal_metrology
JWT_SECRET=...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
R2_ENDPOINT_URL=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
```

Never commit `.env`, DB passwords, JWT secrets, R2 credentials, or AI API keys.

Verify pgvector: `SELECT extversion FROM pg_extension WHERE extname = 'vector';` (expect 0.8.6). If missing: `CREATE EXTENSION vector;`

Run migrations: `alembic upgrade head` — never modify tables manually without a corresponding migration.

Start server (from `backend/`):

```bash
venv\Scripts\activate
uvicorn app.main:app --reload
```

- Server: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Root |
| GET | `/health` | Health check |
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login, receive JWT |
| GET | `/auth/me` | Current authenticated user |
| POST | `/inspections/presigned-url` | Generate R2 upload URL |
| POST | `/inspections` | Create inspection + image records |
| GET | `/inspections` | List officer's inspections |
| POST | `/rag/query` | Query the Legal Metrology RAG pipeline |
| POST | `/inspections/{id}/extract` | Run Vision AI extraction on an inspection |

## Phase 3 — RAG & Rule Retrieval

Legal Metrology rules are chunked, embedded, and stored in `rules_chunks` with pgvector for semantic similarity search.

**Pipeline:** rule text → embedding service → `rules_chunks` (pgvector) → retrieval service (query → nearest chunks) → RAG service (query + context → response) → `POST /rag/query`

Each layer is isolated — the API route only calls the RAG service; embedding/retrieval logic never lives in the route.

## Phase 4 — Vision AI Extraction

Extracts structured package declarations from inspection images. Does **not** determine compliance.

**Pipeline:** inspection images (R2) → `POST /inspections/{id}/extract` → extraction service → Gemini Vision AI → structured JSON → Pydantic validation → `inspection_extractions` (PostgreSQL JSONB)

**Extraction fields:** `product_name`, `generic_name`, `manufacturer_name/address`, `packer_name/address`, `importer_name/address`, `country_of_origin`, `net_quantity(_unit)`, `dimensions`, `mrp`, `unit_sale_price`, `manufacture_date`, `packing_date`, `import_date`, `best_before_or_use_by`, `consumer_care`, `batch_or_lot_number`

Each field carries `value`, `confidence`, and `status` (`visible` / `not_visible` / `illegible`). The model is instructed to return `null` rather than guess.

**Provider:** Google Gemini 3.5 Flash, isolated in `app/services/extraction_service.py` for future replaceability.

**Endpoint behavior (`POST /inspections/{id}/extract`):** authenticates user → verifies inspection ownership → loads images from R2 → sends to Vision AI → validates response → persists to `inspection_extractions` → returns extraction result + ID.

**Storage table** `inspection_extractions`: `id`, `inspection_id`, `extraction_data` (JSONB), `created_at`.

Validated end-to-end on real package photos. One notable fix: `product_name` initially returned extraneous generated text alongside the correct value; prompt was refined to constrain it to the printed product/brand name only. Iterative process: extract → compare against visible package text → log field-level failures → refine prompt → re-test.

## Phase 5 — Compliance Verdict Engine (Next)

Converts Phase 4 extractions + Phase 3 retrieved rules into a verdict: **PASS / ISSUE / REVIEW REQUIRED**.

**Ground rule: the team defines compliance criteria — the AI implements them, never invents them.**

**Workflow:**
1. **Team** — writes plain-language PASS/ISSUE/REVIEW REQUIRED criteria per checklist category.
2. **AI** — combines extracted declaration + RAG-retrieved rule + team criteria into working prompt/code.
3. **Team** — validates verdicts against packages with known correct answers.
4. **Team** — on mismatch, adjusts criteria or requests a prompt/code refinement; re-test.

Repeat 3–4 until acceptable.

**Inputs:** Phase 4 extracted declaration + Phase 3 RAG-retrieved clause + team-defined criteria → verdict → stored, linked to inspection.

**Boundaries — do not:**
- Let the AI invent legal criteria
- Treat the model's general knowledge as a source of Legal Metrology requirements
- Bypass RAG retrieval when a rule is required
- Silently default uncertain cases to PASS or ISSUE
- Treat a successful API response as a successful compliance test
- Call Phase 5 done without validation against known-answer packages

**Definition of done:** criteria defined for every category · verdict engine uses Phase 4 + Phase 3 outputs · criteria explicitly applied · verdicts stored and linked to inspections · API exposes results · known packages tested, mismatches resolved, team sign-off obtained.

## Engineering Principles

1. **Thin routes** — `Route → Service → Specialized Service → DB/External API`
2. **Ownership checks** on every inspection-specific endpoint: `inspection.officer_id == current_user.id`
3. **Traceability** — every decision should trace back to its source image/data
4. **Replaceable providers** — OCR, LLM, embedding, and storage sit behind service interfaces
5. **No manual schema changes** — always go through Alembic

## Testing Strategy

Unit → Service → API → Database → End-to-End
