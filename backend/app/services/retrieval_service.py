import os

import psycopg2
from dotenv import load_dotenv

from app.services.embedding_service import get_embedding


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")


def retrieve_relevant_rules(query: str, top_k: int = 5):
    """
    Retrieve the most relevant legal rules from PostgreSQL
    using cosine similarity between the query embedding
    and stored rule embeddings.
    """

    # 1. Convert the user's query into an embedding
    query_embedding = get_embedding(query)

    # 2. Connect to PostgreSQL
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # 3. Search for the most similar rule chunks
    cur.execute(
        """
        SELECT
            id,
            clause_reference,
            chapter,
            title,
            text,
            1 - (embedding <=> %s::vector) AS similarity
        FROM rules_chunks
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> %s::vector
        LIMIT %s;
        """,
        (
            query_embedding,
            query_embedding,
            top_k,
        ),
    )

    rows = cur.fetchall()

    cur.close()
    conn.close()

    # 4. Convert database rows into dictionaries
    results = []

    for row in rows:
        results.append(
            {
                "id": str(row[0]),
                "clause_reference": row[1],
                "chapter": row[2],
                "title": row[3],
                "text": row[4],
                "similarity": float(row[5]),
            }
        )

    return results