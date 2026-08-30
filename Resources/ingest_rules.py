"""
One-time ingestion script for Phase 3 (RAG layer).
Loads rules_chunks.json into the rules_chunks table with embeddings.

Usage:
    pip install psycopg2-binary anthropic python-dotenv --break-system-packages
    python ingest_rules.py

Requires:
    DATABASE_URL      -- postgres connection string
    EMBEDDING_API_KEY -- key for whichever embedding provider you use
"""

import json
import os
import psycopg2
from psycopg2.extras import execute_values

# --- CONFIG -------------------------------------------------
DATABASE_URL = os.environ["DATABASE_URL"]
CHUNKS_FILE = "rules_chunks.json"


def get_embedding(text: str) -> list[float]:
    """
    Replace this with a real call to your embedding provider.
    Example using OpenAI's embedding API:

        from openai import OpenAI
        client = OpenAI()
        resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return resp.data[0].embedding

    Keep the VECTOR(1536) dimension in schema.sql in sync with
    whichever embedding model you actually use.
    """
    raise NotImplementedError("Wire this up to your embedding provider before running.")


def main():
    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    rows = []
    for chunk in chunks:
        embedding = get_embedding(chunk["text"])
        rows.append((
            chunk["clause_reference"],
            chunk["chapter"],
            chunk["title"],
            chunk["text"],
            embedding,
        ))

    execute_values(
        cur,
        """
        INSERT INTO rules_chunks (clause_reference, chapter, title, text, embedding)
        VALUES %s
        """,
        rows,
    )

    conn.commit()
    cur.close()
    conn.close()
    print(f"Ingested {len(rows)} rule chunks.")


if __name__ == "__main__":
    main()
