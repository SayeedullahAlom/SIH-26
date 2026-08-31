import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.inspection import Inspection
from app.models.inspection_image import InspectionImage
from app.models.user import User
from app.schemas.inspection import (
    PresignedUrlRequest,
    PresignedUrlResponse,
    InspectionCreate,
    InspectionResponse,
    InspectionImageResponse,
)
from app.services.storage import generate_presigned_upload_url, generate_presigned_download_url

router = APIRouter(prefix="/inspections", tags=["inspections"])


@router.post("/presigned-url", response_model=PresignedUrlResponse)
def get_upload_url(
    payload: PresignedUrlRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate a presigned PUT URL for direct client upload to Cloudflare R2."""
    extension = payload.filename.split(".")[-1] if "." in payload.filename else "jpg"
    file_key = f"uploads/{current_user.id}/{uuid.uuid4()}.{extension}"
    upload_url = generate_presigned_upload_url(file_key, payload.content_type)
    return PresignedUrlResponse(upload_url=upload_url, file_key=file_key)


@router.post("", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def create_inspection(
    payload: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new inspection record and attach uploaded image keys."""
    inspection = Inspection(
        officer_id=current_user.id,
        product_name=payload.product_name,
        manufacturer_hint=payload.manufacturer_hint,
        status="pending"
    )
    db.add(inspection)
    db.flush()

    for img in payload.images:
        image_record = InspectionImage(
            inspection_id=inspection.id,
            s3_url=img.file_key,
            side=img.side
        )
        db.add(image_record)

    db.commit()
    db.refresh(inspection)

    image_responses = [
        InspectionImageResponse(
            id=img.id,
            s3_url=img.s3_url,
            side=img.side,
            download_url=generate_presigned_download_url(img.s3_url),
            uploaded_at=img.uploaded_at
        )
        for img in inspection.images
    ]

    return InspectionResponse(
        id=inspection.id,
        officer_id=inspection.officer_id,
        product_name=inspection.product_name,
        manufacturer_hint=inspection.manufacturer_hint,
        status=inspection.status,
        overall_result=inspection.overall_result,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
        images=image_responses
    )


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(
    inspection_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve an inspection and generate fresh presigned viewing URLs for images."""
    inspection = db.query(Inspection).filter(
        Inspection.id == inspection_id,
        Inspection.officer_id == current_user.id
    ).first()
    
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    image_responses = [
        InspectionImageResponse(
            id=img.id,
            s3_url=img.s3_url,
            side=img.side,
            download_url=generate_presigned_download_url(img.s3_url),
            uploaded_at=img.uploaded_at
        )
        for img in inspection.images
    ]

    return InspectionResponse(
        id=inspection.id,
        officer_id=inspection.officer_id,
        product_name=inspection.product_name,
        manufacturer_hint=inspection.manufacturer_hint,
        status=inspection.status,
        overall_result=inspection.overall_result,
        created_at=inspection.created_at,
        updated_at=inspection.updated_at,
        images=image_responses
    )


@router.get("", response_model=List[InspectionResponse])
def list_inspections(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all inspections belonging to the logged-in officer."""
    inspections = db.query(Inspection).filter(
        Inspection.officer_id == current_user.id
    ).offset(skip).limit(limit).all()

    results = []
    for insp in inspections:
        image_responses = [
            InspectionImageResponse(
                id=img.id,
                s3_url=img.s3_url,
                side=img.side,
                download_url=generate_presigned_download_url(img.s3_url),
                uploaded_at=img.uploaded_at
            )
            for img in insp.images
        ]
        results.append(
            InspectionResponse(
                id=insp.id,
                officer_id=insp.officer_id,
                product_name=insp.product_name,
                manufacturer_hint=insp.manufacturer_hint,
                status=insp.status,
                overall_result=insp.overall_result,
                created_at=insp.created_at,
                updated_at=insp.updated_at,
                images=image_responses
            )
        )
    return results