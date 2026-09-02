from google import genai
from app.core.config import settings

client = genai.Client(api_key=settings.AI_API_KEY)

for model in client.models.list():
    print(model.name)