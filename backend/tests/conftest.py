import pytest
import requests
import os

@pytest.fixture(scope="session")
def base_url():
    """Get base URL from environment"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL not set in environment")
    return url.rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def admin_token(base_url, api_client):
    """Get admin token for authenticated requests"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "full_name": "Debora",
        "password": "12345"
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def driver_token(base_url, api_client):
    """Get driver token for authenticated requests"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "full_name": "João Silva",
        "password": "driver123"
    })
    if response.status_code != 200:
        pytest.skip(f"Driver login failed: {response.status_code}")
    return response.json()["access_token"]

@pytest.fixture
def auth_headers(admin_token):
    """Headers with admin authentication"""
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def driver_headers(driver_token):
    """Headers with driver authentication"""
    return {"Authorization": f"Bearer {driver_token}"}
