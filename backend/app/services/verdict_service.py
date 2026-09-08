import uuid
from sqlalchemy.orm import Session

from app.models.compliance_verdict import ComplianceVerdict
from app.models.inspection import Inspection
from app.services.retrieval_service import retrieve_relevant_rules


# Queries used to pull statutory rule clauses per category
CATEGORY_RULE_QUERIES = {
    "product_identity": "Name and generic or common name of the commodity declaration rules",
    "manufacturer_details": "Manufacturer, packer, and importer name and address declaration requirements",
    "country_of_origin": "Country of origin declaration for imported packages",
    "net_quantity": "Net quantity, standard units of measurement and dimensions declaration",
    "mrp": "Maximum Retail Price MRP declaration requirements inclusive of all taxes",
    "unit_sale_price": "Unit sale price USP per gram, per milliliter, per number declaration",
    "manufacturing_date": "Month and year of manufacture, packing, or import declaration",
    "expiry_date": "Best before or use by date declaration for commodities subject to decay",
    "consumer_care": "Consumer care name, address, telephone number, and email address details",
    "batch_or_lot": "Batch number or lot number identification code on pre-packaged goods",
}


def _field(extraction_data: dict, key: str) -> dict:
    """Safely pull a field dict {value, confidence, status} from stored extraction JSON."""
    return extraction_data.get(key) or {"value": None, "confidence": None, "status": "not_visible"}


def evaluate_product_identity(extraction_data: dict) -> dict:
    prod = _field(extraction_data, "product_name")
    generic = _field(extraction_data, "generic_name")

    if prod.get("status") == "visible" or generic.get("status") == "visible":
        return {"verdict": "PASS", "reasoning": "Product identity and generic/common name declared."}
    if prod.get("status") == "illegible" or generic.get("status") == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Product name or generic name is illegible."}
    return {"verdict": "ISSUE", "reasoning": "Neither product name nor common/generic name is visible."}


def evaluate_manufacturer_details(extraction_data: dict) -> dict:
    name = _field(extraction_data, "manufacturer_name")
    addr = _field(extraction_data, "manufacturer_address")
    packer_name = _field(extraction_data, "packer_name")
    packer_addr = _field(extraction_data, "packer_address")
    imp_name = _field(extraction_data, "importer_name")
    imp_addr = _field(extraction_data, "importer_address")

    if (name.get("status") == "visible" and addr.get("status") == "visible") or \
       (packer_name.get("status") == "visible" and packer_addr.get("status") == "visible") or \
       (imp_name.get("status") == "visible" and imp_addr.get("status") == "visible"):
        return {"verdict": "PASS", "reasoning": "Complete name and address of manufacturer, packer, or importer declared."}

    statuses = [
        name.get("status"),
        addr.get("status"),
        packer_name.get("status"),
        packer_addr.get("status"),
        imp_name.get("status"),
        imp_addr.get("status"),
    ]
    if "illegible" in statuses:
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Manufacturer, packer, or importer detail illegible."}
    return {"verdict": "ISSUE", "reasoning": "Incomplete manufacturer, packer, and importer name/address details."}


def evaluate_country_of_origin(extraction_data: dict) -> dict:
    importer_name = _field(extraction_data, "importer_name")
    importer_addr = _field(extraction_data, "importer_address")
    coo = _field(extraction_data, "country_of_origin")

    if coo.get("status") == "visible" and coo.get("value"):
        return {"verdict": "PASS", "reasoning": f"Country of origin explicitly declared ({coo.get('value')})."}
    
    if importer_name.get("status") == "visible" or importer_addr.get("status") == "visible":
        if coo.get("status") == "illegible":
            return {"verdict": "REVIEW_REQUIRED", "reasoning": "Imported commodity detected, but country of origin is illegible."}
        return {"verdict": "ISSUE", "reasoning": "Imported commodity requires explicit Country of Origin declaration."}
    
    return {"verdict": "PASS", "reasoning": "Domestic product without mandatory separate importer origin declaration."}


def evaluate_net_quantity(extraction_data: dict) -> dict:
    qty = _field(extraction_data, "net_quantity")
    unit = _field(extraction_data, "net_quantity_unit")
    dims = _field(extraction_data, "dimensions")

    if qty.get("status") == "visible" and unit.get("status") == "visible":
        dim_info = f" Dimensions: {dims.get('value')}." if dims.get("status") == "visible" else ""
        return {"verdict": "PASS", "reasoning": f"Net quantity ({qty.get('value')} {unit.get('value')}) properly declared.{dim_info}"}
    if qty.get("status") == "illegible" or unit.get("status") == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Net quantity or unit illegible on package."}
    return {"verdict": "ISSUE", "reasoning": "Net quantity and standard unit missing from package."}


def evaluate_mrp(extraction_data: dict) -> dict:
    mrp = _field(extraction_data, "mrp")
    status = mrp.get("status")
    value = mrp.get("value")

    if status == "visible":
        if value and any(ch.isdigit() for ch in str(value)):
            return {"verdict": "PASS", "reasoning": f"MRP declared with valid currency/numerical amount: {value}."}
        return {"verdict": "ISSUE", "reasoning": "MRP field present but lacks readable numeric price."}
    if status == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "MRP text is present but illegible."}
    return {"verdict": "ISSUE", "reasoning": "Maximum Retail Price (MRP) declaration missing."}


def evaluate_unit_sale_price(extraction_data: dict) -> dict:
    usp = _field(extraction_data, "unit_sale_price")
    status = usp.get("status")
    value = usp.get("value")

    if status == "visible" and value:
        return {"verdict": "PASS", "reasoning": f"Unit Sale Price (USP) declared: {value}."}
    if status == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Unit sale price present but illegible."}
    return {"verdict": "REVIEW_REQUIRED", "reasoning": "Unit Sale Price (USP) not visibly declared. Verify if package net quantity is exempt."}


def evaluate_manufacturing_date(extraction_data: dict) -> dict:
    mfg = _field(extraction_data, "manufacture_date")
    pack = _field(extraction_data, "packing_date")
    imp = _field(extraction_data, "import_date")

    for f, label in [(mfg, "Manufacture Date"), (pack, "Packing Date"), (imp, "Import Date")]:
        if f.get("status") == "visible" and f.get("value"):
            return {"verdict": "PASS", "reasoning": f"{label} declared: {f.get('value')}."}

    if any(f.get("status") == "illegible" for f in [mfg, pack, imp]):
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Manufacturing/Packing date found but illegible."}
    return {"verdict": "ISSUE", "reasoning": "No date of manufacture, packing, or import visible."}


def evaluate_expiry_date(extraction_data: dict) -> dict:
    expiry = _field(extraction_data, "best_before_or_use_by")
    status = expiry.get("status")
    value = expiry.get("value")

    if status == "visible" and value:
        return {"verdict": "PASS", "reasoning": f"Best before / use by date declared: {value}."}
    if status == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Best before / use by date is illegible."}
    return {"verdict": "REVIEW_REQUIRED", "reasoning": "Expiry / Best Before date not detected. Confirm commodity perishable status."}


def evaluate_consumer_care(extraction_data: dict) -> dict:
    cc = _field(extraction_data, "consumer_care")
    status = cc.get("status")
    value = cc.get("value")

    if status == "visible" and value:
        return {"verdict": "PASS", "reasoning": "Consumer complaint details declared."}
    if status == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Consumer care details present but illegible."}
    return {"verdict": "ISSUE", "reasoning": "Mandatory consumer care address, phone, or email is missing."}


def evaluate_batch_or_lot(extraction_data: dict) -> dict:
    batch = _field(extraction_data, "batch_or_lot_number")
    status = batch.get("status")
    value = batch.get("value")

    if status == "visible" and value:
        return {"verdict": "PASS", "reasoning": f"Batch / Lot / Code number declared: {value}."}
    if status == "illegible":
        return {"verdict": "REVIEW_REQUIRED", "reasoning": "Batch / Lot number present but illegible."}
    return {"verdict": "ISSUE", "reasoning": "Batch / Lot / Identification code missing from package."}


CATEGORY_EVALUATORS = {
    "product_identity": evaluate_product_identity,
    "manufacturer_details": evaluate_manufacturer_details,
    "country_of_origin": evaluate_country_of_origin,
    "net_quantity": evaluate_net_quantity,
    "mrp": evaluate_mrp,
    "unit_sale_price": evaluate_unit_sale_price,
    "manufacturing_date": evaluate_manufacturing_date,
    "expiry_date": evaluate_expiry_date,
    "consumer_care": evaluate_consumer_care,
    "batch_or_lot": evaluate_batch_or_lot,
}


def run_compliance_verdict(db: Session, inspection_id: uuid.UUID) -> list[ComplianceVerdict]:
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise ValueError("Inspection not found.")

    if not inspection.extractions:
        raise ValueError("No Phase 4 extraction found for this inspection.")

    # 1. Purge prior verdicts for this inspection to prevent duplicate rows on re-run
    db.query(ComplianceVerdict).filter(ComplianceVerdict.inspection_id == inspection_id).delete()
    db.flush()

    # 2. Use the most recent extraction payload
    latest_extraction = sorted(inspection.extractions, key=lambda e: e.created_at, reverse=True)[0]
    extraction_data = latest_extraction.extraction_data

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

    # 3. Apply schema constraint values: 'COMPLIANT' | 'NON_COMPLIANT' | 'REVIEW_REQUIRED'
    has_issue = any(r.verdict == "ISSUE" for r in results)
    has_review = any(r.verdict == "REVIEW_REQUIRED" for r in results)

    if has_issue:
        inspection.overall_result = "NON_COMPLIANT"
    elif has_review:
        inspection.overall_result = "REVIEW_REQUIRED"
    else:
        inspection.overall_result = "COMPLIANT"

    inspection.status = "completed"

    db.commit()
    for r in results:
        db.refresh(r)

    return results