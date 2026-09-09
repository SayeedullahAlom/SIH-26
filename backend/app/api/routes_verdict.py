import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.inspection import Inspection
from app.models.user import User
from app.schemas.verdict import (
    CategoryVerdict,
    InspectionVerdictResponse,
)
from app.services.verdict_service import run_compliance_verdict


router = APIRouter(
    prefix="/inspections",
    tags=["verdict"],
)


@router.post(
    "/{inspection_id}/verdict",
    response_model=InspectionVerdictResponse,
)
def get_compliance_verdict(
    inspection_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    if inspection.officer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this inspection",
        )

    try:
        results = run_compliance_verdict(
            db,
            inspection_id,
        )

    except ValueError as exc:
        print(
            f"VERDICT VALUE ERROR: {exc}"
        )

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print(
            "VERDICT ENGINE ERROR:",
            type(exc).__name__,
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail="Compliance verdict evaluation failed",
        ) from exc

    if not results:
        raise HTTPException(
            status_code=500,
            detail="Compliance verdict engine returned no results",
        )

    categories = [
        CategoryVerdict(
            category=result.category,
            verdict=result.verdict,
            reasoning=result.reasoning or "",
            evidence_field=result.evidence_field,
            evidence_value=result.evidence_value,
            rule_reference=result.rule_reference,
        )
        for result in results
    ]

    # --------------------------------------------------------
    # Overall status
    #
    # ISSUE beats REVIEW_REQUIRED.
    # REVIEW_REQUIRED beats PASS.
    # NOT_APPLICABLE does not affect overall status.
    # --------------------------------------------------------

    if any(
        result.verdict == "ISSUE"
        for result in results
    ):
        overall = "ISSUE"

    elif any(
        result.verdict == "REVIEW_REQUIRED"
        for result in results
    ):
        overall = "REVIEW_REQUIRED"

    elif all(
        result.verdict == "NOT_APPLICABLE"
        for result in results
    ):
        overall = "NOT_APPLICABLE"

    else:
        overall = "PASS"

    return InspectionVerdictResponse(
        inspection_id=inspection.id,
        overall_status=overall,
        categories=categories,
        created_at=results[0].created_at,
    )