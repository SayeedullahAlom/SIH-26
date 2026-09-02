from enum import Enum

from pydantic import BaseModel, Field


class ExtractionStatus(str, Enum):
    VISIBLE = "visible"
    NOT_VISIBLE = "not_visible"
    ILLEGIBLE = "illegible"


class ExtractedField(BaseModel):
    """
    Evidence extracted from a package image.

    This model describes what is visible on the package.
    It does NOT determine legal compliance.
    """

    value: str | None = None

    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    status: ExtractionStatus = ExtractionStatus.NOT_VISIBLE


class ExtractionResult(BaseModel):
    """
    Structured Legal Metrology-relevant information extracted
    from one or more package images.

    This is an extraction model only.
    Compliance decisions belong to Phase 5.
    """

    # ---------------------------------------------------------
    # 1. Commodity identity
    # ---------------------------------------------------------

    product_name: ExtractedField
    generic_name: ExtractedField

    # ---------------------------------------------------------
    # 2. Manufacturer / packer / importer
    # ---------------------------------------------------------

    manufacturer_name: ExtractedField
    manufacturer_address: ExtractedField

    packer_name: ExtractedField
    packer_address: ExtractedField

    importer_name: ExtractedField
    importer_address: ExtractedField

    # ---------------------------------------------------------
    # 3. Country of origin
    # ---------------------------------------------------------

    country_of_origin: ExtractedField

    # ---------------------------------------------------------
    # 4. Net quantity / dimensions
    # ---------------------------------------------------------

    net_quantity: ExtractedField
    net_quantity_unit: ExtractedField

    dimensions: ExtractedField

    # ---------------------------------------------------------
    # 5. Price declarations
    # ---------------------------------------------------------

    mrp: ExtractedField
    unit_sale_price: ExtractedField

    # ---------------------------------------------------------
    # 6. Date declarations
    # ---------------------------------------------------------

    manufacture_date: ExtractedField
    packing_date: ExtractedField
    import_date: ExtractedField

    best_before_or_use_by: ExtractedField

    # ---------------------------------------------------------
    # 7. Consumer information
    # ---------------------------------------------------------

    consumer_care: ExtractedField

    # ---------------------------------------------------------
    # 8. Additional package evidence
    # ---------------------------------------------------------

    batch_or_lot_number: ExtractedField