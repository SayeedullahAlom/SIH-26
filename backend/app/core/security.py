"""
Password hashing utilities.

We use Passlib's Argon2 backend (argon2-cffi). Argon2id is the current
OWASP-recommended default for password hashing (winner of the 2015
Password Hashing Competition, resistant to GPU/ASIC cracking better than
bcrypt for equivalent tuning). We do not implement any hashing algorithm
ourselves - Passlib + argon2-cffi handle salting, parameter encoding, and
constant-time verification.
"""

from passlib.context import CryptContext

# Only argon2 is listed as a scheme: no legacy bcrypt/sha256 fallback to
# accidentally verify against. If the team later wants to support migrating
# hashes from another system, add that scheme explicitly and deliberately.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password. Never store or log the plaintext value."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored hash in constant time."""
    return pwd_context.verify(plain_password, password_hash)
