import copy
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.inspection import Inspection
from app.models.inspection_extraction import InspectionExtraction
from app.models.inspection_image import InspectionImage
from app.models.user import User
from app.services.extraction_service import extract_from_images
from app.services.storage_service import get_object_bytes


router = APIRouter(
    prefix="/inspections",
    tags=["extraction"],
)


class ExtractionFieldPatch(BaseModel):
    field_name: str
    edited_value: str
    status: str = "visible"


def get_object_key(s3_url: str) -> str:
    """
    Convert the stored image reference into an R2 object key.

    Supports either:
    - a plain object key
    - a full URL
    """
    if s3_url.startswith("http://") or s3_url.startswith("https://"):
        return s3_url.split(".com/", 1)[-1]

    return s3_url


@router.post("/{inspection_id}/extract")
async def extract_inspection(
    inspection_id: uuid.UUID,
    request: Request,
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

    # 3. Get all images for this inspection
    images = db.scalars(
        select(InspectionImage).where(
            InspectionImage.inspection_id == inspection_id
        )
    ).all()

    if not images:
        raise HTTPException(
            status_code=400,
            detail="No images found for this inspection",
        )

    # 4. Download images from R2
    image_data = []

    for image in images:
        try:
            object_key = get_object_key(image.s3_url)
            image_bytes = get_object_bytes(object_key)

            mime_type = "image/jpeg"

            if object_key.lower().endswith(".png"):
                mime_type = "image/png"
            elif object_key.lower().endswith(".webp"):
                mime_type = "image/webp"

            image_data.append(
                (image_bytes, mime_type)
            )

        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to retrieve image {image.id} from storage",
            ) from exc

    # 5. Run Vision AI extraction
    try:
        extraction_result = await extract_from_images(
            image_data,
            request=request,
        )

    except HTTPException:
        raise

    except Exception as exc:
        print(
            f"VISION AI ERROR: {type(exc).__name__}: {exc}"
        )
        raise HTTPException(
            status_code=502,
            detail="Vision AI extraction failed",
        ) from exc

    # 6. Store the extraction result
    extraction = InspectionExtraction(
        inspection_id=inspection.id,
        extraction_data=extraction_result.model_dump(mode="json"),
    )

    db.add(extraction)
    db.commit()
    db.refresh(extraction)

    # 7. Return the structured extraction
    return {
        "inspection_id": inspection.id,
        "extraction_id": extraction.id,
        "extraction": extraction_result.model_dump(mode="json"),
    }


@router.patch("/{inspection_id}/extraction")
def update_extracted_declaration(
    inspection_id: uuid.UUID,
    payload: ExtractionFieldPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Allows the officer to manually correct a declaration field before compliance checks.
    Preserves raw Vision AI values while updating the active value and audit flags.
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
            detail="You do not have access to this inspection",
        )

    latest = (
        db.query(InspectionExtraction)
        .filter(InspectionExtraction.inspection_id == inspection_id)
        .order_by(InspectionExtraction.created_at.desc())
        .first()
    )

    if not latest:
        raise HTTPException(
            status_code=404,
            detail="No extraction found to update for this inspection",
        )

    # Deep copy to decouple references
    data: dict[str, Any] = copy.deepcopy(latest.extraction_data or {})
    current_field = data.get(payload.field_name, {})

    if not isinstance(current_field, dict):
        current_field = {"value": current_field}

    # Retain the initial vision value if not already recorded
    if "raw_value" not in current_field:
        current_field["raw_value"] = current_field.get("value")

    # Update to the officer's edited values
    current_field["value"] = payload.edited_value
    current_field["edited_value"] = payload.edited_value
    current_field["status"] = payload.status
    current_field["is_edited"] = True

    data[payload.field_name] = current_field
    latest.extraction_data = data

    # Instruct SQLAlchemy to mark the JSON column dirty
    flag_modified(latest, "extraction_data")

    db.commit()
    db.refresh(latest)

    return {
        "status": "success",
        "inspection_id": inspection_id,
        "field_name": payload.field_name,
        "extraction": latest.extraction_data,
    }