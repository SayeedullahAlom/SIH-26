<div align="center">

# ⚖️ Legal Metrology Compliance Application

### AI-assisted field inspection for packaged-commodity compliance under the Legal Metrology (Packaged Commodities) Rules, 2011

**Built for Smart India Hackathon 2026 · SIH-26**

[![Status](https://img.shields.io/badge/status-live-brightgreen)](https://www.legal-metrology.online)
[![Live Demo](https://img.shields.io/badge/demo-legal--metrology.online-2563eb)](https://www.legal-metrology.online)
[![Python](https://img.shields.io/badge/python-3.12%2F3.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](#license)

[**🔗 Live Application**](https://www.legal-metrology.online) · [Problem Statement](#-problem-statement) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Setup](#-getting-started)

</div>

---

## 📖 Overview

Every packaged consumer product sold in India is legally required to declare specific information on its label — MRP, net quantity, manufacturer details, dates, consumer-care contact — under the **Legal Metrology (Packaged Commodities) Rules, 2011**. Verifying this today is a manual, paper-driven process: an inspecting officer physically checks a package against a checklist, one product at a time.

**This application turns that checklist into a camera.** An officer photographs a package, the system extracts every mandated declaration using Vision AI, cross-references it against the actual Rules text via a retrieval pipeline, and returns a structured compliance verdict — logged, searchable, and reportable.

It is a full-stack system: a FastAPI backend with a Postgres + pgvector data layer, a Vision AI extraction pipeline, a Retrieval-Augmented Generation (RAG) layer grounded in the sourced legal text, and a compliance verdict engine — all sitting behind authenticated, ownership-scoped APIs and a field-usable frontend.

**🔗 Live at [www.legal-metrology.online](https://www.legal-metrology.online)**

---

## 🎯 Problem Statement

| | |
|---|---|
| **Challenge** | Manual Legal Metrology compliance checks are slow, inconsistent across officers, and produce no structured audit trail. |
| **Approach** | Replace the manual checklist with a photograph → AI extraction → rule-grounded verdict → stored report pipeline. |
| **Constraint** | Legal text and compliance judgment are never left to an AI's memory — every rule reference is sourced from the actual Department of Consumer Affairs text and retrieved, not recalled. |

---

## ✨ Features

- 📸 **Photo-based inspection** — officers capture package images directly in the field; no manual data entry.
- 🔍 **Vision AI extraction** — pulls every mandated declaration (product name, MRP, net quantity, manufacturer/packer/importer details, dates, consumer care, batch number) into structured, validated JSON.
- 📚 **Grounded rule retrieval (RAG)** — the actual Legal Metrology Rules, 2011 are chunked, embedded with `pgvector`, and retrieved by semantic similarity — never generated from an LLM's memory.
- ✅ **Compliance verdict engine** — combines the extracted declaration with the retrieved rule and team-defined criteria to produce a **PASS / ISSUE / REVIEW REQUIRED** verdict.
- 🔐 **Secure, ownership-scoped auth** — JWT-based authentication; every inspection is scoped to the officer who created it.
- 📄 **Report generation** — every inspection can be exported as a structured report.
- 📊 **Search, history & dashboard** — filterable inspection history and aggregate compliance analytics.
- ☁️ **Cloud image storage** — inspection photos are stored via Cloudflare R2 with presigned-URL uploads.

---

## 🏗 Architecture

```
                     ┌─────────────────────┐
                     │      Frontend        │
                     │  (field inspection    │
                     │   capture UI)         │
                     └──────────┬───────────┘
                                │ HTTPS / JWT
                                ▼
                     ┌─────────────────────┐
                     │       FastAPI         │
                     │  ─────────────────    │
                     │  Auth · Inspections    │
                     │  RAG · Extraction      │
                     │  Verdicts · Reports    │
                     └───┬───────────┬───────┘
                         │           │
             ┌───────────┘           └───────────┐
             ▼                                    ▼
   ┌───────────────────┐               ┌────────────────────┐
   │   PostgreSQL 13     │               │  Cloudflare R2       │
   │   + pgvector         │◄─────────────┤  (inspection images) │
   │  users · inspections │  embeddings  └────────────────────┘
   │  extractions          │
   │  rules_chunks (RAG)   │
   │  verdicts             │
   └──────────┬────────────┘
              │
              ▼
   ┌─────────────────────────────────────────────┐
   │  Legal Metrology Rules, 2011 (sourced text)   │
   │  → chunked → embedded → retrieved by query     │
   └─────────────────────────────────────────────┘
```

**Request flow for an inspection:**

`Photo captured` → `POST /inspections` (create + upload to R2) → `POST /inspections/{id}/extract` (Vision AI → structured declaration) → RAG retrieval of the relevant clause → verdict engine (declaration + clause + team criteria → verdict) → stored, linked to the inspection → visible in history, dashboard, and exportable report.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Backend framework** | FastAPI, Uvicorn |
| **Database** | PostgreSQL 13 + `pgvector` 0.8.6 |
| **ORM / Migrations** | SQLAlchemy, Alembic |
| **Validation** | Pydantic v2 |
| **Auth** | JWT (Argon2 / Passlib) |
| **Object storage** | Cloudflare R2 (via `boto3`) |
| **Vision AI** | Google Gemini (isolated behind a service interface for future provider swaps) |
| **RAG / embeddings** | `pgvector` similarity search over chunked Legal Metrology Rules text |
| **Testing** | `pytest` |
| **Deployment** | Live at [legal-metrology.online](https://www.legal-metrology.online) |

---

## 📁 Repository Structure

```
SIH-26/
├── README.md
├── Resources/              # Supporting reference material (Rules text, docs, planning)
└── backend/
    ├── .env.example
    ├── requirements.txt
    ├── alembic.ini
    ├── alembic/             # Database migrations
    ├── tests/               # pytest suite
    └── app/
        ├── main.py
        ├── api/             # routes_auth, routes_inspections, routes_rag, ...
        ├── auth/            # deps.py — auth dependencies
        ├── db/
        │   ├── session.py
        │   └── services/storage.py   # R2 integration
        ├── models/          # user, inspection, inspection_image,
        │                    # declaration, checklist_result, report
        ├── services/        # embedding_service, retrieval_service,
        │                    # rag_service, extraction_service
        └── schemas/         # auth, inspection
```

Routes stay thin; business logic, AI/vision logic, and database models are each isolated in their own layer — no route talks to an external provider directly.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root / service info |
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Register a new officer account |
| `POST` | `/auth/login` | Authenticate, receive JWT |
| `GET` | `/auth/me` | Current authenticated user |
| `POST` | `/inspections/presigned-url` | Generate a presigned R2 upload URL |
| `POST` | `/inspections` | Create an inspection with image record(s) |
| `GET` | `/inspections` | List the authenticated officer's inspections |
| `POST` | `/inspections/{id}/extract` | Run Vision AI extraction on an inspection's images |
| `POST` | `/rag/query` | Query the Legal Metrology RAG pipeline for a relevant clause |
| `POST` | `/inspections/{id}/verdict` | Run the compliance verdict engine on an inspection |

Full interactive documentation is available via Swagger once the server is running, at `/docs`.

---

## 🧠 How Compliance Is Determined

This is the part of the system that carries real-world consequences, so it's built with a hard rule: **an AI model never defines what "compliant" means — it only applies criteria the team defined.**

1. **Extraction** — Vision AI reads the package image and returns each declaration field with a `value`, a `confidence` score, and a `status` (`visible` / `not_visible` / `illegible`). If a field truly isn't visible, the model is instructed to return `null` rather than guess.
2. **Retrieval** — the relevant clause of the Legal Metrology Rules, 2011 is retrieved from the `pgvector`-indexed rule store — never recalled from a model's memory.
3. **Verdict** — the extracted declaration, the retrieved clause, and the team's plain-language PASS / ISSUE / REVIEW REQUIRED criteria are combined into a stored, inspection-linked verdict.

Every verdict is traceable back to the source image and the specific rule clause that produced it.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- PostgreSQL 13 with the `pgvector` extension
- A Cloudflare R2 (or S3-compatible) bucket
- A Google Gemini API key
- Git

### 1. Clone and install

```bash
git clone https://github.com/SayeedullahAlom/SIH-26.git
cd SIH-26/backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

### 2. Configure the database

```bash
createdb legal_metrology
# or: CREATE DATABASE legal_metrology;
```

Verify `pgvector` is available:

```sql
SELECT extversion FROM pg_extension WHERE extname = 'vector';
-- if missing:
CREATE EXTENSION vector;
```

### 3. Configure environment variables

Copy `.env.example` → `.env` and fill in:

```env
DATABASE_URL=postgresql+psycopg2://postgres:PASSWORD@localhost:5432/legal_metrology

JWT_SECRET=...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

R2_ENDPOINT_URL=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...

GEMINI_API_KEY=...
```

> **Never commit `.env`** — database passwords, JWT secrets, R2 credentials, and AI API keys stay out of version control.

### 4. Run migrations

```bash
alembic upgrade head
```

Schema changes always go through Alembic — tables are never modified manually.

### 5. Start the server

```bash
uvicorn app.main:app --reload
```

- API: `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`

---

## 🧪 Testing

The test suite follows a layered strategy:

```
Unit → Service → API → Database → End-to-End
```

```bash
pytest
```

Beyond automated tests, every AI-driven pipeline (extraction, retrieval, verdicts) was validated against **real package photographs and known-answer test sets**, not synthetic or mocked data — automated tests alone were never treated as sufficient sign-off for a compliance decision.

---

## 🏛 Engineering Principles

1. **Thin routes** — `Route → Service → Specialized Service → DB / External API`.
2. **Ownership checks** on every inspection-scoped endpoint (`inspection.officer_id == current_user.id`).
3. **Traceability** — every verdict traces back to its source image and source rule clause.
4. **Replaceable providers** — OCR, LLM, embedding, and storage all sit behind service interfaces, not hardwired into routes.
5. **No manual schema changes** — every schema change is an Alembic migration.
6. **AI drafts, the team decides** — code, prompts, and documentation are AI-assisted; legal interpretation, compliance criteria, and real-device validation are not.

---

## 🤖 A Note on How This Was Built

This project was built with heavy AI assistance for code generation, prompt drafting, and documentation — deliberately scoped by a strict rule the team held to throughout: **anything with a real-world or legal consequence, or that requires something only a human has (an account, a physical photo, a judgment call), stayed a team decision.** AI never sourced legal text from memory, never defined compliance criteria, and never signed off on go-live — it drafted first-pass code and prompts against specs the team wrote and validated.

---

## 🗺 Project Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Rules sourcing, requirements, schema design | ✅ Complete |
| 1 | Auth & backend foundation (FastAPI, Postgres, JWT) | ✅ Complete |
| 2 | Image upload, R2 storage, inspection CRUD | ✅ Complete |
| 3 | RAG pipeline — rule chunking, embedding, retrieval | ✅ Complete |
| 4 | Vision AI declaration extraction | ✅ Complete |
| 5 | Compliance verdict engine | ✅ Complete |
| 6 | Frontend inspection flow | ✅ Complete |
| 7 | Report generation | ✅ Complete |
| 8 | History & search | ✅ Complete |
| 9 | Dashboard & analytics | ✅ Complete |
| 10 | Field testing & hardening | ✅ Complete |
| 11 | Deployment | ✅ **Live** — [legal-metrology.online](https://www.legal-metrology.online) |

---

## 👥 Team

Built by **Team SIH-26** for Smart India Hackathon 2026.

<!-- Add contributor names / GitHub handles here -->

---

## 📜 License

<!-- Confirm license before publishing — MIT assumed as a placeholder -->
This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

## 🙏 Acknowledgments

- Legal Metrology (Packaged Commodities) Rules, 2011, sourced from the Department of Consumer Affairs, Government of India.
- Smart India Hackathon, for the problem statement this project was built against.

</div>
