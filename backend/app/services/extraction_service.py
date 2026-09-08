import json
import time

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.extraction import ExtractionResult

AI_API_KEY = settings.AI_API_KEY

if not AI_API_KEY:
    raise RuntimeError("AI_API_KEY is not set")

client = genai.Client(
    api_key=AI_API_KEY,
    http_options={"timeout": 120000},
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


def extract_from_images(images: list[tuple[bytes, str]]) -> ExtractionResult:
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

    for attempt in range(2):
        try:
            print(f"Vision AI attempt {attempt + 1}: sending request...")

            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=response_parts,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionResult,
                ),
            )

            print(f"Vision AI attempt {attempt + 1}: success")

            raw_text = response.text
            if not raw_text:
                raise ValueError("Vision AI returned an empty response")

            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError as exc:
                raise ValueError("Vision AI returned invalid JSON") from exc

            return ExtractionResult.model_validate(data)

        except Exception as exc:
            print(
                f"Vision AI attempt {attempt + 1} failed: "
                f"{type(exc).__name__}: {exc}"
            )

            if attempt == 0:
                print("Waiting 3 seconds before retry...")
                time.sleep(3)
            else:
                print("Vision AI failed after 2 attempts.")
                raise