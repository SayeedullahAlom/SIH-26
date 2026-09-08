import psycopg2
from app.core.config import settings

# Parse the database URL from settings
db_url = str(settings.DATABASE_URL)
if db_url.startswith("postgresql+psycopg2://"):
    db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")

print("Connecting to database...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

# 1. Enable uuid-ossp extension if not enabled
cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

# 2. Create table with fallback UUID function
ddl = """
CREATE TABLE IF NOT EXISTS inspection_extractions (
    id UUID PRIMARY KEY DEFAULT coalesce(gen_random_uuid(), uuid_generate_v4()),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    extraction_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

print("Executing DDL...")
cur.execute(ddl)

# 3. Verify
cur.execute("SELECT to_regclass('inspection_extractions');")
result = cur.fetchone()[0]

cur.close()
conn.close()

if result:
    print(f"VERIFIED: '{result}' exists in the database!")
else:
    print("FAILED: Table was not created.")