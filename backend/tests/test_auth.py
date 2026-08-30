from app.models.user import User

VALID_PASSWORD = "correct-horse-battery-staple"


def _register(client, email="officer@example.com", password=VALID_PASSWORD):
    return client.post(
        "/auth/register",
        json={"name": "Test Officer", "email": email, "password": password},
    )


def test_register_creates_user(client):
    response = _register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "officer@example.com"
    assert body["role"] == "officer"
    assert "password" not in body
    assert "password_hash" not in body


def test_password_is_hashed_not_plaintext(client, db_session):
    _register(client)
    user = db_session.query(User).filter(User.email == "officer@example.com").first()
    assert user is not None
    assert user.password_hash != VALID_PASSWORD
    assert user.password_hash.startswith("$argon2")


def test_duplicate_email_is_rejected(client):
    first = _register(client)
    assert first.status_code == 201
    second = _register(client)
    assert second.status_code == 409


def test_login_with_correct_credentials_returns_jwt(client):
    _register(client)
    response = client.post(
        "/auth/login",
        json={"email": "officer@example.com", "password": VALID_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_with_incorrect_password_fails(client):
    _register(client)
    response = client.post(
        "/auth/login",
        json={"email": "officer@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_with_unknown_email_fails(client):
    response = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": VALID_PASSWORD},
    )
    assert response.status_code == 401


def test_protected_endpoint_works_with_valid_token(client):
    _register(client)
    login_response = client.post(
        "/auth/login",
        json={"email": "officer@example.com", "password": VALID_PASSWORD},
    )
    token = login_response.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "officer@example.com"


def test_protected_endpoint_rejects_missing_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_protected_endpoint_rejects_invalid_token(client):
    response = client.get(
        "/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401
