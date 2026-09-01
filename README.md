# Legal Metrology AI Inspection Backend

Backend for the SIH-26 Legal Metrology Compliance Application.

The backend is being developed incrementally. Phase 1, Phase 2, and Phase 3 are now complete. The current implementation provides authentication, inspection sessions, image ingestion, Cloudflare R2 storage, and a Legal Metrology RAG (Retrieval-Augmented Generation) pipeline for semantic rule retrieval.

## Current Project Status

| Phase | Status | Purpose |
|---|---|---|
| Phase 0 | ✅ Complete | Finalized database schema and application requirements |
| Phase 1 | ✅ Complete | Backend foundation, PostgreSQL, SQLAlchemy, Alembic, JWT authentication |
| Phase 2 | ✅ Complete | Image upload, Cloudflare R2 storage, inspection session CRUD |
| Phase 3 | ✅ Complete | Legal Metrology RAG pipeline & semantic rule retrieval |

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

### 11. Phase 3 Definition of Done

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

### 12. Phase 3 Completed Checklist

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

Every decision should eventually be traceable back to its source image and data.

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
```

- **Phase 1:** COMPLETE ✅
- **Phase 2:** COMPLETE ✅
- **Phase 3:** COMPLETE ✅
