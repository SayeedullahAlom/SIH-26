import asyncio
import json

from fastapi import Request, HTTPException
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.extraction import ExtractionResult

AI_API_KEY = settings.AI_API_KEY

if not AI_API_KEY:
    raise RuntimeError("AI_API_KEY is not set")

client = genai.Client(
    api_key=AI_API_KEY,
    http_options={"timeout": 60000},  # 60s timeout per call
)

EXTRACTION_PROMPT = """
You are a Legal Metrology package-label information extraction system.

Your task is ONLY to extract information that is visibly printed on the
provided packaged commodity image(s).

You are NOT a compliance decision system.

DO NOT:
- decide whether the package is legally compliant
- determine whether a declaration satisfies a Legal Metrology rule
- invent, infer, or guess information
- fill missing information from general knowledge
- assume a declaration exists when it cannot be seen

Return ONLY valid JSON matching the ExtractionResult schema.

============================================================
EXTRACTION RULES
============================================================

For every field return:

{
    "value": "...",
    "confidence": 0.0,
    "status": "visible"
}

Possible status values are ONLY:
"visible"
"not_visible"
"illegible"

When status is "not_visible":
- value MUST be null
- confidence MUST be null

When status is "illegible":
- value SHOULD be null unless some text can be read reliably
- confidence should reflect the uncertainty

When status is "visible":
- value should contain the text/value actually printed on the package
- preserve the original wording as much as possible
- do not normalize or reinterpret the value

============================================================
DATE FIELD DISAMBIGUATION (READ CAREFULLY)
============================================================

A package commonly carries TWO OR MORE separate date-related declarations,
printed in different places, in different formats. Do not assume they are
the same, and do not stop scanning the label after finding the first one.

The relevant fields are:
- manufacture_date  -> the actual date/month-year the product was made
- packing_date      -> the actual date/month-year the product was packed
                       (may be the same line as manufacture_date, or absent)
- import_date       -> only for imported goods
- best_before_or_use_by -> shelf-life / expiry declaration

Key distinguishing rule:
"best_before_or_use_by" is very often written as a DURATION relative to
manufacture, not an absolute date — e.g. "Best Before 24 Months from Mfg
Date", "Use within 6 months of packing", "Best Before 12M". If you see a
duration/relative expression like this, it belongs in
"best_before_or_use_by" and is NOT the manufacture_date, even if it is the
only date-like text you initially notice.

The manufacture_date (and/or packing_date) is usually a separate, absolute
date or month-year, printed near label words such as "Mfg", "Mfd",
"Manufactured on", "Pkd", "Packed on", "Mfg Dt", "MFD". It may appear in a
different location on the pack (top, side, near a batch code) from the
best-before declaration.

Procedure:
1. Locate every date-like or duration-like string on the package, not just
   the first one you find.
2. Classify each one individually using its nearby label text (the word(s)
   printed immediately next to or above/below it), not by assuming which
   field it "must" be.
3. Only mark manufacture_date / packing_date as "not_visible" if, after
   scanning the ENTIRE label including edges, back panel text, and small
   print, no absolute manufacture/packing date or month-year is found
   anywhere.
4. A found best_before/expiry declaration is never sufficient reason on its
   own to mark manufacture_date as not_visible — they are independent
   fields and must be searched for independently.

Example of correct behavior:
Label shows "MFD: 03/2026" printed near the top of the pack, and separately
"Best Before 24 Months from date of Mfg" printed near the bottom.
Correct extraction:
- manufacture_date: {"value": "03/2026", "confidence": 0.95, "status": "visible"}
- best_before_or_use_by: {"value": "24 Months from date of Mfg", "confidence": 0.95, "status": "visible"}
Both fields are populated separately. Do NOT collapse them into one, and do
NOT report manufacture_date as not_visible just because the best-before
text was found first.

============================================================
FIELDS TO EXTRACT
============================================================
1. product_name
2. generic_name
3. manufacturer_name
4. manufacturer_address
5. packer_name
6. packer_address
7. importer_name
8. importer_address
9. country_of_origin
10. net_quantity
11. net_quantity_unit
12. dimensions
13. mrp
14. unit_sale_price
15. manufacture_date
16. packing_date
17. import_date
18. best_before_or_use_by
19. consumer_care
20. batch_or_lot_number

Return JSON only.
"""

# Fallback sequence: if 3.6 encounters high demand (503), immediately fail over
FALLBACK_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
]


async def extract_from_images(
    images: list[tuple[bytes, str]], 
    request: Request | None = None
) -> ExtractionResult:
    response_parts: list[types.Part] = [
        types.Part.from_text(text=EXTRACTION_PROMPT)
    ]

    for image_bytes, mime_type in images:
        response_parts.append(
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type,
            )
        )

    last_exception = None

    for attempt, model_name in enumerate(FALLBACK_MODELS):
        # 1. Check if user navigated away before sending the request
        if request and await request.is_disconnected():
            print(f"[EXTRACT] Client disconnected before attempt {attempt + 1}. Aborting immediately.")
            raise HTTPException(status_code=499, detail="Client Closed Request")

        try:
            print(f"Vision AI attempt {attempt + 1} using '{model_name}': sending request...")

            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model_name,
                contents=response_parts,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionResult,
                ),
            )

            # 2. Check if user navigated away while the call was running
            if request and await request.is_disconnected():
                print(f"[EXTRACT] Client disconnected during attempt {attempt + 1}. Discarding response.")
                raise HTTPException(status_code=499, detail="Client Closed Request")

            print(f"Vision AI attempt {attempt + 1} ({model_name}): success")

            raw_text = response.text
            if not raw_text:
                raise ValueError("Vision AI returned an empty response")

            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError as exc:
                raise ValueError("Vision AI returned invalid JSON") from exc

            return ExtractionResult.model_validate(data)

        except HTTPException:
            raise
        except Exception as exc:
            last_exception = exc
            print(
                f"Vision AI attempt {attempt + 1} ({model_name}) failed: "
                f"{type(exc).__name__}: {exc}"
            )

            # Do not proceed with retries if the user has navigated away
            if request and await request.is_disconnected():
                print("[EXTRACT] Client disconnected after failed attempt. Halting retries.")
                raise HTTPException(status_code=499, detail="Client Closed Request")

            # Pause briefly before switching to the next fallback model
            if attempt < len(FALLBACK_MODELS) - 1:
                wait_time = 2 * (attempt + 1)
                print(f"Failing over to next model in {wait_time}s...")
                await asyncio.sleep(wait_time)

    print("All Vision AI model fallbacks exhausted.")
    raise last_exception