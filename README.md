```markdown
# Legal Metrology AI Inspection Backend

Backend for the SIH-26 Legal Metrology Compliance Application (Problem Statement 34: Department of Consumer Affairs). Provides officer authentication, multi-panel package image ingestion via Cloudflare R2, an automated Vision AI pipeline for statutory declaration extraction, a RAG pipeline for semantic Legal Metrology (PCR 2011) rule retrieval, a compliance verdict engine, and statutory audit certificate generation.

## Status

| Phase | Status | Purpose |
|---|---|---|
| 0 | ✅ Complete | Database schema & statutory requirements finalized |
| 1 | ✅ Complete | Auth foundation — FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT |
| 2 | ✅ Complete | Image upload, Cloudflare R2 storage, inspection CRUD |
| 3 | ✅ Complete | Legal Metrology RAG pipeline & semantic rule retrieval (pgvector) |
| 4 | ✅ Complete | Vision AI package declaration extraction (Gemini Vision) |
| 5 | ✅ Complete | Compliance verdict engine using extracted declarations + PCR 2011 rules |
| 6 | ✅ Complete | Statutory PDF Audit Certificate generation (`jspdf`, `jspdf-autotable`)[cite: 1] |
| 7 | ⏳ In Progress | Human-in-the-loop manual review, declaration overrides & recalculation |
| 8 | 📋 Planned | Search, multi-criteria filtering, pagination & bulk warehouse audits |
| 9 | 📋 Planned | Production hardening, rate-limiting & automated export dossiers |

## Tech Stack

Python 3.12+ · FastAPI · Uvicorn · PostgreSQL 16 + pgvector · SQLAlchemy · Alembic · Pydantic v2 · JWT (Argon2/Passlib) · Cloudflare R2 (boto3) · Google Gemini 1.5 Pro / Flash · jsPDF + jsPDF-AutoTable · pytest

## Architecture

```text
Frontend (React + TypeScript)
    │
    ├── Presigned Direct Upload (Cloudflare R2)
    │
    ▼
FastAPI Backend Gateway
    │
    ├── Auth & Officer Access Control (JWT / Argon2)
    │     └── PostgreSQL (officers, users)
    │
    └── Inspection Service Pipeline
          │
          ├── Relational & Vector Persistence (PostgreSQL + pgvector)
          │     ├── inspections
          │     ├── inspection_images (presigned view URLs)
          │     ├── inspection_extractions (JSONB declarations)
          │     ├── compliance_verdicts (statutory category outcomes)
          │     └── rules_chunks (52 legal embeddings)
          │
          ├── Vision AI Engine (Gemini Vision)
          │     └── Extracts Rule 6 mandatory declarations (MRP, USP, Net Qty, Dates)
          │
          ├── RAG Semantic Engine (pgvector Cosine Search)
          │     └── Matches declarations against PCR 2011 clauses (Rules 6, 9, 12, 18, 29)
          │
          ├── Compliance Verdict Engine
          │     └── PASS / ISSUE / NON-COMPLIANT determinations
          │
          └── Statutory Export Engine
                └── Client-orchestrated legal certificate with physical photo exhibits[cite: 1, 2]

```

---

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/` | Root health & status indicator |
| GET | `/health` | Core database and storage health check |
| POST | `/auth/register` | Register an enforcement officer |
| POST | `/auth/login` | Authenticate officer and issue JWT token |
| GET | `/auth/me` | Retrieve profile of authenticated officer |
| POST | `/inspections/presigned-url` | Issue Cloudflare R2 presigned PUT upload URL |
| POST | `/inspections` | Initialize inspection dossier and link panel images |
| GET | `/inspections` | List officer's inspections with pagination (`skip`, `limit`) |
| GET | `/inspections/{id}` | Fetch full inspection dossier (images, extractions, verdicts) |
| POST | `/rag/query` | Query Legal Metrology chunks via vector similarity |
| POST | `/inspections/{id}/extract` | Run Vision AI extraction on all uploaded panels |
| POST | `/inspections/{id}/verdict` | Evaluate declarations against PCR 2011 rule criteria |
| PATCH | `/inspections/{id}/override` | *(Phase 7)* Officer manual edit of declarations/verdicts |

---

## Completed Phases Overview

### Phase 1 to 5: Ingestion, Extraction & Rule Reasoning

* **Direct-to-Object Ingestion:** Direct PUT binary streaming to Cloudflare R2 with side designations (`front`, `back`, `left`, `right`, `top`, `bottom`).
* **Vision AI Rule 6 Parsing:** Gemini-backed JSON parsing of statutory values (`mrp`, `net_quantity`, `generic_name`, `manufacturer_address`, `unit_sale_price`, `consumer_care`, etc.).
* **RAG Legal Retrieval:** 52 statutory chunks covering the Legal Metrology Act, 2009 and Packaged Commodities Rules (PCR), 2011 embedded via `gemini-embedding-001` (1536-d) in pgvector.
* **Traceable Verdict Engine:** Automated evaluation returning category outcomes, statutory reasoning, and exact rule references.
* **Full Relation Persistence:** Fixed relational loading to ensure `extractions` and `verdicts` are returned inside `GET /inspections/{id}` across browser sessions.

### Phase 6: Statutory PDF Report Generation ✅

A formal legal audit certificate generator compliant with SIH Problem Statement 34 (Department of Consumer Affairs):

* **Statutory Layout:** Times New Roman hierarchy, double-rule national framing, and Ministry of Consumer Affairs title blocks.


* **Table I (Rule 6 Declarations):** Side-by-side analysis of detected package values versus statutory requirements, marking discrepancies as `Declared` or `Missing`.


* **Table II (Rule Determination):** Category-by-category finding (`COMPLIANT` vs `VIOLATION`) accompanied by statutory citations (Rules 6, 9, 12, and 18).


* **Section III (Photographic Exhibits):** Embeds package photos (`EXHIBIT A`, `EXHIBIT B`, etc.) sourced from DOM canvas cache and presigned URLs onto dedicated exhibit sheets.


* **Section IV (Legal Notice & Attestation):** Notice under **Section 36 of the Legal Metrology Act, 2009** with sign-off blocks for the Verifying Inspector and Controller of Legal Metrology.



---

## Remaining Roadmap (Phase-Wise)

### Phase 7: Officer Review & Declaration Overrides (Human-in-the-Loop) ⏳

Enable field officers to correct inaccuracies caused by low-contrast labels, worn ink, or packaging folds:

* [ ] Create `PATCH /inspections/{id}/override` endpoint to modify specific declaration keys.
* [ ] Build editable table state on the frontend declarations panel.
* [ ] Add mandatory `officer_remark` field for audit trail recording when changing an AI determination.
* [ ] Implement automated re-verdict evaluation: recalculate the compliance score immediately after an officer overrides a value.

### Phase 8: Search, Multi-Criteria Filtering & Batch Audits 📋

Equip state enforcement teams to manage high-volume warehouse audits:

* [ ] Implement full-text search across `product_name`, `manufacturer_hint`, and `batch_number`.
* [ ] Add filtering by status (`COMPLIANT`, `NON_COMPLIANT`, `PENDING_REVIEW`) and inspection date range.
* [ ] Implement frontend pagination controls wired to backend `skip` and `limit`.
* [ ] Build multi-pack batch ingestion workflow for inspecting product runs concurrently.

### Phase 9: Production Hardening & Security 📋

Prepare application infrastructure for nationwide deployment:

* [ ] Add B-tree and composite database indexes on `inspections(officer_id, status, created_at)`.
* [ ] Configure automatic expiration handling and token refreshing for Cloudflare R2 presigned URLs.
* [ ] Implement token-bucket rate limiting on AI inference endpoints to guard against API quota exhaustion.
* [ ] Set up continuous automated evaluation against standard reference package datasets.

---

## Setup & Local Development

### 1. Prerequisites

* Python 3.12+
* PostgreSQL with `pgvector` and `uuid-ossp` extensions enabled
* Cloudflare R2 bucket credentials
* Google Gemini API Key

### 2. Environment Setup

```bash
# Clone and enter backend
cd backend

# Create virtual environment (Windows)
py -3.12 -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

```

Ensure `.env` contains:

```env
DATABASE_URL=postgresql+psycopg2://postgres:PASSWORD@localhost:5432/legal_metrology
JWT_SECRET=your_super_secret_jwt_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

R2_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=legal-metrology-inspections

AI_API_KEY=your_google_gemini_api_key

```

### 3. Database Initialization & Rule Ingestion

```bash
# Run database migrations
alembic upgrade head

# Ingest PCR 2011 rule chunks and embeddings into pgvector
python -m scripts.ingest_rules

```

### 4. Run Application

```bash
# Start development server
uvicorn app.main:app --reload --port 8000

```

Interactive API documentation will be available at `http://127.0.0.1:8000/docs`.

```

```
