"""
Test fixtures.

Tests run against a real PostgreSQL database (the same engine/dialect
features are used - pgvector, JSONB, UUID server defaults - so SQLite is
not a safe substitute). Point TEST_DATABASE_URL at a throwaway database
before running pytest; see the README for setup.

Each test function runs inside a transaction that is rolled back at the
end, so tests don't leak data into each other or require resetting the
schema between runs.
"""

import os

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401  (register all models on Base.metadata)
from app.db.base import Base
from app.db.session import get_db
from app.main import app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/legal_metrology_test",
)

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    with engine.connect() as conn:
        conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    """
    Wrap each test in an outer transaction, with the session itself bound
    to a SAVEPOINT. The app code under test (e.g. the register endpoint's
    own `db.commit()`/`db.rollback()` on a duplicate email) operates on
    that SAVEPOINT, not the outer transaction - so an app-level rollback
    can't collapse the outer transaction we're using to isolate the test.
    A listener restarts the SAVEPOINT whenever it ends, so this keeps
    working across multiple commits/rollbacks within a single test.
    """
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, transaction):
        if transaction.nested and not transaction._parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
