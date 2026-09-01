# Legal Metrology AI Inspection Backend

Backend for the **SIH-26 Legal Metrology Compliance Application**.

The backend is being developed incrementally. **Phase 1, Phase 2, and Phase 3 are now complete.**

The current implementation provides:

- Authentication and JWT authorization
- PostgreSQL database integration
- Inspection session management
- Image ingestion
- Cloudflare R2 image storage
- pgvector integration
- Legal Metrology rule ingestion
- Vector-based rule retrieval
- RAG-based Legal Metrology context retrieval

The next development stage is the **Legal Metrology compliance/rules engine**, which will use the retrieved rules together with extracted declarations and inspection evidence to determine compliance.

---

# Current Project Status

| Phase | Status | Purpose |
|---|---|---|
| Phase 0 | ✅ Complete | Finalized database schema and application requirements |
| Phase 1 | ✅ Complete | Backend foundation, PostgreSQL, SQLAlchemy, Alembic, JWT authentication |
| Phase 2 | ✅ Complete | Image upload, Cloudflare R2 storage, inspection session CRUD |
| Phase 3 | ✅ Complete | pgvector-based Legal Metrology rule storage and RAG retrieval |

> **Important:** Authentication, inspection/image ingestion, and the Phase 3 RAG layer are already implemented. Do not rebuild these components.

---

# Technology Stack

- **Python 3.12+**
- **FastAPI**
- **Uvicorn**
- **PostgreSQL 13**
- **SQLAlchemy**
- **Alembic**
- **pgvector 0.8.6**
- **Pydantic v2**
- **Pydantic Settings**
- **JWT authentication**
- **Argon2 / Passlib**
- **Cloudflare R2**
- **boto3**
- **Google GenAI**
- **pytest**

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
                              ▼
                       Legal Metrology
                       Rule Retrieval
                              │
                              ▼
                            RAG
                              │
                              ▼
                    Compliance Engine
                              │
                              ▼
                         Final Report
