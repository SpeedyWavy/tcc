# Authentication endpoint tests
import pytest

class TestAuth:
    """Authentication flow tests"""

    def test_login_admin_success(self, base_url, api_client):
        """Test admin login with correct credentials"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "full_name": "Debora",
            "password": "12345"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response missing access_token"
        assert "token_type" in data, "Response missing token_type"
        assert "user" in data, "Response missing user"
        assert data["user"]["role"] == "admin", "User role should be admin"
        assert data["user"]["full_name"] == "Debora", "User name mismatch"

    def test_login_admin_by_email_success(self, base_url, api_client):
        """Test admin login using email instead of name"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "identifier": "debora@local.tcc",
            "password": "12345"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "debora@local.tcc"

    def test_login_driver_success(self, base_url, api_client):
        """Test driver login with correct credentials"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "full_name": "João Silva",
            "password": "driver123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "driver"
        assert data["user"]["full_name"] == "João Silva"

    def test_login_invalid_credentials(self, base_url, api_client):
        """Test login with wrong password"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "full_name": "Debora",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_login_nonexistent_user(self, base_url, api_client):
        """Test login with non-existent user"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "full_name": "NonExistentUser",
            "password": "password"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_get_me_authenticated(self, base_url, api_client, auth_headers):
        """Test /auth/me with valid token"""
        response = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data
        assert "full_name" in data
        assert "role" in data
        assert data["role"] == "admin"

    def test_get_me_no_token(self, base_url, api_client):
        """Test /auth/me without token"""
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
