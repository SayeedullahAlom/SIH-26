-- ============================================================
-- Legal Metrology Compliance App — PostgreSQL Schema
-- Requires the pgvector extension for RAG retrieval (Phase 3)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- USERS (enforcement officers / admins)
-- ------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'officer' CHECK (role IN ('officer', 'admin')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- RULES_CHUNKS — RAG source table, one row per clause chunk
-- Loaded once via the ingestion script from rules_chunks.json
-- ------------------------------------------------------------
CREATE TABLE rules_chunks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clause_reference    TEXT NOT NULL,          -- e.g. 'Rule 6(1)(c)'
    chapter             TEXT NOT NULL,          -- e.g. 'Chapter II - Declarations to be made on every package'
    title               TEXT NOT NULL,          -- e.g. 'Declaration: Net quantity'
    text                TEXT NOT NULL,          -- the actual clause text
    embedding           VECTOR(1536),           -- dimension depends on the embedding model used
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast cosine-similarity retrieval (pgvector >= 0.5)
CREATE INDEX idx_rules_chunks_embedding
    ON rules_chunks USING hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------
-- INSPECTIONS — one row per inspection event
-- ------------------------------------------------------------
CREATE TABLE inspections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    officer_id          UUID NOT NULL REFERENCES users(id),
    product_name        TEXT,                   -- optional, officer-entered
    manufacturer_hint   TEXT,                   -- optional, officer-entered
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    overall_result      TEXT
                            CHECK (overall_result IN ('COMPLIANT', 'NON_COMPLIANT', 'REVIEW_REQUIRED')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspections_officer ON inspections(officer_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_created_at ON inspections(created_at);

-- ------------------------------------------------------------
-- INSPECTION_IMAGES — package photos attached to an inspection
-- ------------------------------------------------------------
CREATE TABLE inspection_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    s3_url          TEXT NOT NULL,
    side            TEXT CHECK (side IN ('front', 'back', 'left', 'right', 'top', 'bottom', 'other')),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspection_images_inspection ON inspection_images(inspection_id);

-- ------------------------------------------------------------
-- DECLARATIONS — fields extracted from the images by the vision AI
-- declaration_type maps directly to Rule 6(1)(a)-(g) and Rule 6(2)
-- ------------------------------------------------------------
CREATE TABLE declarations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id       UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    source_image_id     UUID REFERENCES inspection_images(id),
    declaration_type    TEXT NOT NULL CHECK (declaration_type IN (
                            'manufacturer_packer_importer', -- Rule 6(1)(a)
                            'product_identity',              -- Rule 6(1)(b)
                            'net_quantity',                  -- Rule 6(1)(c)
                            'date_info',                     -- Rule 6(1)(d)
                            'mrp',                            -- Rule 6(1)(e)
                            'dimensions',                     -- Rule 6(1)(f)
                            'consumer_care',                  -- Rule 6(2)
                            'other'                           -- Rule 6(1)(g)
                         )),
    extracted_text      TEXT,                   -- what the vision AI read; NULL/empty = not detected
    legible              BOOLEAN,                -- whether the AI judged the text readable
    bounding_box        JSONB,                   -- {x, y, width, height} on source_image_id, if available
    confidence          NUMERIC(4,3),            -- 0.000–1.000
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_declarations_inspection ON declarations(inspection_id);
CREATE INDEX idx_declarations_type ON declarations(declaration_type);

-- ------------------------------------------------------------
-- CHECKLIST_RESULTS — one row per checklist category per inspection
-- category maps to Section 7 of the requirements doc
-- ------------------------------------------------------------
CREATE TABLE checklist_results (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id           UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    check_type              TEXT NOT NULL CHECK (check_type IN (
                                'identity',           -- commodity properly identified
                                'responsible_party',  -- manufacturer/packer/importer details
                                'quantity',            -- net-quantity declaration
                                'price',                -- MRP declaration
                                'dates',                -- applicable date declarations
                                'consumer_care',        -- consumer-contact details
                                'presentation',         -- visibility/legibility/placement
                                'other'                 -- dimensions, unit sale price, etc.
                             )),
    result                  TEXT NOT NULL CHECK (result IN ('PASS', 'ISSUE', 'REVIEW_REQUIRED')),
    reason_text             TEXT NOT NULL,          -- e.g. "Net quantity declaration not detected."
    related_declaration_id  UUID REFERENCES declarations(id),
    related_rule_chunk_id   UUID REFERENCES rules_chunks(id),  -- the clause used to justify the verdict
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_results_inspection ON checklist_results(inspection_id);
CREATE INDEX idx_checklist_results_type_result ON checklist_results(check_type, result);

-- ------------------------------------------------------------
-- REPORTS — generated PDF inspection reports
-- ------------------------------------------------------------
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    pdf_url         TEXT NOT NULL,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_inspection ON reports(inspection_id);

-- ------------------------------------------------------------
-- Trigger to keep inspections.updated_at current
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inspections_updated_at
    BEFORE UPDATE ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
