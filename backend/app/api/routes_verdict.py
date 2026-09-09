import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.compliance_verdict import ComplianceVerdict
from app.models.inspection import Inspection
from app.models.user import User
from app.schemas.verdict import (
    CategoryVerdict,
    InspectionVerdictResponse,
    VerdictOverrideRequest,
)
from app.services.verdict_service import run_compliance_verdict


router = APIRouter(
    prefix="/inspections",
    tags=["verdict"],
)


def _compute_overall_status(verdicts: list[ComplianceVerdict]) -> str:
    """
    Computes overall status respecting automated verdicts and officer overrides.
    Maps strictly to the database constraint: ('COMPLIANT', 'NON_COMPLIANT', 'REVIEW_REQUIRED')
    """
    effective = [v.officer_verdict or v.verdict for v in verdicts]

    if any(status == "ISSUE" for status in effective):
        return "NON_COMPLIANT"

    if any(status == "REVIEW_REQUIRED" for status in effective):
        return "REVIEW_REQUIRED"

    return "COMPLIANT"


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
        select(Inspection).where(Inspection.id == inspection_id)
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

    # 1. Snapshot prior overrides so re-running the engine doesn't destroy auditor inputs
    existing_records = db.query(ComplianceVerdict).filter(
        ComplianceVerdict.inspection_id == inspection_id
    ).all()

    preserved_overrides = {
        v.category: (v.officer_verdict, v.officer_remarks)
        for v in existing_records
        if v.officer_verdict is not None
    }

    try:
        results = run_compliance_verdict(
            db,
            inspection_id,
        )

    except ValueError as exc:
        print(f"VERDICT VALUE ERROR: {exc}")
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print("VERDICT ENGINE ERROR:", type(exc).__name__, exc)
        raise HTTPException(
            status_code=502,
            detail="Compliance verdict evaluation failed",
        ) from exc

    if not results:
        raise HTTPException(
            status_code=500,
            detail="Compliance verdict engine returned no results",
        )

    # 2. Re-attach snapshot overrides to new rows
    if preserved_overrides:
        for r in results:
            if r.category in preserved_overrides:
                r.officer_verdict, r.officer_remarks = preserved_overrides[r.category]
        db.commit()

    categories = [
        CategoryVerdict(
            category=result.category,
            verdict=result.verdict,
            reasoning=result.reasoning or "",
            evidence_field=result.evidence_field,
            evidence_value=result.evidence_value,
            rule_reference=result.rule_reference,
            officer_verdict=result.officer_verdict,
            officer_remarks=result.officer_remarks,
        )
        for result in results
    ]

    overall = _compute_overall_status(results)
    inspection.overall_result = overall
    db.commit()

    return InspectionVerdictResponse(
        inspection_id=inspection.id,
        overall_status=overall,
        categories=categories,
        created_at=results[0].created_at,
    )


@router.patch("/{inspection_id}/verdicts/override")
def override_category_verdict(
    inspection_id: uuid.UUID,
    payload: VerdictOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Persists an officer's verdict override and justification remarks,
    then recalculates the inspection's overall status.
    """
    inspection = db.scalar(
        select(Inspection).where(Inspection.id == inspection_id)
    )

    if inspection is None:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found",
        )

    if inspection.officer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to modify this inspection",
        )

    verdict_row = db.query(ComplianceVerdict).filter(
        ComplianceVerdict.inspection_id == inspection_id,
        ComplianceVerdict.category == payload.category,
    ).first()

    if not verdict_row:
        raise HTTPException(
            status_code=404,
            detail="Verdict category not found",
        )

    if payload.officer_verdict not in ("PASS", "ISSUE", "REVIEW_REQUIRED"):
        raise HTTPException(
            status_code=400,
            detail="Invalid officer verdict value. Must be PASS, ISSUE, or REVIEW_REQUIRED.",
        )

    verdict_row.officer_verdict = payload.officer_verdict
    verdict_row.officer_remarks = payload.officer_remarks.strip()

    all_verdicts = db.query(ComplianceVerdict).filter(
        ComplianceVerdict.inspection_id == inspection_id
    ).all()

    overall = _compute_overall_status(all_verdicts)
    inspection.overall_result = overall
    db.commit()

    return {
        "status": "success",
        "category": payload.category,
        "officer_verdict": payload.officer_verdict,
        "officer_remarks": payload.officer_remarks,
        "overall_status": overall,
    }