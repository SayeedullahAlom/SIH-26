Legal Metrology AI Inspection Backend

Backend for the SIH-26 Legal Metrology Compliance Application. Provides authentication, inspection session management, image ingestion via Cloudflare R2, a RAG pipeline for semantic retrieval of Legal Metrology rules, a Vision AI pipeline for structured package declaration extraction, and a compliance verdict engine that evaluates extracted declarations against retrieved legal rules.

Status
Phase	Status	Purpose
0	✅ Complete	Database schema & requirements finalized
1	✅ Complete	Auth foundation — FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT
2	✅ Complete	Image upload, R2 storage, inspection CRUD
3	✅ Complete	Legal Metrology RAG pipeline & semantic rule retrieval
4	✅ Complete	Vision AI package declaration extraction
5	✅ Complete	Compliance verdict engine

Phase 4 extracts what is visible on a package. Phase 5 uses those extracted declarations together with retrieved Legal Metrology rules to determine compliance.

Tech Stack

Python 3.12 · FastAPI · Uvicorn · PostgreSQL + pgvector · SQLAlchemy · Alembic · Pydantic v2 · JWT (Argon2/Passlib) · Cloudflare R2 (boto3) · Google Gemini · pytest

Architecture
Frontend
   │
   ▼
FastAPI
   │
   ├── Auth/JWT
   │      └── User DB
   │
   └── Inspection API
          │
          ├── PostgreSQL
          │      ├── Inspections
          │      ├── Inspection Images
          │      ├── Extractions
          │      └── Compliance Verdicts
          │
          └── Cloudflare R2
                 └── Inspection Images
                         │
                         ▼
                  Vision AI Extraction
                         │
                         ▼
                Structured Declarations
                         │
                         ▼
                  RAG Rule Retrieval
                         │
                         ▼
               Compliance Verdict Engine
                         │
                         ▼
                 PASS / ISSUE /
                 REVIEW_REQUIRED

The backend follows a layered architecture:

Route → Service → Specialized Service → DB / External API

Routes remain thin while extraction, embeddings, retrieval, RAG, storage, and verdict logic remain isolated in their respective services.

Repository Structure
SIH-26/backend/
├── .env / .env.example
├── requirements.txt
├── alembic.ini
├── alembic/
│   └── versions/
├── docs/
│   └── phase5_criteria.md
├── tests/
└── app/
    ├── main.py
    ├── api/
    │   ├── routes_auth.py
    │   ├── routes_inspections.py
    │   ├── routes_rag.py
    │   ├── routes_extraction.py
    │   └── routes_verdict.py
    ├── auth/
    │   └── deps.py
    ├── db/
    │   └── session.py
    ├── models/
    │   ├── user.py
    │   ├── inspection.py
    │   ├── inspection_image.py
    │   ├── declaration.py
    │   ├── checklist_result.py
    │   ├── inspection_extraction.py
    │   └── compliance_verdict.py
    ├── schemas/
    │   ├── auth.py
    │   ├── inspection.py
    │   └── verdict.py
    └── services/
        ├── storage_service.py
        ├── embedding_service.py
        ├── retrieval_service.py
        ├── rag_service.py
        ├── extraction_service.py
        └── verdict_service.py
Setup
Prerequisites
Python 3.12+
PostgreSQL
pgvector extension
Git

Create the database:

createdb legal_metrology

Or:

CREATE DATABASE legal_metrology;

Create and activate the virtual environment:

py -3.12 -m venv venv
venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt
Environment Variables

Copy .env.example to .env and configure:

DATABASE_URL=postgresql+psycopg2://postgres:PASSWORD@localhost:5432/legal_metrology

JWT_SECRET=...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

R2_ENDPOINT_URL=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...

AI_API_KEY=...

Never commit:

.env
Database passwords
JWT secrets
Cloudflare R2 credentials
AI API keys
pgvector

Verify pgvector:

SELECT extversion
FROM pg_extension
WHERE extname = 'vector';

If the extension is not enabled:

CREATE EXTENSION vector;
Database Migrations

Run:

alembic upgrade head

Database schema changes must always be made through Alembic migrations.

Start the Server

From backend/:

venv\Scripts\activate
uvicorn app.main:app --reload

Server:

http://127.0.0.1:8000

Swagger:

http://127.0.0.1:8000/docs
API Endpoints
Method	Endpoint	Purpose
GET	/	Root
GET	/health	Health check
POST	/auth/register	Register user
POST	/auth/login	Login and receive JWT
GET	/auth/me	Current authenticated user
POST	/inspections/presigned-url	Generate R2 upload URL
POST	/inspections	Create inspection + image records
GET	/inspections	List officer's inspections
POST	/rag/query	Query Legal Metrology RAG
POST	/inspections/{id}/extract	Run Vision AI extraction
POST	/inspections/{id}/verdict	Generate compliance verdict

Inspection-specific endpoints enforce ownership checks so an officer can only access their own inspection data.

Phase 3 — RAG & Rule Retrieval

Legal Metrology rules are chunked, embedded, and stored in rules_chunks using pgvector for semantic similarity search.

Pipeline
Legal Metrology Rule Text
        │
        ▼
Rule Chunking
        │
        ▼
Gemini Embeddings
        │
        ▼
rules_chunks + pgvector
        │
        ▼
Retrieval Service
        │
        ▼
RAG Service
        │
        ▼
POST /rag/query

The embedding service uses:

gemini-embedding-001

The current rule dataset contains 52 rule chunks with embeddings.

The retrieval service performs vector similarity search and returns the most relevant Legal Metrology clauses.

The RAG service uses those retrieved rules as the legal context for answering compliance-related questions.

RAG ingestion

Rule ingestion is performed using:

python -m scripts.ingest_rules

The ingestion process:

Loads the rule chunks.
Generates embeddings.
Stores the rule text and embeddings in PostgreSQL.
Makes the rules available to semantic retrieval.
Phase 4 — Vision AI Extraction

Phase 4 extracts structured package declarations from inspection images.

It does not determine legal compliance.

Pipeline
Inspection Images
       │
       ▼
Cloudflare R2
       │
       ▼
POST /inspections/{id}/extract
       │
       ▼
Extraction Service
       │
       ▼
Google Gemini Vision AI
       │
       ▼
Structured JSON
       │
       ▼
Pydantic Validation
       │
       ▼
inspection_extractions
Extraction Fields

The extraction pipeline handles fields including:

product_name
generic_name
manufacturer_name
manufacturer_address
packer_name
packer_address
importer_name
importer_address
country_of_origin
net_quantity
net_quantity_unit
dimensions
mrp
unit_sale_price
manufacture_date
packing_date
import_date
best_before_or_use_by
consumer_care
batch_or_lot_number

Each field contains:

value
confidence
status

where status can be:

visible
not_visible
illegible

The model is explicitly instructed to return null rather than invent or guess information that cannot be reliably read from the package.

Storage

Extraction results are stored in:

inspection_extractions

with the extraction data stored as PostgreSQL JSONB.

Phase 5 — Compliance Verdict Engine

Phase 5 converts Phase 4 extracted declarations and Phase 3 retrieved Legal Metrology rules into compliance verdicts.

Possible verdicts are:

PASS
ISSUE
REVIEW_REQUIRED
Core Principle

The team defines the compliance criteria. The AI implements those criteria and does not invent legal requirements.

The verdict engine does not use the model's general knowledge as the legal source. When a legal rule is required, it is retrieved from the RAG pipeline.

Workflow
Phase 4 Extraction
        │
        ├── Extracted Declaration
        │
        ▼
Phase 3 RAG Retrieval
        │
        ├── Relevant Legal Rule
        │
        ▼
Team-Defined Criteria
        │
        ▼
Compliance Verdict Engine
        │
        ├── PASS
        ├── ISSUE
        └── REVIEW_REQUIRED
        │
        ▼
ComplianceVerdict
        │
        ▼
PostgreSQL
Current Checklist Categories

The Phase 5 engine evaluates categories including:

MRP
Net Quantity
Manufacturer Details
Country of Origin
Consumer Care

For every category, the engine retrieves a relevant Legal Metrology rule and applies the defined compliance logic.

Verdict Storage

Verdicts are stored in:

compliance_verdicts

and linked to the corresponding inspection.

The verdict response contains:

inspection_id
overall_status
categories
created_at

Each category contains:

category
verdict
reasoning
rule_reference

This provides traceability from:

Inspection
    ↓
Extracted declaration
    ↓
Retrieved legal rule
    ↓
Compliance reasoning
    ↓
Final verdict
Example

For an inspection where MRP is visible but net quantity and manufacturer information are missing:

MRP                   → PASS
Net Quantity          → ISSUE
Manufacturer Details  → ISSUE
Country of Origin     → PASS
Consumer Care         → PASS

Overall Status        → ISSUE

The API also returns the retrieved rule text used for each category, allowing the team to inspect why a particular verdict was produced.

Endpoint
POST /inspections/{inspection_id}/verdict

The endpoint:

Authenticates the officer.
Verifies inspection ownership.
Loads the latest extraction.
Retrieves relevant Legal Metrology rules through RAG.
Applies the defined compliance criteria.
Stores the verdict.
Returns the inspection-level compliance result.
Phase 5 Validation

Phase 5 was validated end-to-end using a real package image.

The complete pipeline was tested as:

Package Image
      ↓
Cloudflare R2
      ↓
Vision AI Extraction
      ↓
Structured Declaration
      ↓
RAG Rule Retrieval
      ↓
Compliance Verdict
      ↓
Swagger API Response

The resulting Swagger response demonstrated category-level PASS and ISSUE results together with the corresponding retrieved Legal Metrology rule references.

Engineering Principles
1. Thin Routes
Route → Service → Specialized Service → DB / External API

API routes should coordinate operations rather than contain business logic.

2. Ownership Checks

Inspection-specific endpoints verify:

inspection.officer_id == current_user.id

before accessing or modifying inspection data.

3. Traceability

Every compliance decision should be traceable back to:

Source Image
     ↓
Extracted Data
     ↓
Retrieved Legal Rule
     ↓
Verdict
4. Replaceable Providers

AI, embedding, OCR/Vision, and storage providers are isolated behind service modules so they can be replaced without restructuring the API.

5. No Manual Schema Changes

Database changes must be introduced through Alembic migrations.

Testing Strategy

Testing follows:

Unit
  ↓
Service
  ↓
API
  ↓
Database
  ↓
End-to-End

The current automated test suite passes:

11 passed

with only non-blocking dependency/deprecation warnings.

Phase 5 was also manually validated through Swagger using:

authenticated inspection access
R2 image retrieval
Vision AI extraction
RAG rule retrieval
compliance verdict generation
PostgreSQL verdict persistence
Phase 5 Definition of Done

Phase 5 is considered complete because:

✅ Compliance criteria were defined for the implemented checklist categories.
✅ Verdict engine consumes Phase 4 extraction output.
✅ Verdict engine uses Phase 3 RAG retrieval.
✅ Retrieved legal rules are included in verdict results.
✅ PASS / ISSUE / REVIEW_REQUIRED outcomes are supported.
✅ Verdicts are stored and linked to inspections.
✅ API exposes compliance results.
✅ End-to-end package validation was performed.
✅ Automated test suite passes.
✅ Phase 5 implementation is committed to the repository.
Security

Never commit secrets or credentials.

The following must remain local:

.env
Database passwords
JWT secrets
Cloudflare R2 credentials
AI API keys

The repository's .gitignore excludes .env and Python-generated files.

Current Backend Flow

The complete backend now supports:

             ┌──────────────┐
             │ Package Image│
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ Cloudflare R2│
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ Vision AI    │
             │ Extraction   │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ Declarations │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ RAG Retrieval│
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ Legal Rules  │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ Compliance   │
             │ Verdict      │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ PASS / ISSUE │
             │ / REVIEW     │
             └──────────────┘

The backend now provides the complete Phase 0–5 foundation required for the Legal Metrology AI Inspection workflow.