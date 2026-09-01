import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


# Load environment variables from .env
load_dotenv()


# ------------------------------------------------------------
# Gemini configuration
# ------------------------------------------------------------

AI_API_KEY = os.getenv("AI_API_KEY")

if not AI_API_KEY:
    raise RuntimeError("AI_API_KEY is not set")


client = genai.Client(api_key=AI_API_KEY)


EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 1536


# ------------------------------------------------------------
# Generate embedding
# ------------------------------------------------------------

def get_embedding(
    text: str,
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[float]:
    """
    Convert text into a Gemini embedding vector.

    RETRIEVAL_DOCUMENT:
        Used when embedding documents/rules that will be
        stored in the vector database.

    RETRIEVAL_QUERY:
        Used later when embedding a user's search/query.
    """

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIMENSION,
        ),
    )

    embedding = response.embeddings[0].values

    # Make sure the vector dimension matches PostgreSQL
    if len(embedding) != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSION} dimensions, "
            f"but Gemini returned {len(embedding)}"
        )

    return embedding