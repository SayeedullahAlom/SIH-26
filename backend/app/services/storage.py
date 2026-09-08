import os
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

s3_client = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT_URL,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)


def generate_presigned_upload_url(
    object_name: str, content_type: str, expiration: int = 3600
) -> str:
    """Generate a presigned PUT URL for direct client upload to Cloudflare R2."""
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": R2_BUCKET_NAME,
                "Key": object_name,
                "ContentType": content_type,
            },
            ExpiresIn=expiration,
        )
        return url
    except Exception as e:
        raise RuntimeError(f"Failed to generate presigned upload URL: {e}")


def generate_presigned_download_url(
    object_name: str, expiration: int = 3600
) -> str:
    """Generate a presigned GET URL for viewing stored images."""
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": R2_BUCKET_NAME,
                "Key": object_name,
            },
            ExpiresIn=expiration,
        )
        return url
    except Exception as e:
        raise RuntimeError(f"Failed to generate presigned download URL: {e}")