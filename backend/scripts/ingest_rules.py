"""
One-time ingestion script for Phase 3 (RAG layer).

This script:

1. Loads rules_chunks.json
2. Generates Gemini embeddings for every rule
3. Stores the rules and embeddings in PostgreSQL

Run from the backend directory:

    python -m scripts.ingest_rules

Required environment variables in .env:

    AI_API_KEY
    DATABASE_URL
"""

import json
import os

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

from app.services.embedding_service import get_embedding


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")


# rules_chunks.json is outside the backend directory
CHUNKS_FILE = "../Resources/rules_chunks.json"


# ============================================================
# MAIN INGESTION FUNCTION
# ============================================================

def main():

    # --------------------------------------------------------
    # STEP 1: Load rules_chunks.json
    # --------------------------------------------------------

    print("Loading rules_chunks.json...")

    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"Loaded {len(chunks)} rule chunks.")


    # --------------------------------------------------------
    # STEP 2: Connect to PostgreSQL
    # --------------------------------------------------------

    print("Connecting to PostgreSQL...")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("PostgreSQL connection successful.")


    # --------------------------------------------------------
    # STEP 3: Generate embeddings
    # --------------------------------------------------------

    rows = []

    for index, chunk in enumerate(chunks, start=1):

        clause_reference = chunk["clause_reference"]
        chapter = chunk["chapter"]
        title = chunk["title"]
        text = chunk["text"]


        print(
            f"[{index}/{len(chunks)}] "
            f"Generating embedding for {clause_reference}..."
        )


        # Generate 1536-dimensional Gemini embedding
        embedding = get_embedding(
            text,
            task_type="RETRIEVAL_DOCUMENT",
        )


        # Prepare row for PostgreSQL
        rows.append(
            (
                clause_reference,
                chapter,
                title,
                text,
                embedding,
            )
        )


    # --------------------------------------------------------
    # STEP 4: Insert all rules into rules_chunks
    # --------------------------------------------------------

    print("Inserting rules into PostgreSQL...")


    execute_values(
        cur,
        """
        INSERT INTO rules_chunks
        (
            clause_reference,
            chapter,
            title,
            text,
            embedding
        )
        VALUES %s
        """,
        rows,
    )


    # --------------------------------------------------------
    # STEP 5: Commit transaction
    # --------------------------------------------------------

    conn.commit()


    # --------------------------------------------------------
    # STEP 6: Close database connection
    # --------------------------------------------------------

    cur.close()
    conn.close()


    # --------------------------------------------------------
    # STEP 7: Success message
    # --------------------------------------------------------

    print()
    print("==================================================")
    print("RAG INGESTION COMPLETED SUCCESSFULLY")
    print("==================================================")
    print(f"Total rule chunks inserted: {len(rows)}")
    print("Embedding model: gemini-embedding-001")
    print("Embedding dimensions: 1536")
    print("==================================================")


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()