"""
Declarative base.

`app/db/base_all_models.py` imports every model so that Alembic's
autogenerate (and `Base.metadata.create_all` in tests) can see the full
schema through a single import.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
