import os
import uuid

import psycopg2
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.compliance_verdict import ComplianceVerdict
from app.models.inspection import Inspection


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


# ============================================================
# PCR 2011 AUTHORITATIVE RULE MAPPING
# ============================================================
#
# These mappings are defined from the team's compliance criteria.
# RAG is used to store/retrieve the authoritative legal text,
# but semantic similarity is NOT trusted to choose the legal
# clause for a compliance verdict.
#
# ============================================================

CATEGORY_RULE_REFERENCES = {
    "mrp": ["Rule 6(1)(e)"],
    "net_quantity": ["Rule 6(1)(c)"],
    "manufacturer_details": ["Rule 6(1)(a)"],
    "country_of_origin": ["Rule 6(1)(a)"],
    "consumer_care": ["Rule 6(2)"],
}


# ============================================================
# EXACT RULE LOOKUP
# ============================================================

def get_rule_by_reference(clause_reference: str) -> dict | None:
    """
    Retrieve an authoritative PCR 2011 rule directly from
    the rules_chunks table using its clause reference.

    This is safer than relying on semantic top-1 retrieval
    for the legal basis of a compliance verdict.
    """

    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")

    conn = psycopg2.connect(DATABASE_URL)

    try:
        cur = conn.cursor()

        cur.execute(
            """
            SELECT
                id,
                clause_reference,
                chapter,
                title,
                text
            FROM rules_chunks
            WHERE clause_reference = %s
            LIMIT 1;
            """,
            (clause_reference,),
        )

        row = cur.fetchone()

        if not row:
            return None

        return {
            "id": str(row[0]),
            "clause_reference": row[1],
            "chapter": row[2],
            "title": row[3],
            "text": row[4],
        }

    finally:
        conn.close()


# ============================================================
# EXTRACTION FIELD HELPER
# ============================================================

def _field(extraction_data: dict, key: str) -> dict:
    """
    Safely retrieve an extracted field.

    If the field does not exist, treat it as not visible.
    """

    return extraction_data.get(key) or {
        "value": None,
        "confidence": None,
        "status": "not_visible",
    }


# ============================================================
# CATEGORY EVALUATORS
# ============================================================

def evaluate_mrp(extraction_data: dict) -> dict:
    """
    Evaluate MRP declaration.

    PCR basis:
        Rule 6(1)(e)

    Team-defined criteria:
        - visible + readable numeric MRP -> PASS
        - illegible -> REVIEW_REQUIRED
        - missing -> ISSUE
    """

    mrp = _field(extraction_data, "mrp")

    status = mrp.get("status")
    value = mrp.get("value")

    if status == "visible":

        if value and any(ch.isdigit() for ch in str(value)):
            return {
                "verdict": "PASS",
                "reasoning": (
                    "MRP is visible and contains a numeric value."
                ),
                "evidence_field": "mrp",
                "evidence_value": str(value),
            }

        return {
            "verdict": "ISSUE",
            "reasoning": (
                "MRP is visible but does not contain "
                "a readable numeric value."
            ),
            "evidence_field": "mrp",
            "evidence_value": str(value) if value else None,
        }

    if status == "illegible":
        return {
            "verdict": "REVIEW_REQUIRED",
            "reasoning": (
                "MRP appears to be present but is illegible."
            ),
            "evidence_field": "mrp",
            "evidence_value": (
                str(value) if value else None
            ),
        }

    return {
        "verdict": "ISSUE",
        "reasoning": (
            "MRP was not detected on the package."
        ),
        "evidence_field": "mrp",
        "evidence_value": None,
    }


def evaluate_net_quantity(extraction_data: dict) -> dict:
    """
    Evaluate net quantity declaration.

    PCR basis:
        Rule 6(1)(c)

    Team-defined criteria:
        - quantity + unit visible -> PASS
        - either illegible -> REVIEW_REQUIRED
        - missing -> ISSUE
    """

    qty = _field(
        extraction_data,
        "net_quantity",
    )

    unit = _field(
        extraction_data,
        "net_quantity_unit",
    )

    if (
        qty.get("status") == "visible"
        and unit.get("status") == "visible"
    ):

        evidence = (
            f"{qty.get('value')} "
            f"{unit.get('value')}"
        )

        return {
            "verdict": "PASS",
            "reasoning": (
                "Net quantity and unit of measurement "
                "are visible."
            ),
            "evidence_field": "net_quantity",
            "evidence_value": evidence,
        }

    if (
        qty.get("status") == "illegible"
        or unit.get("status") == "illegible"
    ):

        return {
            "verdict": "REVIEW_REQUIRED",
            "reasoning": (
                "Net quantity or its unit of measurement "
                "is illegible."
            ),
            "evidence_field": "net_quantity",
            "evidence_value": (
                f"{qty.get('value')} "
                f"{unit.get('value')}"
            ),
        }

    return {
        "verdict": "ISSUE",
        "reasoning": (
            "Net quantity or its unit of measurement "
            "was not detected."
        ),
        "evidence_field": "net_quantity",
        "evidence_value": None,
    }


def evaluate_manufacturer_details(
    extraction_data: dict,
) -> dict:
    """
    Evaluate manufacturer/packer declaration.

    PCR basis:
        Rule 6(1)(a)

    Team-defined criteria:
        - complete manufacturer details -> PASS
        - complete packer details -> PASS
        - illegible details -> REVIEW_REQUIRED
        - neither available -> ISSUE
    """

    manufacturer_name = _field(
        extraction_data,
        "manufacturer_name",
    )

    manufacturer_address = _field(
        extraction_data,
        "manufacturer_address",
    )

    packer_name = _field(
        extraction_data,
        "packer_name",
    )

    packer_address = _field(
        extraction_data,
        "packer_address",
    )

    manufacturer_complete = (
        manufacturer_name.get("status") == "visible"
        and manufacturer_address.get("status") == "visible"
    )

    packer_complete = (
        packer_name.get("status") == "visible"
        and packer_address.get("status") == "visible"
    )

    # --------------------------------------------------------
    # Manufacturer details available
    # --------------------------------------------------------

    if manufacturer_complete:

        evidence = (
            f"{manufacturer_name.get('value')} - "
            f"{manufacturer_address.get('value')}"
        )

        return {
            "verdict": "PASS",
            "reasoning": (
                "Manufacturer name and address "
                "are visible."
            ),
            "evidence_field": "manufacturer_name",
            "evidence_value": evidence,
        }

    # --------------------------------------------------------
    # Packer details available
    # --------------------------------------------------------

    if packer_complete:

        evidence = (
            f"{packer_name.get('value')} - "
            f"{packer_address.get('value')}"
        )

        return {
            "verdict": "PASS",
            "reasoning": (
                "Packer name and address are visible."
            ),
            "evidence_field": "packer_name",
            "evidence_value": evidence,
        }

    # --------------------------------------------------------
    # Some details are illegible
    # --------------------------------------------------------

    statuses = [
        manufacturer_name.get("status"),
        manufacturer_address.get("status"),
        packer_name.get("status"),
        packer_address.get("status"),
    ]

    if "illegible" in statuses:

        return {
            "verdict": "REVIEW_REQUIRED",
            "reasoning": (
                "Manufacturer or packer details "
                "are partially illegible."
            ),
            "evidence_field": "manufacturer_name",
            "evidence_value": (
                manufacturer_name.get("value")
                or packer_name.get("value")
            ),
        }

    # --------------------------------------------------------
    # No complete details detected
    # --------------------------------------------------------

    return {
        "verdict": "ISSUE",
        "reasoning": (
            "Neither complete manufacturer nor complete "
            "packer name and address details were detected."
        ),
        "evidence_field": "manufacturer_name",
        "evidence_value": (
            manufacturer_name.get("value")
            or packer_name.get("value")
        ),
    }


def evaluate_country_of_origin(
    extraction_data: dict,
) -> dict:
    """
    Evaluate imported-package information.

    IMPORTANT:
    Rule 6(1)(a) explicitly requires the importer name
    and address for imported packages.

    It does NOT, from the supplied PCR 2011 chunk, establish
    a standalone country-of-origin declaration requirement.

    Therefore this evaluator does NOT automatically mark a
    package non-compliant merely because country_of_origin
    is absent.

    Current Phase 5 behavior:
        - importer visible + country visible -> PASS
        - importer visible + country missing -> REVIEW_REQUIRED
        - importer illegible -> REVIEW_REQUIRED
        - importer not detected -> REVIEW_REQUIRED

    This keeps the category conservative until a separately
    sourced legal basis for country-of-origin is established.
    """

    importer_name = _field(
        extraction_data,
        "importer_name",
    )

    country_of_origin = _field(
        extraction_data,
        "country_of_origin",
    )

    importer_status = importer_name.get("status")
    coo_status = country_of_origin.get("status")

    # --------------------------------------------------------
    # Importer is illegible
    # --------------------------------------------------------

    if importer_status == "illegible":

        return {
            "verdict": "REVIEW_REQUIRED",
            "reasoning": (
                "Importer information is illegible, so "
                "the imported-package declaration cannot "
                "be assessed reliably."
            ),
            "evidence_field": "importer_name",
            "evidence_value": importer_name.get("value"),
        }

    # --------------------------------------------------------
    # Importer visible
    # --------------------------------------------------------

    if importer_status == "visible":

        if coo_status == "visible":

            return {
                "verdict": "PASS",
                "reasoning": (
                    "Importer information and the available "
                    "country-of-origin declaration are visible."
                ),
                "evidence_field": "country_of_origin",
                "evidence_value": (
                    country_of_origin.get("value")
                ),
            }

        if coo_status == "illegible":

            return {
                "verdict": "REVIEW_REQUIRED",
                "reasoning": (
                    "Importer information is visible, but "
                    "the available country-of-origin information "
                    "is illegible."
                ),
                "evidence_field": "country_of_origin",
                "evidence_value": (
                    country_of_origin.get("value")
                ),
            }

        return {
            "verdict": "REVIEW_REQUIRED",
            "reasoning": (
                "Importer information is visible, but the "
                "available extraction does not establish "
                "whether a country-of-origin declaration is "
                "present. Manual review is required."
            ),
            "evidence_field": "importer_name",
            "evidence_value": (
                importer_name.get("value")
            ),
        }

    # --------------------------------------------------------
    # Importer not detected
    # --------------------------------------------------------

    return {
        "verdict": "REVIEW_REQUIRED",
        "reasoning": (
            "Importer information was not detected, so "
            "it cannot be reliably determined whether the "
            "package is an imported package requiring "
            "importer details."
        ),
        "evidence_field": "importer_name",
        "evidence_value": (
            importer_name.get("value")
        ),
    }


def evaluate_consumer_care(
    extraction_data: dict,
) -> dict:
    """
    Evaluate consumer-care declaration.

    PCR basis:
        Rule 6(2)

    Current extraction model stores consumer-care information
    as one combined field, so this is an evidence-presence
    check rather than a complete statutory field-by-field
    validation.
    """

    consumer_care = _field(
        extraction_data,
        "consumer_care",
    )

    status = consumer_care.get("status")
    value = consumer_care.get("value")

    if status == "visible" and value:

        return {
            "verdict": "PASS",
            "reasoning": (
                "Consumer care details are present and visible."
            ),
            "evidence_field": "consumer_care",
            "evidence_value": str(value),
        }

    if status == "illegible":

        return {
            "verdict": "REVIEW_REQUIRED",
            "reasoning": (
                "Consumer care details are present "
                "but illegible."
            ),
            "evidence_field": "consumer_care",
            "evidence_value": (
                str(value) if value else None
            ),
        }

    return {
        "verdict": "ISSUE",
        "reasoning": (
            "Consumer care details were not detected."
        ),
        "evidence_field": "consumer_care",
        "evidence_value": None,
    }


# ============================================================
# CATEGORY EVALUATOR MAP
# ============================================================

CATEGORY_EVALUATORS = {
    "mrp": evaluate_mrp,
    "net_quantity": evaluate_net_quantity,
    "manufacturer_details": evaluate_manufacturer_details,
    "country_of_origin": evaluate_country_of_origin,
    "consumer_care": evaluate_consumer_care,
}


# ============================================================
# MAIN COMPLIANCE VERDICT ENGINE
# ============================================================

def run_compliance_verdict(
    db: Session,
    inspection_id: uuid.UUID,
) -> list[ComplianceVerdict]:

    # --------------------------------------------------------
    # 1. Get inspection
    # --------------------------------------------------------

    inspection = (
        db.query(Inspection)
        .filter(
            Inspection.id == inspection_id
        )
        .first()
    )

    if not inspection:
        raise ValueError(
            "Inspection not found."
        )

    # --------------------------------------------------------
    # 2. Make sure Phase 4 extraction exists
    # --------------------------------------------------------

    if not inspection.extractions:
        raise ValueError(
            "No Phase 4 extraction found for this inspection."
        )

    # --------------------------------------------------------
    # 3. Use latest extraction
    # --------------------------------------------------------

    latest_extraction = sorted(
        inspection.extractions,
        key=lambda e: e.created_at,
        reverse=True,
    )[0]

    extraction_data = (
        latest_extraction.extraction_data
    )

    # --------------------------------------------------------
    # 4. Evaluate every compliance category
    # --------------------------------------------------------

    results = []

    for category, evaluator in CATEGORY_EVALUATORS.items():

        # ----------------------------------------------------
        # Get authoritative PCR clause reference
        # ----------------------------------------------------

        rule_references = (
            CATEGORY_RULE_REFERENCES.get(category)
        )

        if not rule_references:
            raise ValueError(
                f"No PCR 2011 rule configured for "
                f"category: {category}"
            )

        # ----------------------------------------------------
        # Exact legal rule lookup
        # ----------------------------------------------------

        rule = None

        for reference in rule_references:

            rule = get_rule_by_reference(
                reference
            )

            if rule:
                break

        if not rule:
            raise ValueError(
                f"No PCR 2011 rule found in database "
                f"for category: {category}"
            )

        # ----------------------------------------------------
        # Apply team-defined compliance criteria
        # ----------------------------------------------------

        outcome = evaluator(
            extraction_data
        )

        # ----------------------------------------------------
        # Store verdict
        # ----------------------------------------------------

        verdict_row = ComplianceVerdict(
            inspection_id=inspection_id,
            category=category,
            verdict=outcome["verdict"],
            reasoning=outcome["reasoning"],
            evidence_field=outcome["evidence_field"],
            evidence_value=outcome["evidence_value"],
            rule_reference=rule["clause_reference"],
        )

        db.add(verdict_row)

        results.append(
            verdict_row
        )

    # --------------------------------------------------------
    # 5. Commit all category verdicts
    # --------------------------------------------------------

    db.commit()

    # --------------------------------------------------------
    # 6. Refresh generated fields such as id/created_at
    # --------------------------------------------------------

    for result in results:
        db.refresh(result)

    return results