from pathlib import Path
import json

from app.services.extraction_service import extract_from_images


IMAGE_PATH = Path(
    r"C:\Users\Darshan Gupta\Desktop\phase 4\SIH-26\Resources\test.jpg"
)

image_bytes = IMAGE_PATH.read_bytes()

result = extract_from_images([
    (image_bytes, "image/jpeg")
])

print(json.dumps(result.model_dump(), indent=2))