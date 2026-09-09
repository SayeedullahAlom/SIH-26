from __future__ import annotations

import re
import uuid
from decimal import Decimal, InvalidOperation
from typing import Any, Callable

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.compliance_verdict import ComplianceVerdict
from app.models.inspection_extraction import InspectionExtraction


# ============================================================
# LEGAL DECLARATION REGISTRY
# ============================================================

DECLARATION_RULES = {
    "package_scope": {
        "rule_reference": "Rule 3",
        "label": "Package Scope",
    },

    "manufacturer_packer_importer": {
        "rule_reference": "Rule 6(1)(a)",
        "label": "Manufacturer / Packer / Importer",
    },

    "product_identity": {
        "rule_reference": "Rule 6(1)(b)",
        "label": "Product Identity",
    },

    "net_quantity": {
        "rule_reference": "Rule 6(1)(c)",
        "label": "Net Quantity",
    },

    "date_info": {
        "rule_reference": "Rule 6(1)(d)",
        "label": "Date Information",
    },

    "mrp": {
        "rule_reference": "Rule 6(1)(e)",
        "label": "Maximum Retail Price (MRP)",
    },

    "dimensions": {
        "rule_reference": "Rule 6(1)(f)-(g)",
        "label": "Dimensions",
    },

    "consumer_care": {
        "rule_reference": "Rule 6(2)",
        "label": "Consumer Care Details",
    },
}


# ============================================================
# EXTRACTION HELPERS (OFFICER OVERRIDE AWARE)
# ============================================================

def _field(
    extraction: dict[str, Any],
    field_name: str,
) -> dict[str, Any]:

    raw = extraction.get(field_name)

    if not isinstance(raw, dict):
        return {
            "value": None,
            "raw_value": None,
            "confidence": None,
            "status": "not_visible",
            "is_edited": False,
        }

    # Prioritize officer edited_value for compliance logic if present
    effective_value = (
        raw.get("edited_value")
        if raw.get("edited_value") is not None
        else raw.get("value")
    )

    return {
        "value": effective_value,
        "raw_value": raw.get("raw_value", raw.get("value")),
        "confidence": raw.get("confidence"),
        "status": str(
            raw.get("status", "not_visible")
        ).lower(),
        "is_edited": bool(raw.get("is_edited", False)),
    }


def _value(
    extraction: dict[str, Any],
    field_name: str,
) -> Any:

    return _field(
        extraction,
        field_name,
    )["value"]


def _status(
    extraction: dict[str, Any],
    field_name: str,
) -> str:

    return _field(
        extraction,
        field_name,
    )["status"]


def _is_visible(
    extraction: dict[str, Any],
    field_name: str,
) -> bool:

    field = _field(
        extraction,
        field_name,
    )

    return (
        field["status"] == "visible"
        and field["value"] not in (None, "")
    )


def _is_illegible(
    extraction: dict[str, Any],
    field_name: str,
) -> bool:

    return (
        _status(
            extraction,
            field_name,
        )
        == "illegible"
    )


# ============================================================
# RESULT HELPER
# ============================================================

def _result(
    verdict: str,
    reasoning: str,
    evidence_field: str | None = None,
    evidence_value: str | None = None,
) -> dict[str, Any]:

    return {
        "verdict": verdict,
        "reasoning": reasoning,
        "evidence_field": evidence_field,
        "evidence_value": evidence_value,
    }


# ============================================================
# QUANTITY PARSING
# ============================================================

def _normalise_unit(
    unit: Any,
) -> str | None:

    if unit is None:
        return None

    value = str(unit).strip().lower()

    value = value.replace(".", "")
    value = value.replace(" ", "")

    aliases = {
        "kg": "kg",
        "kgs": "kg",
        "kilogram": "kg",
        "kilograms": "kg",

        "g": "g",
        "gm": "g",
        "gms": "g",
        "gram": "g",
        "grams": "g",

        "l": "l",
        "ltr": "l",
        "ltrs": "l",
        "litre": "l",
        "litres": "l",
        "liter": "l",
        "liters": "l",

        "ml": "ml",
        "millilitre": "ml",
        "millilitres": "ml",
        "milliliter": "ml",
        "milliliters": "ml",
    }

    return aliases.get(value)


def _extract_quantity_and_unit(
    extraction: dict[str, Any],
) -> tuple[Decimal | None, str | None]:

    quantity_field = _field(
        extraction,
        "net_quantity",
    )

    unit_field = _field(
        extraction,
        "net_quantity_unit",
    )

    raw_quantity = quantity_field.get("value")
    raw_unit = unit_field.get("value")

    if raw_quantity in (None, ""):
        return None, None

    quantity_text = str(
        raw_quantity
    ).strip()

    # --------------------------------------------------------
    # Extract number
    # --------------------------------------------------------

    number_match = re.search(
        r"\d+(?:,\d{3})*(?:\.\d+)?",
        quantity_text,
    )

    if not number_match:
        return None, None

    number_text = (
        number_match.group(0)
        .replace(",", "")
    )

    try:
        quantity = Decimal(
            number_text
        )
    except InvalidOperation:
        return None, None

    # --------------------------------------------------------
    # First preference:
    # separately extracted unit
    # --------------------------------------------------------

    unit = _normalise_unit(
        raw_unit
    )

    # --------------------------------------------------------
    # If unit field is missing, extract it from:
    #
    # "500 ml"
    # "500ml"
    # "1 kg"
    # "2.5 L"
    # --------------------------------------------------------

    if unit is None:

        unit_match = re.search(
            r"(kg|kgs|kilograms?|"
            r"g|gm|gms|grams?|"
            r"ml|millilit(?:re|er)s?|"
            r"l|ltr|ltrs|lit(?:re|er)s?)",
            quantity_text.lower(),
        )

        if unit_match:
            unit = _normalise_unit(
                unit_match.group(1)
            )

    return quantity, unit


def _quantity_in_kg(
    extraction: dict[str, Any],
) -> Decimal | None:

    quantity, unit = _extract_quantity_and_unit(
        extraction
    )

    if quantity is None:
        return None

    if unit == "kg":
        return quantity

    if unit == "g":
        return quantity / Decimal("1000")

    return None


def _quantity_in_litres(
    extraction: dict[str, Any],
) -> Decimal | None:

    quantity, unit = _extract_quantity_and_unit(
        extraction
    )

    if quantity is None:
        return None

    if unit == "l":
        return quantity

    if unit == "ml":
        return quantity / Decimal("1000")

    return None


# ============================================================
# RULE 3
# PACKAGE SCOPE
# ============================================================

def evaluate_package_scope(
    extraction: dict[str, Any],
) -> dict[str, Any]:

    quantity, unit = _extract_quantity_and_unit(
        extraction
    )

    if quantity is None or unit is None:

        return _result(
            "REVIEW_REQUIRED",
            (
                "The declared net quantity could not be "
                "confidently interpreted. The 25 kg / 25 litre "
                "applicability threshold therefore requires "
                "manual review."
            ),
            evidence_field="net_quantity",
            evidence_value=str(
                _value(
                    extraction,
                    "net_quantity",
                )
                or ""
            ),
        )

    # --------------------------------------------------------
    # MASS
    # --------------------------------------------------------

    if unit in {"kg", "g"}:

        quantity_kg = (
            quantity
            if unit == "kg"
            else quantity / Decimal("1000")
        )

        if quantity_kg > Decimal("25"):

            return _result(
                "PASS",
                (
                    f"The declared quantity is "
                    f"{quantity_kg} kg, which is above "
                    "25 kg. The Chapter II packaged-commodity "
                    "requirements covered by the 25 kg threshold "
                    "are therefore not applicable."
                ),
                evidence_field="net_quantity",
                evidence_value=(
                    f"{quantity} {unit}"
                ),
            )

        return _result(
            "PASS",
            (
                f"The declared quantity is "
                f"{quantity_kg} kg, which is not above "
                "25 kg. The normal Chapter II packaged-commodity "
                "requirements apply."
            ),
            evidence_field="net_quantity",
            evidence_value=(
                f"{quantity} {unit}"
            ),
        )

    # --------------------------------------------------------
    # LIQUID VOLUME
    # --------------------------------------------------------

    if unit in {"l", "ml"}:

        quantity_litres = (
            quantity
            if unit == "l"
            else quantity / Decimal("1000")
        )

        if quantity_litres > Decimal("25"):

            return _result(
                "PASS",
                (
                    f"The declared quantity is "
                    f"{quantity_litres} litres, which is above "
                    "25 litres. The Chapter II packaged-commodity "
                    "requirements covered by the 25 litre threshold "
                    "are therefore not applicable."
                ),
                evidence_field="net_quantity",
                evidence_value=(
                    f"{quantity} {unit}"
                ),
            )

        return _result(
            "PASS",
            (
                f"The declared quantity is "
                f"{quantity_litres} litres, which is not above "
                "25 litres. The normal Chapter II packaged-commodity "
                "requirements apply."
            ),
            evidence_field="net_quantity",
            evidence_value=(
                f"{quantity} {unit}"
            ),
        )

    return _result(
        "REVIEW_REQUIRED",
        (
            f"The unit '{unit}' could not be reliably classified "
            "for the package-scope applicability test."
        ),
        evidence_field="net_quantity",
        evidence_value=str(
            quantity
        ),
    )


# ============================================================
# RULE 6(1)(a)
# MANUFACTURER / PACKER / IMPORTER
# ============================================================

def evaluate_manufacturer_packer_importer(
    extraction: dict[str, Any],
) -> dict[str, Any]:

    parties = [
        (
            "manufacturer",
            "manufacturer_name",
            "manufacturer_address",
        ),
        (
            "packer",
            "packer_name",
            "packer_address",
        ),
        (
            "importer",
            "importer_name",
            "importer_address",
        ),
    ]

    illegible_fields = []

    for _, name_field, address_field in parties:

        if _is_illegible(
            extraction,
            name_field,
        ):
            illegible_fields.append(
                name_field
            )

        if _is_illegible(
            extraction,
            address_field,
        ):
            illegible_fields.append(
                address_field
            )

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # Rule 6(1)(a) is satisfied when the applicable responsible
    # party is identified with name + address.
    #
    # We do NOT require manufacturer + packer + importer all
    # at the same time.
    # --------------------------------------------------------

    for role, name_field, address_field in parties:

        if (
            _is_visible(
                extraction,
                name_field,
            )
            and _is_visible(
                extraction,
                address_field,
            )
        ):

            return _result(
                "PASS",
                (
                    f"{role.capitalize()} name and address "
                    "are visible."
                ),
                evidence_field=(
                    f"{name_field}, {address_field}"
                ),
                evidence_value=(
                    f"{_value(extraction, name_field)} | "
                    f"{_value(extraction, address_field)}"
                ),
            )

    # --------------------------------------------------------
    # Partial / illegible information
    # --------------------------------------------------------

    if illegible_fields:

        return _result(
            "REVIEW_REQUIRED",
            (
                "A manufacturer, packer, or importer declaration "
                "appears to be present but one or more fields "
                "are illegible."
            ),
            evidence_field=", ".join(
                illegible_fields
            ),
        )

    # --------------------------------------------------------
    # Name without address
    # --------------------------------------------------------

    for role, name_field, address_field in parties:

        if (
            _is_visible(
                extraction,
                name_field,
            )
            and not _is_visible(
                extraction,
                address_field,
            )
        ):

            return _result(
                "ISSUE",
                (
                    f"{role.capitalize()} name was detected, "
                    "but the corresponding address was not detected."
                ),
                evidence_field=name_field,
                evidence_value=str(
                    _value(
                        extraction,
                        name_field,
                    )
                ),
            )

    return _result(
        "ISSUE",
        (
            "No complete applicable manufacturer, packer, "
            "or importer name-and-address declaration "
            "was detected."
        ),
    )


# ============================================================
# RULE 6(1)(b)
# PRODUCT IDENTITY
# ============================================================

def evaluate_product_identity(
    extraction: dict[str, Any],
) -> dict[str, Any]:

    generic_name = _field(
        extraction,
        "generic_name",
    )

    product_name = _field(
        extraction,
        "product_name",
    )

    # Generic/common name is the important legal field.

    if (
        generic_name["status"] == "visible"
        and generic_name["value"]
    ):

        return _result(
            "PASS",
            (
                "The common or generic name of the "
                "commodity was detected."
            ),
            evidence_field="generic_name",
            evidence_value=str(
                generic_name["value"]
            ),
        )

    if generic_name["status"] == "illegible":

        return _result(
            "REVIEW_REQUIRED",
            (
                "A common or generic name appears to be "
                "present but is illegible."
            ),
            evidence_field="generic_name",
        )

    if product_name["status"] == "illegible":

        return _result(
            "REVIEW_REQUIRED",
            (
                "Product identity text was detected but is "
                "illegible, while the generic/common name "
                "was not clearly extracted."
            ),
            evidence_field="product_name",
        )

    return _result(
        "ISSUE",
        (
            "Required common or generic name of the "
            "commodity was not detected."
        ),
    )


# ============================================================
# RULE 6(1)(c)
# NET QUANTITY
# ============================================================

def evaluate_net_quantity(
    extraction: dict[str, Any],
) -> dict[str, Any]:

    quantity = _field(
        extraction,
        "net_quantity",
    )

    unit = _field(
        extraction,
        "net_quantity_unit",
    )

    # --------------------------------------------------------
    # Normal case:
    #
    # net_quantity = 500
    # net_quantity_unit = ml
    # --------------------------------------------------------

    if (
        quantity["status"] == "visible"
        and quantity["value"]
        and unit["status"] == "visible"
        and unit["value"]
    ):

        return _result(
            "PASS",
            (
                "Net quantity and its unit of measurement "
                "are visible."
            ),
            evidence_field=(
                "net_quantity, net_quantity_unit"
            ),
            evidence_value=(
                f"{quantity['value']} "
                f"{unit['value']}"
            ),
        )

    # --------------------------------------------------------
    # Combined extraction case:
    #
    # net_quantity = "500 ml"
    # net_quantity_unit = missing
    #
    # Vision AI sometimes returns the declaration this way.
    # It is still sufficient to identify the declaration.
    # --------------------------------------------------------

    combined_quantity = _extract_quantity_and_unit(
        extraction
    )

    if (
        quantity["status"] == "visible"
        and quantity["value"]
        and combined_quantity[0] is not None
        and combined_quantity[1] is not None
    ):

        parsed_quantity, parsed_unit = (
            combined_quantity
        )

        return _result(
            "PASS",
            (
                "Net quantity declaration was detected "
                f"as {parsed_quantity} {parsed_unit}."
            ),
            evidence_field="net_quantity",
            evidence_value=str(
                quantity["value"]
            ),
        )

    # --------------------------------------------------------
    # Illegible
    # --------------------------------------------------------

    if (
        quantity["status"] == "illegible"
        or unit["status"] == "illegible"
    ):

        return _result(
            "REVIEW_REQUIRED",
            (
                "Net quantity or its unit is present "
                "but illegible."
            ),
            evidence_field=(
                "net_quantity, net_quantity_unit"
            ),
        )

    # --------------------------------------------------------
    # Missing quantity
    # --------------------------------------------------------

    if not quantity["value"]:

        return _result(
            "ISSUE",
            (
                "Required net quantity declaration "
                "was not detected."
            ),
        )

    # --------------------------------------------------------
    # Missing unit
    # --------------------------------------------------------

    if not unit["value"]:

        return _result(
            "ISSUE",
            (
                "Net quantity was detected, but its "
                "unit of measurement was not detected."
            ),
            evidence_field="net_quantity",
            evidence_value=str(
                quantity["value"]
            ),
        )

    return _result(
        "ISSUE",
        "Net quantity declaration is incomplete.",
    )


# ============================================================
# RULE 6(1)(d)
# DATE INFORMATION
# ============================================================

def evaluate_date_info(
    extraction: dict[str, Any],
) -> dict[str, Any]:

    manufacture_date = _field(
        extraction,
        "manufacture_date",
    )

    packing_date = _field(
        extraction,
        "packing_date",
    )

    import_date = _field(
        extraction,
        "import_date",
    )

    # --------------------------------------------------------
    # Manufacture date
    # --------------------------------------------------------

    if (
        manufacture_date["status"] == "visible"
        and manufacture_date["value"]
    ):

        return _result(
            "PASS",
            "Manufacture date information was detected.",
            evidence_field="manufacture_date",
            evidence_value=str(
                manufacture_date["value"]
            ),
        )

    # --------------------------------------------------------
    # Packing date
    # --------------------------------------------------------

    if (
        packing_date["status"] == "visible"
        and packing_date["value"]
    ):

        return _result(
            "PASS",
            "Packing date information was detected.",
            evidence_field="packing_date",
            evidence_value=str(
                packing_date["value"]
            ),
        )

    # --------------------------------------------------------
    # Import date
    # --------------------------------------------------------

    if (
        import_date["status"] == "visible"
        and import_date["value"]
    ):

        return _result(
            "PASS",
            "Import date information was detected.",
            evidence_field="import_date",
            evidence_value=str(
                import_date["value"]
            ),
        )

    # --------------------------------------------------------
    # Illegible
    # --------------------------------------------------------

    if any(
        field["status"] == "illegible"
        for field in (
            manufacture_date,
            packing_date,
            import_date,
        )
    ):

        return _result(
            "REVIEW_REQUIRED",
            (
                "Date information appears to be present "
                "but could not be read reliably."
            ),
            evidence_field=(
                "manufacture_date, packing_date, import_date"
            ),
        )

    return _result(
        "ISSUE",
        (
            "Required manufacture, packing, or import "
            "date information was not detected."
        ),
    )


# ============================================================
# RULE 6(1)(e)
# MRP
# ============================================================

def evaluate_mrp(
    extraction: dict[str, Any],
) -> dict[str, Any]:

    mrp = _field(
        extraction,
        "mrp",
    )

    if (
        mrp["status"] == "visible"
        and mrp["value"]
    ):

        value = str(
            mrp["value"]
        )

        if re.search(
            r"\d",
            value,
        ):

            return _result(
                "PASS",
                (
                    "MRP is visible and contains a "
                    "numeric price value."
                ),
                evidence_field="mrp",
                evidence_value=value,
            )

        return _result(
            "ISSUE",
            (
                "MRP text was detected but no numeric "
                "price value was found."
            ),
            evidence_field="mrp",
            evidence_value=value,
        )

    if mrp["status"] == "illegible":

        return _result(
            "REVIEW_REQUIRED",
            (
                "MRP appears to be present but is illegible."
            ),
            evidence_field="mrp",
        )

    return _result(
        "ISSUE",
        "Required MRP declaration was not detected.",
    )


# ============================================================
# RULE 6(1)(f)-(g)
# DIMENSIONS
# ============================================================

def evaluate_dimensions(
    extraction: dict[str, Any],
) -> dict[str, Any]:

    dimensions = _field(
        extraction,
        "dimensions",
    )

    # --------------------------------------------------------
    # Dimensions explicitly present
    # --------------------------------------------------------

    if (
        dimensions["status"] == "visible"
        and dimensions["value"]
    ):

        return _result(
            "PASS",
            "Dimensions declaration is visible.",
            evidence_field="dimensions",
            evidence_value=str(
                dimensions["value"]
            ),
        )

    # --------------------------------------------------------
    # Dimensions appear present but unreadable
    # --------------------------------------------------------

    if dimensions["status"] == "illegible":

        return _result(
            "REVIEW_REQUIRED",
            (
                "A dimensions declaration appears to be "
                "present but is illegible. Manual verification "
                "is required."
            ),
            evidence_field="dimensions",
        )

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # Absence of dimensions is NOT a violation.
    #
    # Dimensions are conditional under Rule 6(1)(f)-(g).
    # Unless the system has established that dimensions are
    # applicable to this commodity, we do not infer a violation.
    #
    # For the current MVP, this is treated as COMPLIANT rather
    # than a violation.
    # --------------------------------------------------------

    return _result(
        "PASS",
        (
            "No dimensions declaration was detected. "
            "Dimensions are conditional under Rule 6(1)(f)-(g), "
            "and the available extraction does not establish "
            "that a dimensions declaration is applicable. "
            "Therefore, no violation is inferred."
        ),
        evidence_field="dimensions",
        evidence_value=None,
    )


# ============================================================
# RULE 6(2)
# CONSUMER CARE
# ============================================================

def evaluate_consumer_care(
    extraction: dict[str, Any],
) -> dict[str, Any]:

    consumer_care = _field(
        extraction,
        "consumer_care",
    )

    if (
        consumer_care["status"] == "visible"
        and consumer_care["value"]
    ):

        return _result(
            "PASS",
            (
                "Consumer care details are present "
                "and visible."
            ),
            evidence_field="consumer_care",
            evidence_value=str(
                consumer_care["value"]
            ),
        )

    if consumer_care["status"] == "illegible":

        return _result(
            "REVIEW_REQUIRED",
            (
                "Consumer care details appear to be "
                "present but are illegible."
            ),
            evidence_field="consumer_care",
        )

    return _result(
        "ISSUE",
        (
            "Required consumer care details "
            "were not detected."
        ),
    )


# ============================================================
# EVALUATOR REGISTRY
# ============================================================

CATEGORY_EVALUATORS: dict[
    str,
    Callable[
        [dict[str, Any]],
        dict[str, Any],
    ],
] = {

    "package_scope":
        evaluate_package_scope,

    "manufacturer_packer_importer":
        evaluate_manufacturer_packer_importer,

    "product_identity":
        evaluate_product_identity,

    "net_quantity":
        evaluate_net_quantity,

    "date_info":
        evaluate_date_info,

    "mrp":
        evaluate_mrp,

    "dimensions":
        evaluate_dimensions,

    "consumer_care":
        evaluate_consumer_care,
}


# ============================================================
# APPLICABILITY
# ============================================================

def is_declaration_applicable(
    declaration_type: str,
    extraction: dict[str, Any],
) -> bool:

    # Every registered category can be evaluated.
    # Specific conditional logic is handled by the evaluator.

    return declaration_type in DECLARATION_RULES


# ============================================================
# RULE RETRIEVAL
# ============================================================

def get_rule_by_reference(
    db: Session,
    clause_reference: str,
) -> dict[str, Any] | None:

    query = text(
        """
        SELECT
            id,
            clause_reference,
            chapter,
            title,
            text
        FROM rules_chunks
        WHERE LOWER(TRIM(clause_reference))
              = LOWER(TRIM(:clause_reference))
        LIMIT 1
        """
    )

    row = db.execute(
        query,
        {
            "clause_reference":
                clause_reference,
        },
    ).fetchone()

    if row:

        return {
            "id": row[0],
            "clause_reference": row[1],
            "chapter": row[2],
            "title": row[3],
            "text": row[4],
        }

    # --------------------------------------------------------
    # Fallback for formatting differences.
    # --------------------------------------------------------

    normalised_reference = re.sub(
        r"[^a-z0-9]",
        "",
        clause_reference.lower(),
    )

    rows = db.execute(
        text(
            """
            SELECT
                id,
                clause_reference,
                chapter,
                title,
                text
            FROM rules_chunks
            """
        )
    ).fetchall()

    for row in rows:

        stored_reference = re.sub(
            r"[^a-z0-9]",
            "",
            str(row[1]).lower(),
        )

        if (
            stored_reference
            == normalised_reference
        ):

            return {
                "id": row[0],
                "clause_reference": row[1],
                "chapter": row[2],
                "title": row[3],
                "text": row[4],
            }

    return None


# ============================================================
# LATEST EXTRACTION
# ============================================================

def get_latest_extraction(
    db: Session,
    inspection_id: uuid.UUID,
) -> dict[str, Any] | None:

    record = (
        db.query(
            InspectionExtraction
        )
        .filter(
            InspectionExtraction.inspection_id
            == inspection_id
        )
        .order_by(
            InspectionExtraction.created_at.desc()
        )
        .first()
    )

    if record is None:
        return None

    return record.extraction_data


# ============================================================
# STORE VERDICT
# ============================================================

def _store_verdict(
    db: Session,
    inspection_id: uuid.UUID,
    category: str,
    evaluation: dict[str, Any],
    rule_reference: str,
    rule: dict[str, Any] | None,
) -> ComplianceVerdict:

    # Use database clause reference when available.
    # Otherwise preserve the configured legal reference.
    resolved_reference = (
        rule["clause_reference"]
        if rule
        else rule_reference
    )

    verdict = ComplianceVerdict(
        inspection_id=inspection_id,
        category=category,
        verdict=evaluation["verdict"],
        reasoning=evaluation["reasoning"],
        evidence_field=evaluation.get(
            "evidence_field"
        ),
        evidence_value=evaluation.get(
            "evidence_value"
        ),
        rule_reference=resolved_reference,
    )

    db.add(verdict)

    return verdict


# ============================================================
# MAIN VERDICT ENGINE
# ============================================================

def run_compliance_verdict(
    db: Session,
    inspection_id: uuid.UUID,
) -> list[ComplianceVerdict]:

    # --------------------------------------------------------
    # 1. Get latest extraction
    # --------------------------------------------------------

    extraction = get_latest_extraction(
        db,
        inspection_id,
    )

    if extraction is None:

        raise ValueError(
            "No extraction is available for this inspection."
        )

    if not isinstance(
        extraction,
        dict,
    ):

        raise ValueError(
            "Stored extraction data is invalid."
        )

    # --------------------------------------------------------
    # 2. Remove old verdicts
    #
    # Re-running the endpoint should replace the old verdict
    # instead of creating duplicate rows.
    # --------------------------------------------------------

    db.query(
        ComplianceVerdict
    ).filter(
        ComplianceVerdict.inspection_id
        == inspection_id
    ).delete(
        synchronize_session=False
    )

    results: list[
        ComplianceVerdict
    ] = []

    # --------------------------------------------------------
    # 3. Evaluate every registered category
    # --------------------------------------------------------

    for (
        declaration_type,
        metadata,
    ) in DECLARATION_RULES.items():

        # ----------------------------------------------------
        # Applicability
        # ----------------------------------------------------

        if not is_declaration_applicable(
            declaration_type,
            extraction,
        ):
            continue

        rule_reference = metadata[
            "rule_reference"
        ]

        # ----------------------------------------------------
        # Retrieve authoritative rule
        # ----------------------------------------------------

        rule = get_rule_by_reference(
            db,
            rule_reference,
        )

        # ----------------------------------------------------
        # Do not crash the entire verdict engine simply because
        # a rule reference was stored slightly differently in
        # rules_chunks.
        #
        # The configured reference is retained as fallback.
        # ----------------------------------------------------

        evaluator = CATEGORY_EVALUATORS[
            declaration_type
        ]

        evaluation = evaluator(
            extraction
        )

        # ----------------------------------------------------
        # Store verdict
        # ----------------------------------------------------

        verdict = _store_verdict(
            db=db,
            inspection_id=inspection_id,
            category=declaration_type,
            evaluation=evaluation,
            rule_reference=rule_reference,
            rule=rule,
        )

        results.append(
            verdict
        )

    # --------------------------------------------------------
    # 4. Commit
    # --------------------------------------------------------

    db.commit()

    # --------------------------------------------------------
    # 5. Refresh generated fields
    # --------------------------------------------------------

    for result in results:
        db.refresh(result)

    return results