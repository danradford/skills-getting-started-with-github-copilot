import urllib.parse
from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister():
    activity = "Chess Club"
    email = "testuser@example.com"

    # Ensure test email is not present at start
    activities[activity]["participants"] = [p for p in activities[activity]["participants"] if p != email]

    # Sign up
    resp = client.post(f"/activities/{urllib.parse.quote(activity)}/signup", params={"email": email})
    assert resp.status_code == 200
    j = resp.json()
    assert "Signed up" in j["message"]

    # Confirm present
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    assert email in resp2.json()[activity]["participants"]

    # Unregister
    resp3 = client.delete(f"/activities/{urllib.parse.quote(activity)}/participants", params={"email": email})
    assert resp3.status_code == 200
    j3 = resp3.json()
    assert "Unregistered" in j3["message"]

    # Confirm removed
    resp4 = client.get("/activities")
    assert email not in resp4.json()[activity]["participants"]
