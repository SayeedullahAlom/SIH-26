# Phase 5 Compliance Criteria

## Category: mrp
- PASS: mrp.status == "visible" AND value is a positive number with currency symbol/unit
- ISSUE: mrp.status == "visible" AND value is missing currency, or non-numeric, or zero/negative
- REVIEW_REQUIRED: mrp.status in ("not_visible", "illegible")

## Category: net_quantity
- PASS: net_quantity.status == "visible" AND net_quantity_unit.status == "visible" AND unit is a standard legal unit (g, kg, ml, l, N)
- ISSUE: net_quantity present but unit missing, or unit is non-standard
- REVIEW_REQUIRED: status in ("not_visible", "illegible")

## Category: manufacturer_details
- PASS: manufacturer_name AND manufacturer_address both status == "visible"
- ISSUE: one of the two is "visible" but the other is confirmed missing (not just illegible)
- REVIEW_REQUIRED: either field is "illegible", OR RAG-retrieved rule requires packer/importer instead (imported goods)

## Category: country_of_origin
- PASS: if importer_name is present → country_of_origin.status == "visible"; if no importer fields at all → not applicable, treat as PASS
- ISSUE: importer_name present AND country_of_origin.status == "not_visible"
- REVIEW_REQUIRED: importer_name present AND country_of_origin.status == "illegible"

## Category: dates
- PASS: manufacture_date/packing_date visible AND best_before_or_use_by is either visible or legitimately not required for this product type
- ISSUE: dates present but manufacture_date is chronologically after best_before_or_use_by
- REVIEW_REQUIRED: any relevant date field is "illegible"

## Category: consumer_care
- PASS: consumer_care.status == "visible" with a non-empty contact detail
- ISSUE: consumer_care.status == "not_visible"
- REVIEW_REQUIRED: consumer_care.status == "illegible"