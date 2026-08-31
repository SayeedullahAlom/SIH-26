# Legal Metrology AI Inspection Backend

Backend for the **SIH-26 Legal Metrology Compliance Application**.

The backend is being developed incrementally. **Phase 1 and Phase 2 are now complete.** The current implementation provides authentication, inspection sessions, image ingestion, and Cloudflare R2 storage. The next development stage is OCR and declaration extraction, followed by the Legal Metrology compliance/rules engine.

---

## Current Project Status

| Phase   | Status     | Purpose                                                                 |
| ------- | ---------- | ----------------------------------------------------------------------- |
| Phase 0 | ✅ Complete | Finalized database schema and application requirements                  |
| Phase 1 | ✅ Complete | Backend foundation, PostgreSQL, SQLAlchemy, Alembic, JWT authentication |
| Phase 2 | ✅ Complete | Image upload, Cloudflare R2 storage, inspection session CRUD            |
| Phase 3 | 🚧 Next    | OCR & structured declaration extraction                                 |
| Phase 4 | ⏳ Planned  | Legal Metrology rules & compliance engine                               |
| Phase 5 | ⏳ Planned  | Reports, review workflow & production hardening                         |

> **Important:** Authentication and inspection/image ingestion are already implemented. Do not rebuild these components during Phase 3.

---

# Technology Stack

* **Python 3.12 / 3.13**
* **FastAPI**
* **Uvicorn**
* **PostgreSQL 13**
* **SQLAlchemy**
* **Alembic**
* **pgvector 0.8.6**
* **Pydantic v2**
* **JWT authentication**
* **Argon2 / Passlib**
* **Cloudflare R2**
* **boto3**
* **pytest**

---

# High-Level Architecture

```text
                         Frontend
                            │
                            │ HTTP / JSON
                            ▼
                       ┌──────────┐
                       │ FastAPI  │
                       └────┬─────┘
                            │
                ┌───────────┴───────────┐
                │                       │
             Auth/JWT             Inspection API
                │                       │
                ▼                       ▼
             User DB             Inspection + Images
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                         PostgreSQL         Cloudflare R2
                              │              Image Objects
                              │
                              ▼
                          pgvector
                              │
                    Future RAG / retrieval
```

Future application flow:

```text
Inspection Images
       │
       ▼
      OCR
       │
       ▼
Raw Extracted Text
       │
       ▼
Declaration Parser
       │
       ▼
Structured Declarations
       │
       ├───────────────┐
       ▼               ▼
 Rule Retrieval    Visual Analysis
       │               │
       └───────┬───────┘
               ▼
        Compliance Engine
               │
               ▼
       Checklist Results
               │
               ▼
          Final Report
```

---

# Repository Structure

```text
SIH-26/
└── backend/
    ├── .env
    ├── .env.example
    ├── venv/
    ├── requirements.txt
    ├── alembic.ini
    ├── alembic/
    ├── tests/
    └── app/
        ├── main.py
        ├── api/
        │   ├── routes_auth.py
        │   └── routes_inspections.py
        ├── auth/
        │   └── deps.py
        ├── db/
        │   ├── session.py
        │   └── services/
        │       └── storage.py
        ├── models/
        │   ├── user.py
        │   ├── inspection.py
        │   ├── inspection_image.py
        │   ├── declaration.py
        │   ├── checklist_result.py
        │   └── report.py
        └── schemas/
            ├── auth.py
            └── inspection.py
```

Future services should be separated into a service layer:

```text
app/
└── services/
    ├── ocr_service.py
    ├── declaration_parser.py
    ├── embedding_service.py
    ├── rag_service.py
    ├── compliance_service.py
    └── report_service.py
```

Keep API routes, business logic, AI/OCR logic, and database models separate.

---

# Phase 1 — Authentication & Core Backend

Phase 1 is **COMPLETE**.

It provides:

* FastAPI application
* PostgreSQL
* SQLAlchemy
* Alembic migrations
* pgvector
* User/officer model
* Password hashing
* JWT authentication
* Protected-route dependencies
* Pydantic validation
* Automated testing

## Authentication Endpoints

| Method | Endpoint         | Purpose                      |
| ------ | ---------------- | ---------------------------- |
| POST   | `/auth/register` | Register user                |
| POST   | `/auth/login`    | Authenticate and receive JWT |
| GET    | `/auth/me`       | Get authenticated user       |

Authentication flow:

```text
Register
   ↓
Password hashing
   ↓
PostgreSQL
   ↓
Login
   ↓
Password verification
   ↓
JWT access token
   ↓
Authorization: Bearer <token>
   ↓
Protected endpoint
```

---

# Phase 2 — Image Upload, R2 Storage & Inspection CRUD

Phase 2 is **COMPLETE**.

This phase connects an authenticated officer to inspection sessions and their package images.

## Cloudflare R2

`app/db/services/storage.py` contains the R2 integration using `boto3`.

Implemented functions:

```python
generate_presigned_upload_url(object_name, content_type)

generate_presigned_download_url(object_name)
```

The backend does not receive image bytes directly.

Instead:

```text
Frontend
   ↓
Request presigned URL
   ↓
FastAPI
   ↓
Generate R2 object key + presigned PUT URL
   ↓
Frontend
   ↓
Upload image directly to R2
   ↓
Frontend sends file key + metadata
   ↓
POST /inspections
   ↓
PostgreSQL
```

## Inspection Model

Stores:

* inspection ID
* officer ID
* product name
* manufacturer hint
* status
* overall compliance result

Initial status:

```text
pending
```

## InspectionImage Model

Stores:

* image ID
* inspection ID
* R2/S3 object key
* packaging side
* upload timestamp

Supported sides:

```text
front
back
left
right
top
bottom
other
```

The database stores the R2 object key rather than a permanent public URL.

## Implemented Inspection Endpoints

| Method | Endpoint                     | Purpose                                      |
| ------ | ---------------------------- | -------------------------------------------- |
| POST   | `/inspections/presigned-url` | Generate R2 upload URL                       |
| POST   | `/inspections`               | Create inspection + image records            |
| GET    | `/inspections`               | Retrieve authenticated officer's inspections |

The complete upload flow has been tested through Swagger UI and PowerShell/curl uploads to Cloudflare R2.

---

# Local Development Setup

## Prerequisites

* Python 3.12+
* PostgreSQL 13
* PostgreSQL pgvector extension
* Git

Create the database:

```sql
CREATE DATABASE legal_metrology;
```

Create the virtual environment:

```bash
py -3.12 -m venv venv
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# Environment Variables

Create:

```text
.env.example → .env
```

Example:

```env
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/legal_metrology

JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

R2_ENDPOINT_URL=YOUR_R2_ENDPOINT
R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY
R2_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
R2_BUCKET_NAME=YOUR_BUCKET
```

Never commit `.env`.

Never commit:

* database passwords
* JWT secrets
* R2 credentials
* AI API keys

---

# PostgreSQL & pgvector

Verify pgvector:

```sql
SELECT extversion
FROM pg_extension
WHERE extname = 'vector';
```

Expected development version:

```text
0.8.6
```

If necessary:

```sql
CREATE EXTENSION vector;
```

The PostgreSQL server-side extension and Python `pgvector` package are separate components.

---

# Database Migrations

Run:

```bash
alembic upgrade head
```

Do not manually modify application tables without updating the Alembic migration history.

For schema changes:

```text
Modify SQLAlchemy model
        ↓
Create Alembic migration
        ↓
Review migration
        ↓
alembic upgrade head
```

---

# Start the Backend

From:

```text
E:\SIH_Extra_Informations\SIH-26\backend
```

activate the environment:

```bash
venv\Scripts\activate
```

Start the server:

```bash
uvicorn app.main:app --reload
```

Server:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

# Current API Endpoints

| Method | Endpoint                     | Purpose                    |
| ------ | ---------------------------- | -------------------------- |
| GET    | `/`                          | Root endpoint              |
| GET    | `/health`                    | Health check               |
| POST   | `/auth/register`             | Register user              |
| POST   | `/auth/login`                | Login                      |
| GET    | `/auth/me`                   | Current authenticated user |
| POST   | `/inspections/presigned-url` | Generate R2 upload URL     |
| POST   | `/inspections`               | Create inspection          |
| GET    | `/inspections`               | List officer's inspections |

---

# Phase 3 — OCR & Declaration Extraction

**Phase 3 is the immediate next task.**

## Goal

Convert package images into structured Legal Metrology declaration data.

Target flow:

```text
Inspection
    ↓
InspectionImage
    ↓
R2 Image
    ↓
OCR
    ↓
Raw OCR Text
    ↓
Declaration Parser
    ↓
Structured Declaration
    ↓
PostgreSQL
```

## Fields to Extract

The first version should attempt to extract:

* MRP
* Net Quantity
* Manufacturing Date
* Expiry Date
* Manufacturer Name
* Manufacturer Address
* Country of Origin
* Consumer Care / Consumer Helpline

Missing information must remain missing.

The system must **not invent values** when OCR cannot find something.

---

## Step 3.1 — Create OCR Service

Create:

```text
app/services/ocr_service.py
```

Recommended interface:

```python
def extract_text(image_url_or_path) -> str:
    ...
```

The service should hide provider-specific implementation.

Possible providers:

```text
PaddleOCR
Tesseract
Vision API
```

Choose one for the first implementation.

Do not put OCR code directly into:

```text
routes_inspections.py
```

---

## Step 3.2 — Test OCR

Before building the complete pipeline:

1. Select one real inspection.
2. Get one image from R2.
3. Run OCR.
4. Print/store the raw OCR text.
5. Manually verify the result against the package.

Target:

```text
Package Image
     ↓
OCR
     ↓
Readable Raw Text
```

Do not proceed until OCR is producing usable text.

---

# Step 3.3 — Declaration Parser

Create:

```text
app/services/declaration_parser.py
```

Input:

```text
Raw OCR text
```

Output:

```text
Structured declaration
```

Example:

```json
{
  "mrp": "...",
  "net_quantity": "...",
  "manufacturing_date": "...",
  "expiry_date": "...",
  "manufacturer_name": "...",
  "manufacturer_address": "...",
  "country_of_origin": "...",
  "consumer_helpline": "..."
}
```

The parser can combine deterministic parsing with an LLM if required.

Recommended approach:

```text
OCR text
   ↓
Regex / deterministic extraction
   ↓
LLM for ambiguous structure
   ↓
Validated Pydantic object
```

This is safer than sending everything directly to an LLM and trusting its output.

---

# Step 3.4 — Declaration Database Model

Use the existing:

```text
app/models/declaration.py
```

First inspect:

```text
models/declaration.py
schema.sql
Alembic migrations
```

Make sure they agree.

If changes are required:

```text
SQLAlchemy model
       ↓
Alembic migration
       ↓
PostgreSQL
```

---

# Step 3.5 — Declaration Schemas

Create/update the appropriate Pydantic schemas.

The schema should clearly represent:

```text
found value
missing value
possibly uncertain value
```

Do not silently convert uncertainty into a confirmed value.

---

# Step 3.6 — Extraction Endpoint

Implement:

```text
POST /inspections/{inspection_id}/extract
```

Flow:

```text
JWT authentication
       ↓
Verify inspection ownership
       ↓
Load inspection images
       ↓
Get R2 images
       ↓
OCR
       ↓
Parse declarations
       ↓
Validate result
       ↓
Save declarations
       ↓
Return result
```

The endpoint must verify:

```text
inspection.officer_id == current_user.id
```

before processing.

---

# Step 3.7 — Idempotency

Calling:

```text
POST /inspections/{id}/extract
```

multiple times must not blindly create duplicate declarations.

Choose one strategy:

```text
Update existing extraction
```

or:

```text
Replace previous extraction
```

or:

```text
Version each extraction
```

The chosen behavior should be documented and tested.

---

# Phase 3 Definition of Done

Phase 3 is complete when:

```text
Authenticated Officer
        ↓
Existing Inspection
        ↓
R2 Package Image
        ↓
OCR
        ↓
Raw Text
        ↓
Declaration Parser
        ↓
Structured Legal Metrology Fields
        ↓
PostgreSQL
        ↓
API Response
```

works end-to-end.

---

# Phase 3 Testing

Add tests for:

* MRP extraction
* Net quantity extraction
* Manufacturing date
* Expiry date
* Manufacturer name
* Manufacturer address
* Country of origin
* Consumer helpline
* Missing fields
* Invalid OCR
* Ambiguous OCR
* Duplicate extraction
* Nonexistent inspection
* Unauthorized inspection access

External OCR/LLM APIs should be mocked in automated tests.

---

# Phase 4 — Legal Metrology Compliance Engine

**Do not start Phase 4 until Phase 3 is stable.**

The compliance engine will combine:

```text
Declarations
      +
Images / visual evidence
      +
Applicable Legal Metrology rules
      ↓
Compliance Engine
      ↓
Checklist Results
```

---

# Step 4.1 — Rule Retrieval

The project already has the Legal Metrology rules/RAG resources:

```text
ingest_rules.py
rules_chunks.json
schema.sql
What will the App do.pdf
```

Use these as the established project rule/reference resources.

The rule retrieval system should eventually answer:

```text
Which rule applies to this product/requirement?
```

---

# Step 4.2 — Separate Compliance Rules

Do not create one huge function:

```python
check_everything()
```

Prefer:

```text
app/services/compliance/
    engine.py
    mandatory_declarations.py
    mrp_rules.py
    quantity_rules.py
    date_rules.py
    packaging_rules.py
```

Each rule should be independently testable.

---

# Step 4.3 — Compliance Result

Each check should eventually contain information similar to:

```json
{
  "rule_id": "...",
  "check_name": "...",
  "status": "pass",
  "severity": "info",
  "observed_value": "...",
  "expected_value": "...",
  "reason": "...",
  "evidence": "..."
}
```

Suggested statuses:

```text
pass
fail
warning
not_applicable
unable_to_verify
```

Follow the existing database schema for the actual implementation.

---

# Step 4.4 — Start With Deterministic Rules

First implement straightforward checks:

```text
Is MRP present?
Is net quantity present?
Is manufacturer information present?
Is address information present?
Is country of origin present where applicable?
Is consumer-care information present?
Are required dates present?
```

Only after these work should more advanced AI/vision checks be added.

---

# OCR vs Vision vs RAG vs LLM

These components should have different responsibilities.

### OCR

Answers:

> What text is visible in the image?

### Vision

Answers:

> What visual properties can be observed?

Examples:

* text visibility
* approximate font height
* placement
* label structure
* visual evidence

### RAG

Answers:

> Which Legal Metrology rule/reference applies?

### Compliance Engine

Answers:

> Based on the evidence and applicable rule, does the requirement pass?

### LLM

Can help with:

* noisy OCR interpretation
* field extraction
* ambiguous labels
* explanations

The LLM should **not be the sole source of legal truth**.

---

# Phase 5 — Reports & Final Workflow

After Phase 4:

```text
Create Inspection
       ↓
Upload Images
       ↓
Extract Declarations
       ↓
Retrieve Applicable Rules
       ↓
Run Compliance Checks
       ↓
Store Checklist Results
       ↓
Calculate Overall Result
       ↓
Generate Report
       ↓
Officer Review
```

Reuse:

```text
app/models/checklist_result.py
app/models/report.py
```

unless the existing schema genuinely requires changes.

Potential endpoints:

```text
POST /inspections/{id}/extract
POST /inspections/{id}/check
GET  /inspections/{id}
GET  /inspections/{id}/results
GET  /inspections/{id}/report
```

---

# Recommended Development Order

```text
PHASE 3
│
├── 1. Inspect declaration model/schema
├── 2. Choose OCR provider
├── 3. Create ocr_service.py
├── 4. Test OCR on real R2 image
├── 5. Create declaration_parser.py
├── 6. Create/update declaration schemas
├── 7. Implement extraction endpoint
├── 8. Persist declarations
├── 9. Test through Swagger
└── 10. Add automated tests
        │
        ▼
PHASE 4
│
├── 11. Rule retrieval
├── 12. Mandatory declaration checks
├── 13. MRP checks
├── 14. Quantity checks
├── 15. Date checks
├── 16. Visual checks
├── 17. Compliance engine
└── 18. Checklist persistence
        │
        ▼
PHASE 5
│
├── 19. Overall compliance calculation
├── 20. Report generation
├── 21. Officer review
├── 22. Error handling
├── 23. Security hardening
└── 24. Production deployment
```

---

# Important Engineering Rules

## 1. Keep API routes thin

Prefer:

```text
FastAPI Route
      ↓
Service Layer
      ↓
Specialized Service
      ↓
Database / External API
```

Avoid putting OCR, LLM calls, SQL queries, and compliance logic inside one route.

## 2. Always verify inspection ownership

For inspection-specific endpoints:

```text
JWT user
   ↓
Inspection lookup
   ↓
inspection.officer_id == current_user.id
   ↓
Continue
```

## 3. Preserve evidence

Every compliance decision should eventually be traceable:

```text
Image
  ↓
OCR / Visual Observation
  ↓
Extracted Field
  ↓
Applicable Rule
  ↓
Compliance Decision
```

This is especially important because this is a legal/inspection application.

## 4. Keep external services replaceable

OCR, LLM, embedding, and storage providers should be isolated behind service interfaces/functions.

## 5. Database changes require migrations

Never modify PostgreSQL manually and leave Alembic unaware of the change.

---

# Testing Strategy

```text
Unit Tests
     ↓
Service Tests
     ↓
API Tests
     ↓
Database Tests
     ↓
End-to-End Test
```

Eventually the full test should simulate:

```text
Register/Login
      ↓
JWT
      ↓
Presigned R2 URL
      ↓
Image Upload
      ↓
Create Inspection
      ↓
Extract Declarations
      ↓
Verify Declarations
      ↓
Run Compliance
      ↓
Verify Checklist Results
      ↓
Generate Report
```

---

# Immediate Next Task

**Start Phase 3 now. Do not start Phase 4 yet.**

Do these steps in order:

1. Inspect `app/models/declaration.py`.
2. Inspect the existing database schema/migration for declarations.
3. Decide the OCR provider.
4. Add OCR dependencies/configuration.
5. Create `app/services/ocr_service.py`.
6. Test OCR against one real image stored in R2.
7. Create `app/services/declaration_parser.py`.
8. Define/update declaration Pydantic schemas.
9. Implement `POST /inspections/{inspection_id}/extract`.
10. Save the extracted declarations.
11. Test the endpoint through Swagger.
12. Add automated tests.
13. Only after Phase 3 is stable, start Phase 4.

The first practical milestone is:

```text
R2 Image
   ↓
OCR
   ↓
Raw Text
   ↓
Declaration Parser
   ↓
Structured JSON
   ↓
PostgreSQL
   ↓
API Response
```

---

# Final Current State

```text
                 SIH-26
                    │
                    ▼
        Legal Metrology Backend
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   Authentication          Inspections
        │                       │
       JWT              Image ingestion
                                │
                                ▼
                           Cloudflare R2
                                │
                                ▼
                           PostgreSQL
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
                  Phase 3                Phase 4
                Declarations        Compliance Engine
                     │                     │
                     └──────────┬──────────┘
                                ▼
                             Phase 5
                           Final Report
```

**Phase 1: COMPLETE ✅**

**Phase 2: COMPLETE ✅**

**Phase 3: NEXT 🚧 — OCR & Declaration Extraction**

**Phase 4: PLANNED ⏳ — Compliance & Rules Engine**

**Phase 5: PLANNED ⏳ — Reports & Production Hardening**
