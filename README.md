Legal Metrology AI Inspection Backend
Backend for the SIH-26 Legal Metrology Compliance Application. Provides authentication, inspection session management, image ingestion via Cloudflare R2, a RAG pipeline for semantic retrieval of Legal Metrology rules, a Vision AI pipeline for structured package declaration extraction, and a compliance verdict engine.
Status
Phase	Status	Purpose
0	✅ Complete	Database schema & requirements finalized
1	✅ Complete	Auth foundation — FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT
2	✅ Complete	Image upload, R2 storage, inspection CRUD
3	✅ Complete	Legal Metrology RAG pipeline & semantic rule retrieval
4	✅ Complete	Vision AI package declaration extraction
5	✅ Complete	Compliance verdict engine using extracted declarations + retrieved rules
________________________________________
Tech Stack
Python 3.12+ · FastAPI · Uvicorn · PostgreSQL + pgvector · SQLAlchemy · Alembic · Pydantic v2 · JWT (Argon2/Passlib) · Cloudflare R2 (boto3) · Google Gemini · pytest
________________________________________
Architecture
Frontend
   │
   ▼
FastAPI
   │
   ├── Auth / JWT
   │      └── User DB
   │
   └── Inspection API
          │
          ├── PostgreSQL
          │      ├── Inspections
          │      ├── Images
          │      ├── Extractions
          │      └── Compliance Verdicts
          │
          ├── Cloudflare R2
          │      └── Inspection Images
          │
          ├── Vision AI — Phase 4
          │      └── Structured Declarations
          │
          └── RAG Pipeline — Phase 3
                 │
                 ├── Rule Embeddings
                 ├── pgvector
                 └── Semantic Retrieval
                          │
                          ▼
                 Compliance Verdict Engine
                          │
                          ▼
                  PASS / ISSUE / REVIEW_REQUIRED
The backend follows a layered architecture:
API Route
    ↓
Service Layer
    ↓
Specialized AI / Retrieval / Storage Service
    ↓
Database / External Provider
Routes remain thin while business logic is isolated inside service modules.
________________________________________
Repository Structure
SIH-26/
├── README.md
└── backend/
    ├── .env
    ├── .env.example
    ├── requirements.txt
    ├── alembic.ini
    │
    ├── alembic/
    │   └── versions/
    │
    ├── tests/
    │
    ├── docs/
    │   └── phase5_criteria.md
    │
    ├── scripts/
    │   ├── ingest_rules.py
    │   └── rag_manual.py
    │
    └── app/
        ├── main.py
        │
        ├── api/
        │   ├── routes_auth.py
        │   ├── routes_inspections.py
        │   ├── routes_rag.py
        │   ├── routes_extraction.py
        │   └── routes_verdict.py
        │
        ├── auth/
        │   └── deps.py
        │
        ├── db/
        │   └── session.py
        │
        ├── models/
        │   ├── user.py
        │   ├── inspection.py
        │   ├── inspection_image.py
        │   ├── declaration.py
        │   ├── inspection_extraction.py
        │   ├── checklist_result.py
        │   ├── compliance_verdict.py
        │   ├── report.py
        │   └── rules_chunk.py
        │
        ├── schemas/
        │   ├── auth.py
        │   ├── inspection.py
        │   └── verdict.py
        │
        └── services/
            ├── storage_service.py
            ├── embedding_service.py
            ├── retrieval_service.py
            ├── rag_service.py
            ├── extraction_service.py
            └── verdict_service.py
________________________________________
Setup
Prerequisites
•	Python 3.12+
•	PostgreSQL
•	PostgreSQL pgvector extension
•	Git
•	Cloudflare R2 account
•	Google Gemini API key
Create the database:
createdb legal_metrology
Or from PostgreSQL:
CREATE DATABASE legal_metrology;
Create and activate the virtual environment:
Windows
py -3.12 -m venv venv
venv\Scripts\activate
Install dependencies:
pip install -r requirements.txt
________________________________________
Environment Variables
Copy:
.env.example → .env
Configure:
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
•	.env
•	Database passwords
•	JWT secrets
•	Cloudflare R2 credentials
•	AI API keys
________________________________________
PostgreSQL / pgvector
Verify pgvector:
SELECT extversion
FROM pg_extension
WHERE extname = 'vector';
The development environment uses pgvector 0.8.6.
If the extension has not been created:
CREATE EXTENSION vector;
The project also uses:
CREATE EXTENSION "uuid-ossp";
Run all database migrations:
alembic upgrade head
Database schema changes must go through Alembic migrations.
________________________________________
Start the Server
From backend/:
venv\Scripts\activate
uvicorn app.main:app --reload
Server:
http://127.0.0.1:8000
Swagger:
http://127.0.0.1:8000/docs
________________________________________
API Endpoints
Method	Endpoint	Purpose
GET	/	Root endpoint
GET	/health	Health check
POST	/auth/register	Register a user
POST	/auth/login	Login and receive JWT
GET	/auth/me	Get current authenticated user
POST	/inspections/presigned-url	Generate R2 upload URL
POST	/inspections	Create inspection and image records
GET	/inspections	List officer’s inspections
POST	/rag/query	Query Legal Metrology rules using RAG
POST	/inspections/{id}/extract	Extract package declarations using Vision AI
POST	/inspections/{id}/verdict	Run compliance verdict engine
Inspection-specific endpoints enforce ownership checks using the authenticated officer.
________________________________________
Phase 3 — RAG & Rule Retrieval
The RAG pipeline provides semantic retrieval of Legal Metrology rules.
Pipeline
Legal Metrology Rules
        ↓
Rule Chunking
        ↓
Gemini Embeddings
        ↓
rules_chunks
        ↓
pgvector
        ↓
Semantic Similarity Search
        ↓
Relevant Legal Rules
        ↓
RAG Service
        ↓
POST /rag/query
The current rule dataset contains:
52 rule chunks
52 embeddings
Embeddings are generated using:
gemini-embedding-001
with 1536-dimensional vectors.
The retrieval service uses pgvector cosine-distance similarity to identify the most relevant legal provisions.
The API route does not contain embedding or retrieval logic. These responsibilities remain isolated inside the service layer.
________________________________________
RAG Ingestion
Rules are ingested using:
python -m scripts.ingest_rules
The ingestion process:
1.	Loads the rule chunks.
2.	Generates embeddings.
3.	Stores rule metadata.
4.	Stores vectors in PostgreSQL.
5.	Makes the rules available for semantic retrieval.
Verification:
SELECT
    COUNT(*) AS total,
    COUNT(embedding) AS with_embeddings
FROM rules_chunks;
Expected result:
total | with_embeddings
------+----------------
52    | 52
________________________________________
Phase 4 — Vision AI Extraction
Phase 4 extracts structured declarations from package inspection images.
It does not determine legal compliance.
Pipeline
Inspection Images
       ↓
Cloudflare R2
       ↓
POST /inspections/{id}/extract
       ↓
Extraction Service
       ↓
Google Gemini Vision AI
       ↓
Structured JSON
       ↓
Pydantic Validation
       ↓
inspection_extractions
       ↓
PostgreSQL JSONB
The extraction service uses Google Gemini Vision AI and is isolated in:
app/services/extraction_service.py
This keeps the AI provider replaceable in the future.
________________________________________
Extracted Fields
The system attempts to identify:
•	product_name
•	generic_name
•	manufacturer_name
•	manufacturer_address
•	packer_name
•	packer_address
•	importer_name
•	importer_address
•	country_of_origin
•	net_quantity
•	net_quantity_unit
•	dimensions
•	mrp
•	unit_sale_price
•	manufacture_date
•	packing_date
•	import_date
•	best_before_or_use_by
•	consumer_care
•	batch_or_lot_number
Each extracted field contains:
value
confidence
status
Possible statuses:
visible
not_visible
illegible
The model is instructed to return null rather than invent information when a declaration cannot be reliably identified.
________________________________________
Extraction Endpoint
POST /inspections/{id}/extract
The endpoint:
1.	Authenticates the user.
2.	Verifies inspection ownership.
3.	Loads inspection images.
4.	Retrieves image data from R2.
5.	Sends images to the Vision AI service.
6.	Validates the structured response.
7.	Stores the extraction in PostgreSQL.
8.	Returns the extraction result and ID.
Extraction results are stored in:
inspection_extractions
with:
id
inspection_id
extraction_data
created_at
________________________________________
Phase 5 — Compliance Verdict Engine
Phase 5 is complete.
The Compliance Verdict Engine converts extracted package declarations into compliance decisions using:
Phase 4 extracted declarations
+
Phase 3 retrieved Legal Metrology rules
+
Team-defined compliance criteria
The engine produces:
PASS
ISSUE
REVIEW_REQUIRED
________________________________________
Phase 5 Workflow
Inspection
    ↓
Images stored in R2
    ↓
Vision AI Extraction
    ↓
Structured Declarations
    ↓
RAG Rule Retrieval
    ↓
Relevant Legal Metrology Rule
    ↓
Compliance Criteria
    ↓
Verdict Engine
    ↓
Category Verdicts
    ↓
Overall Verdict
    ↓
PostgreSQL
________________________________________
Compliance Categories
The current verdict engine evaluates:
•	MRP
•	Net Quantity
•	Manufacturer Details
•	Country of Origin
•	Consumer Care
Each category produces:
category
verdict
reasoning
rule_reference
The overall inspection receives a final status based on the category results.
________________________________________
Verdict Endpoint
POST /inspections/{id}/verdict
The endpoint:
1.	Authenticates the user.
2.	Verifies inspection ownership.
3.	Retrieves the latest Phase 4 extraction.
4.	Retrieves relevant Legal Metrology rules through RAG.
5.	Applies the predefined compliance criteria.
6.	Produces category-level verdicts.
7.	Produces the overall inspection verdict.
8.	Stores the verdict in PostgreSQL.
9.	Returns the complete verdict response.
Example response structure:
{
  "inspection_id": "...",
  "overall_status": "ISSUE",
  "categories": [
    {
      "category": "mrp",
      "verdict": "PASS",
      "reasoning": "MRP visible and contains a numeric value.",
      "rule_reference": "..."
    },
    {
      "category": "net_quantity",
      "verdict": "ISSUE",
      "reasoning": "Net quantity or unit missing.",
      "rule_reference": "..."
    }
  ],
  "created_at": "..."
}
________________________________________
Compliance Criteria
The team defines the compliance criteria.
The AI does not invent legal requirements.
The intended workflow is:
Team
 ↓
Defines compliance criteria
 ↓
AI / Code
 ↓
Applies criteria to extracted declarations
 ↓
RAG
 ↓
Provides supporting legal rule
 ↓
Verdict
 ↓
Team validation
This ensures that compliance decisions remain traceable to both:
1.	The extracted package information.
2.	The relevant Legal Metrology rule.
________________________________________
Phase 5 Boundaries
The system must not:
•	Let the AI invent Legal Metrology criteria.
•	Treat general model knowledge as the legal source.
•	Bypass RAG when a legal rule is required.
•	Silently convert uncertain information into PASS.
•	Treat a successful HTTP response as proof of compliance correctness.
•	Mark Phase 5 complete without testing against known-answer packages.
________________________________________
Verdict Storage
Compliance results are stored in:
compliance_verdicts
The verdict is linked to the corresponding inspection.
This provides traceability:
Inspection
   ↓
Extraction
   ↓
Rule Retrieval
   ↓
Compliance Verdict
________________________________________
Validation & Testing
The backend is tested using pytest.
Current test result:
11 passed
The testing strategy covers multiple layers:
Unit Tests
    ↓
Service Tests
    ↓
API Tests
    ↓
Database Tests
    ↓
End-to-End Validation
The Phase 5 implementation has been validated with:
•	Database migrations
•	Compliance verdict generation
•	RAG rule retrieval
•	Vision extraction integration
•	Verdict persistence
•	API responses
•	Authentication and ownership checks
________________________________________
Engineering Principles
1. Thin Routes
Routes follow:
Route
  ↓
Service
  ↓
Specialized Service
  ↓
Database / External API
Business logic is kept out of API route handlers wherever possible.
2. Ownership Checks
Inspection-specific endpoints verify:
inspection.officer_id == current_user.id
before accessing inspection data.
3. Traceability
Every compliance decision should be traceable to:
Inspection
→ Image
→ Extracted Declaration
→ Retrieved Rule
→ Verdict
4. Replaceable Providers
External providers are isolated behind service modules:
•	Vision AI
•	Embeddings
•	RAG retrieval
•	Cloudflare R2 storage
This allows future provider replacement without rewriting the API layer.
5. Migration-Based Database Changes
Database schema changes must use Alembic.
Model Change
    ↓
Alembic Migration
    ↓
Database
Manual production schema changes should be avoided.
________________________________________
Security
The backend uses:
•	JWT authentication
•	Argon2 password hashing
•	Authenticated inspection access
•	Inspection ownership validation
•	Environment variables for secrets
•	Cloudflare R2 for object storage
•	Pydantic request validation
Sensitive credentials must never be committed to Git.
________________________________________
Current Phase 5 Definition of Done
Phase 5 is considered complete when:
•	✅ Compliance criteria are defined.
•	✅ Phase 4 extraction is used as verdict input.
•	✅ Phase 3 RAG retrieval is used for legal rule references.
•	✅ Criteria are explicitly applied.
•	✅ Category-level verdicts are generated.
•	✅ Overall inspection verdict is generated.
•	✅ Verdicts are stored and linked to inspections.
•	✅ API exposes verdict results.
•	✅ RAG contains the current rule dataset and embeddings.
•	✅ Automated tests pass.
•	✅ End-to-end verdict generation has been validated.
________________________________________
Project Status
Phase 0  ████████████████████  Complete
Phase 1  ████████████████████  Complete
Phase 2  ████████████████████  Complete
Phase 3  ████████████████████  Complete
Phase 4  ████████████████████  Complete
Phase 5  ████████████████████  Complete
The backend now provides the complete pipeline:
Package Image
     ↓
Cloudflare R2
     ↓
Vision AI
     ↓
Declaration Extraction
     ↓
RAG Rule Retrieval
     ↓
Compliance Criteria
     ↓
Compliance Verdict
     ↓
Stored Inspection Result
________________________________________
License
This project is developed as part of the SIH-26 project.
