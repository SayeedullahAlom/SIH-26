import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.inspection import Inspection
from app.models.inspection_image import InspectionImage
from app.models.inspection_extraction import InspectionExtraction
from app.models.user import User
from app.services.extraction_service import extract_from_images
from app.services.storage_service import get_object_bytes


router = APIRouter(
    prefix="/inspections",
    tags=["extraction"],
)


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
def extract_inspection(
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
        extraction_result = extract_from_images(image_data)

    except Exception as exc:
    	print(f"VISION AI ERROR: {type(exc).__name__}: {exc}")
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