import uuid
from sqlalchemy.orm import Session

from app.models.compliance_verdict import ComplianceVerdict
from app.models.inspection import Inspection
from app.services.retrieval_service import retrieve_relevant_rules


# Natural-language queries used to pull the right rule clause per category
CATEGORY_RULE_QUERIES = {
    "mrp": "Maximum Retail Price declaration requirements on packaged commodities",
    "net_quantity": "Net quantity and unit of measurement declaration requirements",
    "manufacturer_details": "Manufacturer or packer name and address declaration requirements",
    "country_of_origin": "Country of origin declaration for imported goods",
    "consumer_care": "Consumer care details declaration requirements",
}


def _field(extraction_data: dict, key: str) -> dict:
    """Safely pull a field dict {value, confidence, status} from stored extraction JSON."""
    return extraction_data.get(key) or {"value": None, "confidence": None, "status": "not_visible"}


def evaluate_mrp(extraction_data: dict) -> dict:
    mrp = _field(extraction_data, "mrp")
    status = mrp.get("status")
    value = mrp.get("value")

    if status == "visible":
        if value and any(ch.isdigit() for ch in str(value)):
            return {"verdict": "PASS", "reasoning": "MRP visible and contains a numeric value."}
        return {"verdict": "ISSUE", "reasoning": "MRP visible but does not contain a readable numeric value."}
    if status == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "MRP present but illegible."}
    return {"verdict": "ISSUE", "reasoning": "MRP not visible on package."}


def evaluate_net_quantity(extraction_data: dict) -> dict:
    qty = _field(extraction_data, "net_quantity")
    unit = _field(extraction_data, "net_quantity_unit")

    if qty.get("status") == "visible" and unit.get("status") == "visible":
        return {"verdict": "PASS", "reasoning": "Net quantity and unit both visible."}
    if qty.get("status") == "illegible" or unit.get("status") == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Net quantity or unit illegible."}
    return {"verdict": "ISSUE", "reasoning": "Net quantity or unit missing."}


def evaluate_manufacturer_details(extraction_data: dict) -> dict:
    name = _field(extraction_data, "manufacturer_name")
    addr = _field(extraction_data, "manufacturer_address")
    packer_name = _field(extraction_data, "packer_name")
    packer_addr = _field(extraction_data, "packer_address")

    # PASS if either manufacturer OR packer details are fully visible
    if (name.get("status") == "visible" and addr.get("status") == "visible") or \
       (packer_name.get("status") == "visible" and packer_addr.get("status") == "visible"):
        return {"verdict": "PASS", "reasoning": "Manufacturer or packer name+address visible."}

    statuses = [name.get("status"), addr.get("status"), packer_name.get("status"), packer_addr.get("status")]
    if "illegible" in statuses:
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Manufacturer/packer detail illegible."}
    return {"verdict": "ISSUE", "reasoning": "Manufacturer and packer details both incomplete."}


def evaluate_country_of_origin(extraction_data: dict) -> dict:
    importer_name = _field(extraction_data, "importer_name")
    coo = _field(extraction_data, "country_of_origin")

    if importer_name.get("status") != "visible":
        return {"verdict": "PASS", "reasoning": "No importer declared; country of origin not required."}
    if coo.get("status") == "visible":
        return {"verdict": "PASS", "reasoning": "Country of origin declared for imported product."}
    if coo.get("status") == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Country of origin illegible."}
    return {"verdict": "ISSUE", "reasoning": "Importer declared but country of origin missing."}


def evaluate_consumer_care(extraction_data: dict) -> dict:
    cc = _field(extraction_data, "consumer_care")
    status = cc.get("status")

    if status == "visible" and cc.get("value"):
        return {"verdict": "PASS", "reasoning": "Consumer care details present."}
    if status == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Consumer care details illegible."}
    return {"verdict": "ISSUE", "reasoning": "Consumer care details missing."}


CATEGORY_EVALUATORS = {
    "mrp": evaluate_mrp,
    "net_quantity": evaluate_net_quantity,
    "manufacturer_details": evaluate_manufacturer_details,
    "country_of_origin": evaluate_country_of_origin,
    "consumer_care": evaluate_consumer_care,
}


def run_compliance_verdict(db: Session, inspection_id: uuid.UUID) -> list[ComplianceVerdict]:
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise ValueError("Inspection not found.")

    if not inspection.extractions:
        raise ValueError("No Phase 4 extraction found for this inspection.")

    # Use the most recent extraction
    latest_extraction = sorted(inspection.extractions, key=lambda e: e.created_at, reverse=True)[0]
    extraction_data = latest_extraction.extraction_data  # JSONB dict

    results = []
    for category, evaluator in CATEGORY_EVALUATORS.items():
        rule_query = CATEGORY_RULE_QUERIES[category]
        retrieved_rules = retrieve_relevant_rules(rule_query, top_k=1)
        rule_text = retrieved_rules[0]["text"] if retrieved_rules else "No matching rule retrieved."

        outcome = evaluator(extraction_data)

        verdict_row = ComplianceVerdict(
            inspection_id=inspection_id,
            category=category,
            verdict=outcome["verdict"],
            reasoning=outcome["reasoning"],
            rule_reference=rule_text[:500],
        )
        db.add(verdict_row)
        results.append(verdict_row)

    db.commit()
    for r in results:
        db.refresh(r)

    return results