# Legal Metrology AI Inspection Backend

Backend for the SIH-26 Legal Metrology Compliance Application.

The backend is being developed incrementally. Phase 1, Phase 2, and Phase 3 are now complete. The current implementation provides authentication, inspection sessions, image ingestion, Cloudflare R2 storage, and a Legal Metrology RAG (Retrieval-Augmented Generation) pipeline for semantic rule retrieval. The next development stage is OCR and declaration extraction, followed by the Legal Metrology compliance/rules engine.

## Current Project Status

| Phase | Status | Purpose |
|---|---|---|
| Phase 0 | ✅ Complete | Finalized database schema and application requirements |
| Phase 1 | ✅ Complete | Backend foundation, PostgreSQL, SQLAlchemy, Alembic, JWT authentication |
| Phase 2 | ✅ Complete | Image upload, Cloudflare R2 storage, inspection session CRUD |
| Phase 3 | ✅ Complete | Legal Metrology RAG pipeline & semantic rule retrieval |
| Phase 4 | 🚧 Next | OCR & structured declaration extraction |
| Phase 5 | ⏳ Planned | Legal Metrology rules & compliance engine |
| Phase 6 | ⏳ Planned | Reports, review workflow & production hardening |

> **Important:** Authentication, inspection/image ingestion, and the Legal Metrology RAG pipeline are already implemented. Do not rebuild these components during Phase 4.

## Technology Stack

- Python 3.12 / 3.13
- FastAPI
- Uvicorn
- PostgreSQL 13
- SQLAlchemy
- Alembic
- pgvector 0.8.6
- Pydantic v2
- JWT authentication
- Argon2 / Passlib
- Cloudflare R2
- boto3
- pytest

## High-Level Architecture

```
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
                              ▼
                RAG / Rule Retrieval (Phase 3 ✅)
```

Future application flow:

```
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
   (Phase 3 ✅)
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

## Repository Structure

```
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
        │   ├── routes_inspections.py
        │   └── routes_rag.py
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
        ├── services/
        │   ├── embedding_service.py
        │   ├── retrieval_service.py
        │   └── rag_service.py
        └── schemas/
            ├── auth.py
            └── inspection.py
```

Future services (Phase 4 onward) should be added to the same service layer:

```
app/
└── services/
    ├── embedding_service.py      # Phase 3 — complete
    ├── retrieval_service.py      # Phase 3 — complete
    ├── rag_service.py            # Phase 3 — complete
    ├── ocr_service.py            # Phase 4 — planned
    ├── declaration_parser.py     # Phase 4 — planned
    ├── compliance_service.py     # Phase 5 — planned
    └── report_service.py         # Phase 6 — planned
```

Keep API routes, business logic, AI/OCR logic, and database models separate.

## Phase 1 — Authentication & Core Backend

**Phase 1 is COMPLETE.**

It provides:

- FastAPI application
- PostgreSQL
- SQLAlchemy
- Alembic migrations
- pgvector
- User/officer model
- Password hashing
- JWT authentication
- Protected-route dependencies
- Pydantic validation
- Automated testing

### Authentication Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Authenticate and receive JWT |
| GET | `/auth/me` | Get authenticated user |

Authentication flow:

```
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

## Phase 2 — Image Upload, R2 Storage & Inspection CRUD

**Phase 2 is COMPLETE.**

This phase connects an authenticated officer to inspection sessions and their package images.

### Cloudflare R2

`app/db/services/storage.py` contains the R2 integration using boto3.

Implemented functions:

- `generate_presigned_upload_url(object_name, content_type)`
- `generate_presigned_download_url(object_name)`

The backend does not receive image bytes directly. Instead:

```
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

### Inspection Model

Stores:

- inspection ID
- officer ID
- product name
- manufacturer hint
- status
- overall compliance result

Initial status: `pending`

### InspectionImage Model

Stores:

- image ID
- inspection ID
- R2/S3 object key
- packaging side
- upload timestamp

Supported sides: `front`, `back`, `left`, `right`, `top`, `bottom`, `other`

The database stores the R2 object key rather than a permanent public URL.

### Implemented Inspection Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/inspections/presigned-url` | Generate R2 upload URL |
| POST | `/inspections` | Create inspection + image records |
| GET | `/inspections` | Retrieve authenticated officer's inspections |

The complete upload flow has been tested through Swagger UI and PowerShell/curl uploads to Cloudflare R2.

## Local Development Setup

### Prerequisites

- Python 3.12+
- PostgreSQL 13
- PostgreSQL pgvector extension
- Git

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

### Environment Variables

Create `.env` from `.env.example`:

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

**Never commit `.env`.** Never commit:

- database passwords
- JWT secrets
- R2 credentials
- AI API keys

### PostgreSQL & pgvector

Verify pgvector:

```sql
SELECT extversion
FROM pg_extension
WHERE extname = 'vector';
```

Expected development version: `0.8.6`

If necessary:

```sql
CREATE EXTENSION vector;
```

The PostgreSQL server-side extension and Python pgvector package are separate components.

### Database Migrations

Run:

```bash
alembic upgrade head
```

Do not manually modify application tables without updating the Alembic migration history.

For schema changes:

```
Modify SQLAlchemy model
        ↓
Create Alembic migration
        ↓
Review migration
        ↓
alembic upgrade head
```

### Start the Backend

From:

```
E:\SIH_Extra_Informations\SIH-26\backend
```

Activate the environment:

```bash
venv\Scripts\activate
```

Start the server:

```bash
uvicorn app.main:app --reload
```

- Server: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs

### Current API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Root endpoint |
| GET | `/health` | Health check |
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Current authenticated user |
| POST | `/inspections/presigned-url` | Generate R2 upload URL |
| POST | `/inspections` | Create inspection |
| GET | `/inspections` | List officer's inspections |
| POST | `/rag/query` | Query the Legal Metrology RAG pipeline |

## Phase 3 — Legal Metrology RAG & Rule Retrieval

**Phase 3 is COMPLETE ✅**

Phase 3 implements the **Legal Metrology RAG (Retrieval-Augmented Generation) pipeline** for the SIH-26 Legal Metrology Compliance Application.

The objective of this phase is to make the Legal Metrology rules stored in PostgreSQL searchable using **vector embeddings and semantic retrieval**, and expose the RAG functionality through a FastAPI endpoint.

> **Note:** OCR and declaration extraction are **not** part of the completed Phase 3 implementation. They are planned for Phase 4.

### Completed Components

- PostgreSQL rule storage
- `rules_chunks` table
- pgvector integration
- Rule embeddings
- Embedding service
- Semantic retrieval service
- RAG service
- `/rag/query` API endpoint
- FastAPI integration
- Swagger UI testing

### Phase 3 Architecture

The completed Phase 3 pipeline is:

```
                    Legal Metrology Rules
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │                 │
                    │  rules_chunks   │
                    └────────┬────────┘
                             │
                             ▼
                        pgvector
                             │
                             ▼
                    ┌─────────────────┐
                    │    Embedding    │
                    │     Service     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Retrieval     │
                    │     Service     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    RAG Service  │
                    └────────┬────────┘
                             │
                             ▼
                       POST /rag/query
                             │
                             ▼
                    ┌─────────────────┐
                    │     FastAPI     │
                    │     Swagger     │
                    └─────────────────┘
```

### 1. PostgreSQL Rule Storage

The Legal Metrology rule documents are processed into searchable chunks and stored in PostgreSQL.

The main rule data is stored in:

```
rules_chunks
```

Each chunk represents a portion of the Legal Metrology reference material that can be retrieved independently.

The database is also configured with the pgvector extension to support vector similarity search.

### 2. pgvector

pgvector is used to store and search vector embeddings of the Legal Metrology rule chunks.

The basic flow is:

```
Legal Metrology Rule
        ↓
Rule Chunk
        ↓
Embedding
        ↓
Vector
        ↓
PostgreSQL + pgvector
```

This allows the system to perform semantic similarity search rather than relying only on exact keyword matching.

### 3. Embedding Service

The embedding service converts text into vector representations.

```
Input:
Legal Metrology rule/query text
        ↓
Embedding Service
        ↓
Output:
Vector embedding
```

The embedding service is kept separate from the API layer so that the embedding provider can be changed independently in the future.

### 4. Retrieval Service

The retrieval service is responsible for finding the most relevant Legal Metrology rule chunks for a user's query.

The process is:

```
User Query
    ↓
Generate Query Embedding
    ↓
Vector Similarity Search
    ↓
Search rules_chunks
    ↓
Retrieve Relevant Rule Chunks
```

The retrieval layer is responsible only for retrieving relevant information.

It should remain separate from the RAG generation logic.

### 5. RAG Service

The RAG service combines the user query with the retrieved Legal Metrology rule context.

```
User Query
     │
     ▼
Embedding
     │
     ▼
Retrieval Service
     │
     ▼
Relevant Rule Chunks
     │
     ▼
RAG Service
     │
     ▼
Context-Aware Response
```

The purpose of RAG is to ensure that responses are grounded in the stored Legal Metrology reference material instead of relying only on the language model's internal knowledge.

### 6. RAG API Endpoint

Phase 3 exposes the RAG functionality through:

```
POST /rag/query
```

The endpoint accepts a Legal Metrology-related query and runs it through the RAG pipeline.

**Request Flow**

```
Client
   ↓
POST /rag/query
   ↓
FastAPI
   ↓
RAG Service
   ↓
Retrieval Service
   ↓
pgvector
   ↓
Relevant Rule Chunks
   ↓
RAG Response
   ↓
FastAPI
```

### 7. FastAPI Integration

The RAG functionality is integrated into the existing FastAPI backend.

The API layer is responsible for:

- Receiving the query
- Validating the request
- Calling the RAG service
- Returning the response

The API route should not contain the embedding, retrieval, or RAG implementation directly.

The preferred architecture is:

```
FastAPI Route
      ↓
RAG Service
      ↓
Retrieval Service
      ↓
Embedding Service
      ↓
PostgreSQL / pgvector
```

### 8. Swagger Testing

The RAG endpoint was tested through the FastAPI Swagger interface.

Swagger is available at:

```
http://127.0.0.1:8000/docs
```

The endpoint can be tested using:

```
POST /rag/query
```

The Swagger workflow is:

```
Open Swagger
     ↓
Select POST /rag/query
     ↓
Enter Legal Metrology query
     ↓
Execute
     ↓
RAG pipeline runs
     ↓
Response returned
```

### 9. Phase 3 Data Flow

The complete Phase 3 data flow is:

```
Legal Metrology Documents
          ↓
      Rule Chunks
          ↓
     rules_chunks
          ↓
       pgvector
          ↓
  Embedding Service
          ↓
  Retrieval Service
          ↓
      RAG Service
          ↓
    POST /rag/query
          ↓
       FastAPI
          ↓
       Swagger
```

### 10. Separation of Responsibilities

Each component has a specific responsibility.

| Component | Responsibility |
|---|---|
| PostgreSQL | Stores Legal Metrology rule chunks |
| `rules_chunks` | Stores searchable rule/document chunks |
| pgvector | Stores and searches vector embeddings |
| Embedding Service | Converts text into embeddings |
| Retrieval Service | Finds relevant rule chunks |
| RAG Service | Combines query and retrieved context |
| FastAPI | Provides the API interface |
| Swagger | Provides API testing interface |

### 11. Phase 3 vs Future OCR

OCR is not part of the completed Phase 3 work.

The current Phase 3 system starts with rule data already stored in PostgreSQL.

**Current Phase 3:**

```
PostgreSQL
    ↓
rules_chunks + pgvector
    ↓
Embedding Service
    ↓
Retrieval Service
    ↓
RAG Service
    ↓
POST /rag/query
    ↓
FastAPI / Swagger
```

**Future OCR/declaration extraction (Phase 4)** will be a separate stage:

```
Package Image
      ↓
OCR
      ↓
Raw Text
      ↓
Declaration Extraction
      ↓
Structured Declaration
```

The extracted declarations can later be used together with the Phase 3 RAG system by the compliance engine.

### 12. Phase 3 Definition of Done

Phase 3 is complete when the backend can:

```
Store Legal Metrology rules
        ↓
Generate embeddings
        ↓
Store embeddings using pgvector
        ↓
Accept a user query
        ↓
Generate query embedding
        ↓
Retrieve relevant rule chunks
        ↓
Provide retrieved context to RAG
        ↓
Return the RAG response
        ↓
Expose the functionality through FastAPI
        ↓
Test the endpoint using Swagger
```

### 13. Phase 3 Completed Checklist

- [x] PostgreSQL configured
- [x] Legal Metrology rule chunks stored
- [x] `rules_chunks` implemented
- [x] pgvector configured
- [x] Rule embeddings implemented
- [x] Embedding service implemented
- [x] Retrieval service implemented
- [x] RAG service implemented
- [x] `POST /rag/query` implemented
- [x] FastAPI integration completed
- [x] Swagger testing completed

### 14. Next Development Stage

After Phase 3, the next major development stage is:

**Phase 4 — OCR & Declaration Extraction**

The planned workflow is:

```
Inspection
     ↓
Inspection Images
     ↓
Cloudflare R2
     ↓
OCR
     ↓
Raw OCR Text
     ↓
Declaration Parser
     ↓
Structured Declarations
     ↓
PostgreSQL
```

After OCR and declaration extraction are stable, the system can combine:

```
Extracted Declarations
          +
Retrieved Legal Metrology Rules
          +
Visual Evidence
          ↓
   Compliance Engine
          ↓
   Checklist Results
```

This will form the foundation for the later Legal Metrology compliance-checking and report-generation stages.

## Phase 4 — OCR & Declaration Extraction

### Overview

Phase 4 extends the Legal Metrology AI Inspection Backend by adding **OCR-based text extraction** and **structured declaration extraction** from package images.

The goal of this phase is to convert images stored in Cloudflare R2 into structured Legal Metrology declaration data and persist the extracted information in PostgreSQL.

> **Phase 1, Phase 2, and Phase 3 are already complete.**
>
> Authentication, JWT authorization, inspection sessions, image ingestion, Cloudflare R2 storage, and the Legal Metrology RAG pipeline are **not rebuilt in Phase 4**.

### Phase 4 Goal

The main objective is:

```
Inspection Image
       ↓
Cloudflare R2
       ↓
OCR
       ↓
Raw OCR Text
       ↓
Declaration Parser
       ↓
Structured Declaration
       ↓
Pydantic Validation
       ↓
PostgreSQL
       ↓
API Response
```

The system should extract information printed on product packaging and represent it as structured data.

### Fields to Extract

Phase 4 initially targets the following fields:

| Field | Description |
|---|---|
| `mrp` | Maximum Retail Price |
| `net_quantity` | Declared net quantity |
| `manufacturing_date` | Manufacturing / packing date |
| `expiry_date` | Expiry / use-by date |
| `manufacturer_name` | Manufacturer / packer name |
| `manufacturer_address` | Manufacturer / packer address |
| `country_of_origin` | Country of origin |
| `consumer_helpline` | Consumer care / helpline information |

> **Important:** The system must not invent information.

If OCR cannot reliably identify a field:

```json
{
  "mrp": null,
  "net_quantity": null
}
```

Missing or uncertain information must remain missing or explicitly marked as uncertain.

### Architecture

```
                         Frontend
                            │
                            │ HTTP / JSON
                            ▼
                       ┌──────────┐
                       │ FastAPI  │
                       └────┬─────┘
                            │
                            ▼
                     Inspection API
                            │
                            ▼
                       Inspection
                            │
                            ▼
                     InspectionImage
                            │
                            ▼
                       Cloudflare R2
                            │
                            ▼
                           OCR
                            │
                            ▼
                     Raw OCR Text
                            │
                            ▼
                  Declaration Parser
                            │
                            ▼
                  Pydantic Validation
                            │
                            ▼
                     Declaration Model
                            │
                            ▼
                       PostgreSQL
                            │
                            ▼
                       API Response
```

### Responsibilities of Each Component

Phase 4 keeps the responsibilities separated.

| Component | Responsibility |
|---|---|
| FastAPI Route | HTTP request/response handling |
| Authentication | JWT authentication and authorization |
| Inspection Service | Inspection ownership and image retrieval |
| R2 Storage | Package image storage |
| OCR Service | Convert image into raw text |
| Declaration Parser | Extract declaration fields from OCR text |
| Pydantic Schema | Validate structured declaration data |
| PostgreSQL | Persist extracted declarations |

Avoid placing OCR, parsing, database logic, and API logic into a single route.

### Repository Changes

Phase 4 introduces the following services:

```
app/
├── services/
│   ├── ocr_service.py
│   └── declaration_parser.py
```

Existing components remain in place:

```
app/
├── api/
│   ├── routes_auth.py
│   └── routes_inspections.py
│
├── auth/
│   └── deps.py
│
├── db/
│   ├── session.py
│   └── services/
│       └── storage.py
│
├── models/
│   ├── user.py
│   ├── inspection.py
│   ├── inspection_image.py
│   ├── declaration.py
│   ├── checklist_result.py
│   └── report.py
│
├── schemas/
│   ├── auth.py
│   └── inspection.py
│
└── services/
    ├── ocr_service.py
    └── declaration_parser.py
```

### Phase 4 Development Steps

#### Step 1 — Inspect Declaration Model

Before implementing the extraction pipeline, inspect:

```
app/models/declaration.py
```

Also inspect:

```
schema.sql
alembic/
```

The SQLAlchemy model, Alembic migration history, and PostgreSQL schema must remain consistent.

If the declaration model requires changes:

```
Modify SQLAlchemy Model
        ↓
Create Alembic Migration
        ↓
Review Migration
        ↓
alembic upgrade head
```

Do not manually modify PostgreSQL tables without updating Alembic.

#### Step 2 — Choose OCR Provider

The OCR implementation should be hidden behind a service interface.

Possible OCR providers include:

- PaddleOCR
- Tesseract
- Vision API

The first implementation should use one provider while keeping the service replaceable.

The API route should not directly depend on a specific OCR library.

#### Step 3 — OCR Service

Create:

```
app/services/ocr_service.py
```

Recommended interface:

```python
def extract_text(image_url_or_path) -> str:
    ...
```

The purpose of this service is:

```
Image
  ↓
OCR Provider
  ↓
Raw Text
```

Example:

```python
text = extract_text(image_path)
```

The rest of the application should not need to know whether the implementation uses PaddleOCR, Tesseract, or another provider.

#### Step 4 — Test OCR Independently

Before implementing the complete extraction endpoint, test OCR against one real package image.

The test flow should be:

```
Existing Inspection
        ↓
Inspection Image
        ↓
R2 Image
        ↓
OCR Service
        ↓
Raw OCR Text
```

Example expected output:

```
PRODUCT NAME
NET QUANTITY: 500 g
MRP: ₹120
MFD: 06/2026
BEST BEFORE: 12 MONTHS
MANUFACTURED BY: ABC FOODS PVT LTD
ADDRESS: XYZ INDUSTRIAL AREA
COUNTRY OF ORIGIN: INDIA
CUSTOMER CARE: 1800-XXX-XXXX
```

The OCR output should be manually compared with the actual package.

> **Important:** Do not continue to the complete declaration pipeline until OCR produces sufficiently usable text.

#### Step 5 — Declaration Parser

Create:

```
app/services/declaration_parser.py
```

The parser accepts raw OCR text and converts it into structured declaration data.

**Input:** Raw OCR Text

**Output:**

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

##### Parsing Strategy

The recommended extraction strategy is:

```
OCR Text
   ↓
Deterministic Parsing
   ↓
Regex / Keyword Matching
   ↓
Structured Fields
   ↓
LLM for Ambiguous Cases
   ↓
Pydantic Validation
```

Deterministic parsing should be preferred whenever the text is sufficiently clear.

For example:

```
MRP: ₹120
```

can be extracted using deterministic logic.

Similarly:

```
Net Quantity: 500 g
```

can be extracted without requiring an LLM.

An LLM may be introduced later for noisy or ambiguous OCR.

##### Pydantic Declaration Schema

The declaration schema should clearly distinguish between:

- Found values
- Missing values
- Uncertain values

A basic first version may use nullable fields:

```python
from pydantic import BaseModel

class DeclarationResponse(BaseModel):
    mrp: str | None = None
    net_quantity: str | None = None
    manufacturing_date: str | None = None
    expiry_date: str | None = None
    manufacturer_name: str | None = None
    manufacturer_address: str | None = None
    country_of_origin: str | None = None
    consumer_helpline: str | None = None
```

If uncertainty needs to be represented explicitly, the schema can later be extended with fields such as:

- `value`
- `confidence`
- `source`

or an equivalent structured representation.

#### Evidence Preservation

Phase 4 should preserve enough information to make extraction traceable.

The eventual evidence chain should be:

```
R2 Image
   ↓
OCR
   ↓
Raw OCR Text
   ↓
Parsed Field
   ↓
Structured Declaration
```

For example:

```
Image
   ↓
"MRP ₹120"
   ↓
mrp = "₹120"
```

This becomes important in Phase 5 when compliance decisions need to be explained and audited.

#### Extraction Endpoint

Implement:

```
POST /inspections/{inspection_id}/extract
```

The endpoint must require authentication.

Expected flow:

```
JWT Authentication
        ↓
Get Current User
        ↓
Find Inspection
        ↓
Verify Ownership
        ↓
Load Inspection Images
        ↓
Retrieve Images From R2
        ↓
OCR
        ↓
Raw OCR Text
        ↓
Declaration Parser
        ↓
Pydantic Validation
        ↓
Save Declaration
        ↓
Return Result
```

##### Inspection Ownership

The extraction endpoint must verify that the authenticated officer owns the inspection.

Required check:

```
inspection.officer_id == current_user.id
```

The flow should be:

```
JWT User
   ↓
Inspection Lookup
   ↓
Ownership Check
   ↓
Continue Processing
```

If the inspection belongs to another officer, the request must be rejected.

##### Example API Request

```
POST /inspections/{inspection_id}/extract
Authorization: Bearer <JWT_TOKEN>
```

No image should need to be uploaded again if the inspection already contains the R2 object keys.

The endpoint should use the existing inspection image records.

##### Example API Response

A successful extraction may return:

```json
{
  "inspection_id": "123",
  "declaration": {
    "mrp": "₹120",
    "net_quantity": "500 g",
    "manufacturing_date": "06/2026",
    "expiry_date": "12/2026",
    "manufacturer_name": "ABC Foods Pvt Ltd",
    "manufacturer_address": "XYZ Industrial Area",
    "country_of_origin": "India",
    "consumer_helpline": "1800-XXX-XXXX"
  }
}
```

If information cannot be found:

```json
{
  "inspection_id": "123",
  "declaration": {
    "mrp": "₹120",
    "net_quantity": "500 g",
    "manufacturing_date": null,
    "expiry_date": null,
    "manufacturer_name": "ABC Foods Pvt Ltd",
    "manufacturer_address": null,
    "country_of_origin": "India",
    "consumer_helpline": null
  }
}
```

The backend must not fabricate missing values.

#### Multiple Images

An inspection may contain multiple package images:

- front
- back
- left
- right
- top
- bottom
- other

The extraction pipeline should be capable of processing the relevant images associated with the inspection.

Conceptually:

```
Inspection
   │
   ├── Front Image
   ├── Back Image
   ├── Left Image
   ├── Right Image
   ├── Top Image
   └── Bottom Image
            │
            ▼
           OCR
            │
            ▼
      Combined OCR Text
            │
            ▼
     Declaration Parser
```

The parser should work with combined OCR text where appropriate.

#### Raw OCR Text

Raw OCR output should not be discarded.

A useful internal representation is:

```
Image
  ↓
OCR
  ↓
Raw OCR Text
  ↓
Parser
```

Keeping raw OCR text provides:

- Debugging capability
- Reproducibility
- Evidence for extracted fields
- Easier parser improvements
- Ability to re-run parsing without repeating OCR

The exact database storage strategy should follow the existing schema.

#### Idempotency

Calling:

```
POST /inspections/{inspection_id}/extract
```

multiple times must not blindly create duplicate declaration records.

Choose one strategy:

**Option 1 — Update**

Update the existing declaration.

```
Existing Declaration
        ↓
New Extraction
        ↓
Update
```

**Option 2 — Replace**

Delete/replace the previous extraction with the newest extraction.

**Option 3 — Version**

Store multiple extraction versions.

```
Inspection
   │
   ├── Extraction v1
   ├── Extraction v2
   └── Extraction v3
```

For the first implementation, update/replace behavior is generally simpler, unless the existing database design requires versioning.

The chosen behavior must be documented and tested.

#### Error Handling

The extraction pipeline should handle failures cleanly.

Possible failures include:

```
Inspection does not exist
        ↓
404 Not Found

Inspection belongs to another officer
        ↓
403 Forbidden

R2 image unavailable
        ↓
Appropriate server/client error

OCR fails
        ↓
Extraction error

OCR produces empty text
        ↓
No declaration fields extracted

Parser fails
        ↓
Validation / processing error
```

Do not silently convert processing failures into successful compliance results.

### Testing Strategy

Phase 4 should contain tests at multiple levels.

```
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

#### Unit Tests

Test the declaration parser independently from OCR.

Example:

```
Input:
"MRP ₹120"

Expected:
mrp = "₹120"
```

Test each target field:

- MRP
- Net quantity
- Manufacturing date
- Expiry date
- Manufacturer name
- Manufacturer address
- Country of origin
- Consumer helpline

#### Missing Field Tests

Example:

```
OCR:
"MRP ₹120
Net Quantity 500 g"
```

Expected:

```json
{
  "mrp": "₹120",
  "net_quantity": "500 g",
  "manufacturing_date": null,
  "expiry_date": null,
  "manufacturer_name": null,
  "manufacturer_address": null,
  "country_of_origin": null,
  "consumer_helpline": null
}
```

The parser must not guess missing values.

#### Invalid OCR Tests

Test cases should include:

- Empty OCR text
- Unreadable OCR
- Random characters
- Partially corrupted text
- Incorrect OCR formatting

The parser should fail safely.

#### Ambiguous OCR Tests

Examples:

```
MRP 12O
```

where `O` may have been recognized instead of `0`.

Or:

```
MFD: 0B/2026
```

where OCR may have confused characters.

Ambiguous values should not automatically be treated as confirmed legal declarations.

The system should either:

- mark as uncertain

or:

- leave the value missing

depending on the schema and extraction strategy.

#### Duplicate Extraction Test

Call:

```
POST /inspections/{inspection_id}/extract
```

multiple times.

Verify that the database does not contain unintended duplicate declaration records.

Expected behavior should match the chosen idempotency strategy.

#### Authorization Tests

Test:

**Valid owner**

```
Officer A
   ↓
Inspection owned by Officer A
   ↓
Extraction allowed
```

**Wrong owner**

```
Officer B
   ↓
Inspection owned by Officer A
   ↓
Extraction rejected
```

#### Nonexistent Inspection Test

Request:

```
POST /inspections/nonexistent-id/extract
```

Expected:

```
404 Not Found
```

#### External Service Mocking

Automated tests should not depend on real external OCR/LLM services.

Mock:

- OCR Provider

and, if introduced:

- LLM Provider

This provides:

- Faster tests
- Deterministic results
- No API cost
- No network dependency
- Easier CI/CD

Example testing flow:

```
Test
 ↓
Mock OCR
 ↓
Known OCR Text
 ↓
Declaration Parser
 ↓
Expected Structured Result
```

### Manual Testing Through Swagger

After implementation, start the backend:

```bash
uvicorn app.main:app --reload
```

Open:

```
http://127.0.0.1:8000/docs
```

Authenticate using the existing login endpoint.

Then:

```
Login
  ↓
Get JWT
  ↓
Authorize Swagger
  ↓
Select existing inspection
  ↓
POST /inspections/{inspection_id}/extract
  ↓
Verify response
```

Verify that the returned declaration matches the actual package.

### Database Verification

After extraction, verify the declaration data in PostgreSQL.

Example:

```sql
SELECT *
FROM declarations;
```

The exact query should follow the existing declaration table name and schema.

Verify:

- Inspection ID
- MRP
- Net Quantity
- Manufacturing Date
- Expiry Date
- Manufacturer
- Address
- Country of Origin
- Consumer Helpline

### Migration Requirements

If the existing declaration table is incomplete and changes are required:

```
SQLAlchemy Model
        ↓
Alembic Revision
        ↓
Migration Review
        ↓
alembic upgrade head
        ↓
PostgreSQL
```

Create a migration using:

```bash
alembic revision --autogenerate -m "add declaration extraction fields"
```

Review the generated migration before applying it.

Then:

```bash
alembic upgrade head
```

Do not manually alter the database and leave Alembic unaware of the change.

### Configuration

OCR-related configuration should be added to `.env`.

For example:

```env
OCR_PROVIDER=...
```

If the selected OCR provider requires credentials:

```env
OCR_API_KEY=...
```

or provider-specific configuration can be added.

Secrets must remain in `.env`.

Never commit:

- `.env`
- OCR API keys
- LLM API keys
- Database passwords
- JWT secrets
- R2 credentials

### Dependency Management

Add only the dependencies required by the selected OCR implementation.

After installing dependencies, update:

```
requirements.txt
```

Example workflow:

```bash
pip install <ocr-package>
```

Then update `requirements.txt`.

The project should be reproducible from:

```bash
pip install -r requirements.txt
```

### Service Layer Design

The intended architecture is:

```
FastAPI Route
      ↓
Service Layer
      ↓
OCR / Parser Service
      ↓
Database / External Service
```

Avoid:

```
FastAPI Route
      ↓
OCR Code
      ↓
Regex
      ↓
LLM
      ↓
SQL Queries
      ↓
Database
```

inside one route.

### Recommended File Responsibilities

#### `ocr_service.py`

Responsible for:

```
Image
 ↓
OCR Provider
 ↓
Raw OCR Text
```

It should not:

- Modify database records
- Decide compliance
- Execute Legal Metrology rules
- Generate final reports

#### `declaration_parser.py`

Responsible for:

```
Raw OCR Text
 ↓
Field Extraction
 ↓
Structured Declaration
```

It should not:

- Handle HTTP requests
- Authenticate users
- Access FastAPI request objects
- Run compliance checks

#### `routes_inspections.py`

Responsible for:

```
HTTP Request
 ↓
Authentication
 ↓
Ownership Check
 ↓
Service Call
 ↓
HTTP Response
```

The route should remain thin.

### Security Requirements

Phase 4 must maintain the security guarantees already implemented in Phase 1 and Phase 2.

**Authentication**

The extraction endpoint must require JWT authentication.

**Authorization**

The authenticated user must own the inspection.

```
inspection.officer_id == current_user.id
```

**Secrets**

Never expose:

- R2 credentials
- JWT secret
- Database password
- OCR API key
- LLM API key

**R2**

Do not make package images permanently public just for OCR.

Use the existing storage mechanism and controlled access.

### Evidence and Auditability

Legal Metrology inspection results should be traceable.

The intended evidence chain is:

```
Package Image
      ↓
R2 Object
      ↓
OCR Text
      ↓
Extracted Declaration
      ↓
Compliance Rule
      ↓
Compliance Result
```

Phase 4 establishes the first part of this chain:

```
Package Image
      ↓
OCR
      ↓
Declaration
```

Phase 5 will extend it with:

```
Declaration
      +
Applicable Rule
      ↓
Compliance Result
```

### OCR vs LLM

OCR and LLMs have different responsibilities.

| Component | Responsibility |
|---|---|
| OCR | Read visible text from the package |
| Regex / Parser | Extract predictable fields |
| LLM | Handle noisy or ambiguous structure when necessary |
| Pydantic | Validate structured output |
| PostgreSQL | Persist the extracted declaration |

The LLM should not be treated as the source of legal truth.

### Phase 4 API

The primary new endpoint is:

```
POST /inspections/{inspection_id}/extract
```

Existing endpoints remain unchanged:

```
GET  /
GET  /health

POST /auth/register
POST /auth/login
GET  /auth/me

POST /inspections/presigned-url
POST /inspections
GET  /inspections
```

Phase 4 extends the existing inspection workflow rather than rebuilding it.

### Complete Phase 4 Flow

```
Authenticated Officer
        │
        ▼
Existing Inspection
        │
        ▼
Inspection Images
        │
        ▼
Cloudflare R2
        │
        ▼
OCR Service
        │
        ▼
Raw OCR Text
        │
        ▼
Declaration Parser
        │
        ▼
Structured Declaration
        │
        ▼
Pydantic Validation
        │
        ▼
PostgreSQL
        │
        ▼
API Response
```

### Phase 4 Definition of Done

Phase 4 is complete when the following works end-to-end:

```
Authenticated Officer
        ↓
Existing Inspection
        ↓
R2 Package Image
        ↓
OCR
        ↓
Raw OCR Text
        ↓
Declaration Parser
        ↓
Structured Legal Metrology Fields
        ↓
Pydantic Validation
        ↓
PostgreSQL
        ↓
API Response
```

The following must be verified:

- [ ] Declaration model inspected
- [ ] Existing database schema inspected
- [ ] Alembic migration history inspected
- [ ] OCR provider selected
- [ ] OCR dependencies installed
- [ ] OCR service created
- [ ] OCR tested on a real R2 image
- [ ] Raw OCR text verified
- [ ] Declaration parser created
- [ ] MRP extraction implemented
- [ ] Net quantity extraction implemented
- [ ] Manufacturing date extraction implemented
- [ ] Expiry date extraction implemented
- [ ] Manufacturer name extraction implemented
- [ ] Manufacturer address extraction implemented
- [ ] Country of origin extraction implemented
- [ ] Consumer helpline extraction implemented
- [ ] Missing fields handled correctly
- [ ] Ambiguous OCR handled safely
- [ ] Declaration Pydantic schemas implemented
- [ ] Extraction endpoint implemented
- [ ] Inspection ownership verified
- [ ] Declaration persisted in PostgreSQL
- [ ] Extraction made idempotent
- [ ] Swagger testing completed
- [ ] Unit tests added
- [ ] Service tests added
- [ ] API tests added
- [ ] External OCR/LLM services mocked
- [ ] End-to-end extraction tested

### Phase 4 Testing Checklist

- [ ] MRP extraction
- [ ] Net quantity extraction
- [ ] Manufacturing date extraction
- [ ] Expiry date extraction
- [ ] Manufacturer name extraction
- [ ] Manufacturer address extraction
- [ ] Country of origin extraction
- [ ] Consumer helpline extraction
- [ ] Missing fields
- [ ] Empty OCR
- [ ] Invalid OCR
- [ ] Ambiguous OCR
- [ ] Duplicate extraction
- [ ] Nonexistent inspection
- [ ] Unauthorized inspection
- [ ] Valid inspection ownership
- [ ] Database persistence
- [ ] API response validation

### Development Order

Follow this order:

```
1. Inspect declaration model
        ↓
2. Inspect schema.sql
        ↓
3. Inspect Alembic migrations
        ↓
4. Choose OCR provider
        ↓
5. Add OCR dependencies
        ↓
6. Create ocr_service.py
        ↓
7. Test OCR with one real R2 image
        ↓
8. Verify raw OCR text
        ↓
9. Create declaration_parser.py
        ↓
10. Implement deterministic extraction
        ↓
11. Create/update Pydantic schemas
        ↓
12. Implement extraction endpoint
        ↓
13. Verify inspection ownership
        ↓
14. Save declarations
        ↓
15. Implement idempotency
        ↓
16. Test through Swagger
        ↓
17. Add automated tests
        ↓
18. Complete end-to-end test
```

### Phase 4 Completion Milestone

The primary milestone is:

```
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

Once this pipeline is stable and tested, Phase 4 is complete.

### What Comes After Phase 4

Do not start Phase 5 until Phase 4 is stable.

Phase 5 will introduce the Legal Metrology compliance engine.

Future flow:

```
Structured Declarations
        +
Package Images
        +
Legal Metrology Rules
        ↓
Rule Retrieval
        ↓
Compliance Engine
        ↓
Checklist Results
```

Phase 5 will eventually include:

- Mandatory Declaration Checks
- MRP Rules
- Quantity Rules
- Date Rules
- Packaging Rules
- Visual Checks
- Rule Retrieval / RAG
- Compliance Result Persistence

The immediate focus remains Phase 4 — OCR and Declaration Extraction.

### Phase 4 Status

```
Phase 0 — Requirements & Database Schema       ✅ Complete
Phase 1 — Backend & Authentication             ✅ Complete
Phase 2 — Image Upload & R2 Storage            ✅ Complete
Phase 3 — RAG & Rule Retrieval                 ✅ Complete
Phase 4 — OCR & Declaration Extraction         🚧 Current
Phase 5 — Legal Metrology Compliance Engine   ⏳ Planned
Phase 6 — Reports & Production Hardening      ⏳ Planned
```

### Final Phase 4 Objective

```
                    PHASE 4
                       │
                       ▼
                Inspection Image
                       │
                       ▼
                Cloudflare R2
                       │
                       ▼
                      OCR
                       │
                       ▼
                 Raw OCR Text
                       │
                       ▼
            Declaration Parser
                       │
                       ▼
             Structured Fields
                       │
                       ▼
              Pydantic Validation
                       │
                       ▼
                 PostgreSQL
                       │
                       ▼
                 API Response
```

Phase 4 is successful when package images can be converted into reliable, validated, traceable Legal Metrology declaration data without inventing missing information.

## Phase 5 — Legal Metrology Compliance Engine

**Do not start Phase 5 until Phase 4 is stable.**

The compliance engine will combine:

```
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

### Step 4.1 — Rule Retrieval

The project already has the Legal Metrology rules/RAG resources:

- `ingest_rules.py`
- `rules_chunks.json`
- `schema.sql`
- `What will the App do.pdf`

Use these as the established project rule/reference resources.

The rule retrieval system should eventually answer: *Which rule applies to this product/requirement?*

### Step 4.2 — Separate Compliance Rules

Do not create one huge function (`check_everything()`).

Prefer:

```
app/services/compliance/
    engine.py
    mandatory_declarations.py
    mrp_rules.py
    quantity_rules.py
    date_rules.py
    packaging_rules.py
```

Each rule should be independently testable.

### Step 4.3 — Compliance Result

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

Suggested statuses: `pass`, `fail`, `warning`, `not_applicable`, `unable_to_verify`

Follow the existing database schema for the actual implementation.

### Step 4.4 — Start With Deterministic Rules

First implement straightforward checks:

- Is MRP present?
- Is net quantity present?
- Is manufacturer information present?
- Is address information present?
- Is country of origin present where applicable?
- Is consumer-care information present?
- Are required dates present?

Only after these work should more advanced AI/vision checks be added.

### OCR vs Vision vs RAG vs LLM

These components should have different responsibilities.

| Component | Answers |
|---|---|
| **OCR** | What text is visible in the image? |
| **Vision** | What visual properties can be observed? (text visibility, approximate font height, placement, label structure, visual evidence) |
| **RAG** | Which Legal Metrology rule/reference applies? |
| **Compliance Engine** | Based on the evidence and applicable rule, does the requirement pass? |
| **LLM** | Can help with noisy OCR interpretation, field extraction, ambiguous labels, explanations |

The LLM should not be the sole source of legal truth.

## Phase 6 — Reports & Final Workflow

After Phase 5:

```
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

Reuse `app/models/checklist_result.py` and `app/models/report.py` unless the existing schema genuinely requires changes.

Potential endpoints:

```
POST /inspections/{id}/extract
POST /inspections/{id}/check
GET  /inspections/{id}
GET  /inspections/{id}/results
GET  /inspections/{id}/report
```

## Recommended Development Order

```
PHASE 4
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
PHASE 5
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
PHASE 6
│
├── 19. Overall compliance calculation
├── 20. Report generation
├── 21. Officer review
├── 22. Error handling
├── 23. Security hardening
└── 24. Production deployment
```

## Important Engineering Rules

### 1. Keep API routes thin

Prefer:

```
FastAPI Route
      ↓
Service Layer
      ↓
Specialized Service
      ↓
Database / External API
```

Avoid putting OCR, LLM calls, SQL queries, and compliance logic inside one route.

### 2. Always verify inspection ownership

For inspection-specific endpoints:

```
JWT user
   ↓
Inspection lookup
   ↓
inspection.officer_id == current_user.id
   ↓
Continue
```

### 3. Preserve evidence

Every compliance decision should eventually be traceable:

```
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

### 4. Keep external services replaceable

OCR, LLM, embedding, and storage providers should be isolated behind service interfaces/functions.

### 5. Database changes require migrations

Never modify PostgreSQL manually and leave Alembic unaware of the change.

## Testing Strategy

```
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

```
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

## Immediate Next Task

**Start Phase 4 now. Do not start Phase 5 yet.**

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
13. Only after Phase 4 is stable, start Phase 5.

The first practical milestone is:

```
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

## Final Current State

```
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
                                ▼
                            pgvector
                                │
                                ▼
                       Phase 3 — RAG Pipeline
                     (Rule Retrieval — Complete)
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
                  Phase 4                Phase 5
                Declarations        Compliance Engine
                     │                     │
                     └──────────┬──────────┘
                                ▼
                             Phase 6
                           Final Report
```

- **Phase 1:** COMPLETE ✅
- **Phase 2:** COMPLETE ✅
- **Phase 3:** COMPLETE ✅
- **Phase 4:** IN PROGRESS 🚧
