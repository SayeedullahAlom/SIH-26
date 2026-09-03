from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.rag_service import generate_rag_answer


router = APIRouter(
    prefix="/rag",
    tags=["RAG"]
)


class RAGQuery(BaseModel):
    query: str
    top_k: int = 5


@router.post("/query")
def rag_query(request: RAGQuery):

    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty"
        )

    try:
        result = generate_rag_answer(
            query=request.query,
            top_k=request.top_k
        )

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
