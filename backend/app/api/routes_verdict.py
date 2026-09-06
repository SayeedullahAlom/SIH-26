import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.inspection import Inspection
from app.models.user import User
from app.services.verdict_service import run_compliance_verdict
from app.schemas.verdict import InspectionVerdictResponse, CategoryVerdict


router = APIRouter(
    prefix="/inspections",
    tags=["verdict"],
)


@router.post("/{inspection_id}/verdict", response_model=InspectionVerdictResponse)
def get_compliance_verdict(
    inspection_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Find the inspection
    inspection = db.scalar(
        select(Inspection).where(
            Inspection.id == inspection_id
        )
    )

    if inspection is None:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found",
        )

    # 2. Verify ownership
    if inspection.officer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this inspection",
        )

    # 3. Run the verdict engine
    try:
        results = run_compliance_verdict(db, inspection_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"VERDICT ENGINE ERROR: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Compliance verdict evaluation failed",
        ) from exc

    # 4. Build response
    categories = [
        CategoryVerdict(
            category=r.category,
            verdict=r.verdict,
            reasoning=r.reasoning,
            rule_reference=r.rule_reference,
        )
        for r in results
    ]

    overall = "PASS"
    if any(c.verdict == "ISSUE" for c in categories):
        overall = "ISSUE"
    elif any(c.verdict == "REVIEW_REQUIRED" for c in categories):
        overall = "REVIEW_REQUIRED"

    return InspectionVerdictResponse(
        inspection_id=inspection.id,
        overall_status=overall,
        categories=categories,
        created_at=results[0].created_at,
    )