# Legal Metrology Compliance API

**Phase 1 — Backend Foundations**

This repository contains the backend for the Legal Metrology Compliance application. The project is being developed in phases. **Phase 1 is complete** and establishes the backend foundation that future phases will build on.

---

## Phase Status

| Phase | Status | Purpose |
|-------|--------|---------|
| Phase 0 | ✅ Complete | Finalized database schema and application requirements |
| Phase 1 | ✅ Complete | Backend foundation, database integration, migrations, authentication |
| Phase 2 | 🚧 Next | OCR / AI / RAG / compliance functionality |
| Later phases | ⏳ Planned | Additional application functionality |

> **Note:** OCR, AI, RAG, automated compliance analysis, and related intelligence are **not** implemented in Phase 1. They belong to later phases.

---

## What Phase 1 Provides

Phase 1 establishes the infrastructure that the rest of the application will use:

- FastAPI backend
- Uvicorn development server
- PostgreSQL database
- SQLAlchemy ORM
- Alembic database migrations
- PostgreSQL `pgvector` extension
- JWT-based authentication
- Password hashing with Argon2 / Passlib
- Pydantic request/response validation
- Basic API endpoints
- Database models corresponding to the finalized Phase 0 schema
- Automated tests using PostgreSQL

Phase 1 is the **foundation**, not the final application. Future functionality should be added on top of this foundation rather than replacing it unnecessarily.

---

## Technology Stack

### Python
The programming language used for the backend. Also well suited to the AI/ML ecosystem used in later phases.

### FastAPI
The web framework. It receives HTTP requests, routes them to the appropriate Python functions, validates request data, and returns HTTP responses.

```
POST /auth/login
      ↓
FastAPI route
      ↓
Python authentication logic
      ↓
Database
      ↓
HTTP response
```

### Uvicorn
The ASGI server that runs the FastAPI application.

```bash
uvicorn app.main:app --reload
```

The application is then available at `http://127.0.0.1:8000`.

### PostgreSQL
The application's relational database, storing data permanently instead of only in memory. Current development environment: **PostgreSQL 13**.

### SQLAlchemy
The ORM (Object Relational Mapper). Allows the application to work with database models and queries without manually writing raw SQL for normal operations.

```
Python objects → SQLAlchemy → SQL → PostgreSQL
```

### Alembic
Manages database schema migrations. Schema changes are represented as migrations rather than manual table edits.

```bash
alembic upgrade head
```

### pgvector
Adds vector storage and similarity-search capabilities to PostgreSQL — important for the future AI/RAG portions of the application.

There are two related pieces:
1. The **PostgreSQL `pgvector` extension** — installed on the PostgreSQL server.
2. The **Python `pgvector` package** — installed in the Python virtual environment.

These are not the same thing.

Current development setup: PostgreSQL 13, pgvector extension `0.8.6`.

### Pydantic
Used by FastAPI for validating and structuring request/response data, ensuring API data has the expected format.

### JWT (JSON Web Token)
Used for authentication. After a successful login, the backend issues an access token. Protected endpoints require the client to send that token.

### Argon2 / Passlib
Passwords are hashed rather than stored as plain text.

### pytest
Used for automated testing. The test suite uses a real PostgreSQL database because the application relies on PostgreSQL-specific functionality such as `pgvector` and JSONB.

---

## High-Level Architecture

```
                Frontend
                   │
                   │ HTTP request
                   ▼
              ┌──────────┐
              │ FastAPI  │
              └────┬─────┘
                   │
             Routes / Auth
                   │
                   ▼
            Application Logic
                   │
                   ▼
              SQLAlchemy
                   │
                   ▼
          PostgreSQL + pgvector
```

In later phases, AI/OCR/RAG services will be added to this architecture. The guiding principle:

```
Frontend → Backend API → Application services → Database / AI services → Response
```

---

## Repository Structure

```
backend/
├── app/               # FastAPI application code
├── alembic/           # Migration configuration and scripts
├── tests/             # Automated tests
├── requirements.txt   # Python dependencies
├── alembic.ini         # Alembic configuration
├── .env.example        # Environment variable template
├── .gitignore
└── README.md
```

- **`app/`** — Contains the FastAPI application and its Python code: API routes, database configuration, models, schemas, authentication/security logic, and application functionality.
- **`alembic/`** — Contains database migration configuration and scripts, allowing the schema to be reproduced consistently across machines.
- **`tests/`** — Contains automated backend tests.
- **`requirements.txt`** — Lists required Python packages.
- **`alembic.ini`** — Alembic configuration.
- **`.env.example`** — Template showing which environment variables are required. Each developer should create their own `.env` from this template.
- **`.gitignore`** — Specifies local files that should not be committed to Git.

---

## Local Development Setup

### Prerequisites

Every developer needs their own local development environment.

Current project baseline:

- Python 3.12
- PostgreSQL 13
- pgvector PostgreSQL extension 0.8.6
- Git

> PostgreSQL credentials are local to each developer. Do not share or commit passwords.

### Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd legal_metrology/backend
```

### Step 2 — Create a Python Virtual Environment

**On Windows:**

```bash
py -3.12 -m venv venv
venv\Scripts\activate
```

You should see `(venv)` at the beginning of the terminal prompt.

Verify:

```bash
python --version
```

Expected output: `Python 3.12.x`

### Step 3 — Install Python Dependencies

```bash
pip install -r requirements.txt
```

---

## PostgreSQL Setup

Each developer should have PostgreSQL installed locally.

Create a database named `legal_metrology`:

```bash
createdb -U postgres legal_metrology
```

Alternatively, create it through pgAdmin.

The application expects PostgreSQL to be available on `localhost:5432`.

---

## pgvector Setup

The PostgreSQL vector extension must be installed on the PostgreSQL server. This is different from installing the Python `pgvector` package.

After installing the server-side extension, connect to the `legal_metrology` database and verify it:

```sql
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

Expected version: `0.8.6`

If necessary:

```sql
CREATE EXTENSION vector;
```

The migration also handles extension creation when the server-side extension files are available and the PostgreSQL role has sufficient privileges.

---

## Environment Variables

Create your local environment file from the example:

```
.env.example → .env
```

The `.env` file is local and must **not** be committed.

At minimum, configure:

```env
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/legal_metrology

JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=...
```

- Use your own PostgreSQL password.
- Do not copy another developer's `.env`.
- Do not commit real credentials or API keys.
- For a password containing URL-special characters such as `@`, `:`, `/`, `#`, `%`, `?`, or `&`, make sure the password is URL-encoded when used inside `DATABASE_URL`.

---

## Run Database Migrations

From the `backend` directory, with the virtual environment active:

```bash
alembic upgrade head
```

This creates the Phase 0 database schema required by the application, including the PostgreSQL/pgvector-specific components.

You normally do not need to manually create application tables — Alembic is responsible for bringing the database schema to the required migration version.

---

## Start the Backend

With the virtual environment active:

```bash
uvicorn app.main:app --reload
```

Expected output:

```
Uvicorn running on http://127.0.0.1:8000
Application startup complete.
```

---

## Verify the Backend

| Endpoint | URL |
|----------|-----|
| Root endpoint | `http://127.0.0.1:8000/` |
| Health endpoint | `http://127.0.0.1:8000/health` |
| Swagger API documentation | `http://127.0.0.1:8000/docs` |

Swagger provides an interactive interface for testing the API.

---

## Authentication Flow

Phase 1 implements JWT authentication. The basic flow:

```
Register
   ↓
Password is hashed
   ↓
User stored in PostgreSQL
   ↓
Login
   ↓
Password verified
   ↓
JWT access token generated
   ↓
Client stores token
   ↓
Client sends: Authorization: Bearer <token>
   ↓
FastAPI verifies token
   ↓
Protected endpoint is accessible
```

- **Registration** — `POST /auth/register`
- **Login** — `POST /auth/login` (response contains an `access_token`)
- **Current user** — `GET /auth/me` (requires a valid Bearer token)

---

## Current API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Basic/root endpoint |
| GET | `/health` | Health check |
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate and receive JWT |
| GET | `/auth/me` | Retrieve the authenticated user |

The exact request/response schemas can always be inspected through the Swagger docs at `http://127.0.0.1:8000/docs`.

---

## Database and Migration Architecture

The database schema was finalized during Phase 0 and is represented in Phase 1 through SQLAlchemy models and Alembic migrations.

The migration establishes:

- Required tables
- Foreign keys
- Constraints
- Indexes
- Vector support
- HNSW vector indexing
- Inspection timestamp trigger functionality

The application is intentionally PostgreSQL-specific because the schema relies on PostgreSQL features such as `pgvector` and JSONB.

---

## Testing

Tests use a real PostgreSQL database rather than SQLite.

Create a separate test database:

```bash
createdb -U postgres legal_metrology_test
```

Configure the test database connection through `TEST_DATABASE_URL`. Do not assume the PostgreSQL password is `postgres`.

Run the tests:

```bash
pytest -v
```

The test database is kept separate from the main `legal_metrology` database so that test operations do not modify development data.

---

## Important Development Rules

### Reuse the Existing Architecture

Do not unnecessarily replace:

- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- JWT authentication
- pgvector

### Database Changes

If a future feature requires a schema change:

1. Modify the appropriate SQLAlchemy model.
2. Create an Alembic migration.
3. Review the migration.
4. Apply it with `alembic upgrade head`.

Do not manually modify production/development tables and leave the migration history inconsistent.

### Environment Variables

- Never commit `.env`.
- Never put passwords, API keys, JWT secrets, or other credentials into source code.

---

## Phase 2 — Developer Handoff

### What Phase 2 Inherits from Phase 1

Phase 2 developers do not need to build the backend foundation again. They already have:

- FastAPI + PostgreSQL + SQLAlchemy + Alembic + JWT authentication + pgvector

Phase 2 should build on these components:

- The authentication system should be reused for protected functionality rather than creating a second authentication mechanism.
- Database operations should continue to use the existing SQLAlchemy/Alembic approach.

### What Phase 2 Is Intended to Add

Phase 1 deliberately does not implement the application's intelligence layer. The next phases are expected to introduce functionality around:

```
Documents / Package Images
        ↓
OCR / Extraction
        ↓
Structured Information
        ↓
Legal Knowledge Retrieval
        ↓
Embeddings / Vector Search
        ↓
RAG / AI
        ↓
Compliance Analysis
        ↓
Compliance Result
```

The exact implementation should follow the finalized project requirements. These components should be treated as separate responsibilities rather than put into one large FastAPI route.

### Recommended Phase 2 Development Flow

Before implementing a feature, understand how it fits into the existing system. A likely high-level flow:

```
User
  ↓
Frontend
  ↓
FastAPI endpoint
  ↓
Authentication
  ↓
Application/service logic
  ↓
OCR / extraction / retrieval / AI
  ↓
PostgreSQL + pgvector
  ↓
Compliance result
  ↓
FastAPI response
  ↓
Frontend
```

Future developers should preserve this separation:

- API routes should handle HTTP concerns.
- Database models should represent persistent data.
- Database access should use SQLAlchemy.
- Schema changes should use Alembic.
- OCR should have a defined processing layer.
- Embedding/vector search should be isolated from HTTP routing.
- LLM/RAG logic should not be scattered throughout unrelated endpoints.
- Compliance logic should remain understandable and testable.

### Before Starting Phase 2

A developer joining the project should first understand:

- FastAPI routing
- Request/response schemas
- SQLAlchemy models
- Database sessions
- Alembic migrations
- JWT authentication/dependencies
- PostgreSQL/pgvector
- The finalized Phase 0 schema
- The application's intended user workflow

Then begin Phase 2 work. **Do not rewrite Phase 1 simply to become familiar with the code.**

---

## Team Workflow

Each teammate should have their own local:

- Python environment
- PostgreSQL installation
- `legal_metrology` database
- `.env`

Typical workflow:

```
Clone repository
     ↓
Create venv
     ↓
Install requirements
     ↓
Configure local .env
     ↓
Set up PostgreSQL + pgvector
     ↓
Run alembic upgrade head
     ↓
Run tests
     ↓
Start FastAPI
     ↓
Develop Phase 2
```

### Git Branching

```
main
 │
 ├── phase-2-feature-a
 ├── phase-2-feature-b
 └── phase-2-feature-c
```

Use feature branches for development and merge completed work into the team's main development branch according to the team's agreed workflow.

---

## Phase 1 Security Notes

Phase 1 includes password hashing and JWT authentication, but production security is not considered fully solved merely because those technologies are present.

Important considerations for later deployment include:

- Strong random JWT secret
- HTTPS
- Appropriate JWT expiration
- Token revocation/refresh strategy, if required
- Rate limiting
- Secure secret management
- Proper production database credentials
- Appropriate authorization rules
- Review of admin-role handling

The development server and local HTTP setup are **not** a production deployment configuration.

---

## Troubleshooting

**`password authentication failed for user "postgres"`**
Check that `DATABASE_URL` contains the correct password for your local PostgreSQL installation. Do not change the application code to accommodate an incorrect local password.

**`CREATE EXTENSION vector` fails**
The PostgreSQL server-side pgvector extension may not be installed. Installing the Python `pgvector` package alone is not sufficient. Check:

```sql
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

**`alembic upgrade head` fails on vector/HNSW functionality**
Verify the extension version as above, and confirm the Python `pgvector` package and PostgreSQL server extension are compatible.

**Python version problems**
Check `python --version`. The current project baseline is Python 3.12. On Windows with multiple Python versions installed:

```bash
py -3.12 -m venv venv
```

---

## Final Phase 1 State

At the end of Phase 1, the project has a functioning backend foundation:

```
             LEGAL METROLOGY
                   │
                   ▼
              FastAPI API
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
 Authentication  Database     Future AI
      │            │            │
     JWT       PostgreSQL    OCR / RAG /
                 + pgvector   Compliance
```

**Phase 1 is COMPLETE.**
**Phase 2 is the next development stage and has NOT yet been implemented.**

The purpose of this repository at this point is to give every team member a reproducible backend foundation from which Phase 2 can be developed.
