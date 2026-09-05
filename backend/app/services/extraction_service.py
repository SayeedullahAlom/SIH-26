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
    http_options={"timeout": 60000},
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

Use "visible" when the declaration can be clearly read.

Use "not_visible" when the declaration is not present or its value is
not visible in the provided image(s).

Use "illegible" when the declaration appears to be present but the
image quality is insufficient to reliably read it.

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
   Extract the short product or brand name printed on the package.
   Return only the name itself.
   Do not return explanations, instructions, schema text, or other text.
   If the name is not clearly visible, return null.

2. generic_name
   The common or generic name of the commodity.

3. manufacturer_name
   Name of the manufacturer, if printed.

4. manufacturer_address
   Complete manufacturer address, if printed.

5. packer_name
   Name of the packer, if separately stated.

6. packer_address
   Complete packer address, if separately stated.

7. importer_name
   Name of the importer, if applicable and printed.

8. importer_address
   Complete importer address, if applicable and printed.

9. country_of_origin
   Country of origin, particularly where the commodity is imported,
   if explicitly printed.

10. net_quantity
    The numerical quantity printed for the package.
    Preserve the printed number only.

11. net_quantity_unit
    The unit associated with the net quantity, such as g, kg, ml,
    L, cm, m, or number.

12. dimensions
    Dimensions or size information printed on the package where
    applicable.

13. mrp
    Maximum Retail Price or equivalent price declaration.
    Preserve the printed value and wording.

14. unit_sale_price
    Unit sale price, if explicitly printed.

15. manufacture_date
    Month/year or date of manufacture, if explicitly printed.

16. packing_date
    Month/year or date of packing/pre-packing, if explicitly printed.

17. import_date
    Month/year or date of import, if explicitly printed.

18. best_before_or_use_by
    Any explicitly printed "Best Before", "Use By", or equivalent
    shelf-life/date declaration.

19. consumer_care
    Consumer-care information such as address, telephone number,
    email address, or other contact details printed for consumers.

20. batch_or_lot_number
    Batch number, lot number, or equivalent identification number
    if explicitly printed.

============================================================
MULTIPLE IMAGES
============================================================

The package may be represented by multiple images.

Consider ALL provided images together.

If a declaration appears in one image, extract it even if it is absent
from another image.

Do not duplicate information merely because it appears in multiple
images.

If conflicting values appear across images, use the clearest/readable
printed value and preserve the evidence rather than guessing.

============================================================
IMPORTANT
============================================================

Extract ONLY what is actually visible in the provided image(s).

Do not use your knowledge of the product or manufacturer to fill
missing fields.

For example, if a package does not visibly show its net quantity,
return:

{
    "value": null,
    "confidence": null,
    "status": "not_visible"
}

Do not guess the quantity based on the product.

Return JSON only.
"""


def extract_from_images(
    images: list[tuple[bytes, str]]
) -> ExtractionResult:

    for attempt in range(2):
        try:
            print(
                f"Vision AI attempt {attempt + 1}: sending request..."
            )

            # Build Gemini multimodal request
            response_parts = [
                types.Part.from_text(
                    text=EXTRACTION_PROMPT
                )
            ]

            # Add all package images
            for image_bytes, mime_type in images:
                response_parts.append(
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type,
                    )
                )

            # Call Gemini Vision model
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=response_parts,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionResult,
                ),
            )

            print(
                f"Vision AI attempt {attempt + 1}: success"
            )

            # Extract response text
            raw_text = response.text

            if not raw_text:
                raise ValueError(
                    "Vision AI returned an empty response"
                )

            # Parse JSON
            try:
                data = json.loads(raw_text)

            except json.JSONDecodeError as exc:
                raise ValueError(
                    "Vision AI returned invalid JSON"
                ) from exc

            # Validate against Pydantic schema
            return ExtractionResult.model_validate(data)

        except Exception as exc:
            print(
                f"Vision AI attempt {attempt + 1} failed: "
                f"{type(exc).__name__}: {exc}"
            )

            if attempt == 0:
                print(
                    "Waiting 3 seconds before retry..."
                )
                time.sleep(3)

            else:
                print(
                    "Vision AI failed after 2 attempts."
                )
                raise