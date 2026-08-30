def test_app_starts_and_root_works(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "name" in response.json()


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
