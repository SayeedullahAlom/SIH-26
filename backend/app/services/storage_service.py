from boto3 import client

from app.core.config import settings


R2_ENDPOINT = (
    f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
)


s3_client = client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
)


def get_object_bytes(object_key: str) -> bytes:
    response = s3_client.get_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=object_key,
    )

    return response["Body"].read()