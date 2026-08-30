from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.jwt import TokenError, decode_access_token
from app.db.session import get_db
from app.models.user import User


class Bearer401(HTTPBearer):
    """
    FastAPI's stock HTTPBearer(auto_error=True) returns 403 (not 401) when
    the Authorization header is missing entirely - a well-known surprise.
    The spec here requires 401 for a missing token, so we override the
    error path to always raise 401 with a WWW-Authenticate header.
    """

    async def __call__(self, request: Request) -> HTTPAuthorizationCredentials:
        try:
            return await super().__call__(request)
        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )


bearer_scheme = Bearer401(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        user_id = decode_access_token(credentials.credentials)
    except TokenError:
        raise unauthorized

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized

    return user
