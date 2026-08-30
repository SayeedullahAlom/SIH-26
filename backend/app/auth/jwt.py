"""
JWT issuing and verification.

- Signing algorithm: HS256 (symmetric), configurable via JWT_ALGORITHM.
  HS256 is appropriate here because a single backend service both issues
  and verifies tokens - there's no need for the asymmetric key separation
  that RS256/ES256 buys you when multiple independent services must verify
  tokens without holding the signing key.
- The signing secret is read from JWT_SECRET (environment variable), never
  hardcoded. Its strength is entirely on the operator: it must be a long,
  random value in any real deployment (see security checklist).
- Every token embeds an `exp` (expiration) claim. PyJWT rejects expired
  tokens automatically on decode.
"""

import uuid
from datetime import datetime, timedelta, timezone

import jwt
from jwt import PyJWTError

from app.core.config import settings


class TokenError(Exception):
    """Raised for any invalid, malformed, or expired token."""


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID:
    """Decode and validate a token, returning the user id encoded in `sub`.

    Raises TokenError for any invalid/expired/malformed token so callers
    don't need to know about PyJWT's exception hierarchy.
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        sub = payload.get("sub")
        if sub is None:
            raise TokenError("Token missing 'sub' claim")
        return uuid.UUID(sub)
    except PyJWTError as exc:
        raise TokenError(str(exc)) from exc
    except ValueError as exc:
        # uuid.UUID(sub) failed to parse
        raise TokenError("Token 'sub' claim is not a valid user id") from exc
