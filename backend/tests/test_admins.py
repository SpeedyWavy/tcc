# Admin management tests
import pytest

class TestAdmins:
    """Admin CRUD operations"""

    def test_get_admins_list(self, base_url, api_client, auth_headers):
        """Test GET /api/admins"""
        response = api_client.get(f"{base_url}/api/admins", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least 1 admin (Debora)"
        
        # Verify admin structure
        if len(data) > 0:
            admin = data[0]
            assert "id" in admin
            assert "full_name" in admin
            assert "role" in admin
            assert admin["role"] == "admin"
            assert "password" not in admin, "Password should not be in response"

    def test_create_admin_and_verify(self, base_url, api_client, auth_headers):
        """Test POST /api/admins and verify persistence"""
        new_admin = {
            "full_name": "TEST_Admin Secundário",
            "password": "admin123",
            "role": "admin"
        }
        
        # Create admin
        response = api_client.post(f"{base_url}/api/admins", json=new_admin, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created["full_name"] == new_admin["full_name"]
        assert created["role"] == "admin"
        assert "password" not in created
        assert "id" in created
        admin_id = created["id"]
        
        # Verify admin can login
        login_response = api_client.post(f"{base_url}/api/auth/login", json={
            "full_name": new_admin["full_name"],
            "password": new_admin["password"]
        })
        assert login_response.status_code == 200, "New admin should be able to login"

    def test_update_admin_and_verify(self, base_url, api_client, auth_headers):
        """Test PUT /api/admins/{id} and verify changes"""
        # Create an admin
        new_admin = {
            "full_name": "TEST_Update Admin",
            "password": "original123",
            "role": "admin"
        }
        create_response = api_client.post(f"{base_url}/api/admins", json=new_admin, headers=auth_headers)
        assert create_response.status_code == 200
        admin_id = create_response.json()["id"]
        
        # Update admin
        updated_data = {
            "full_name": "TEST_Updated Admin Name",
            "password": "newpass456"
        }
        update_response = api_client.put(f"{base_url}/api/admins/{admin_id}", json=updated_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify name changed
        get_response = api_client.get(f"{base_url}/api/admins", headers=auth_headers)
        admins = get_response.json()
        updated_admin = next((a for a in admins if a["id"] == admin_id), None)
        assert updated_admin is not None
        assert updated_admin["full_name"] == updated_data["full_name"], "Name should be updated"

    def test_delete_admin_and_verify(self, base_url, api_client, auth_headers):
        """Test DELETE /api/admins/{id} and verify removal"""
        # Create an admin to delete
        new_admin = {
            "full_name": "TEST_Delete Admin",
            "password": "delete123",
            "role": "admin"
        }
        create_response = api_client.post(f"{base_url}/api/admins", json=new_admin, headers=auth_headers)
        assert create_response.status_code == 200
        admin_id = create_response.json()["id"]
        
        # Delete admin
        delete_response = api_client.delete(f"{base_url}/api/admins/{admin_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify admin is gone from list
        get_response = api_client.get(f"{base_url}/api/admins", headers=auth_headers)
        admins = get_response.json()
        deleted_admin = next((a for a in admins if a["id"] == admin_id), None)
        assert deleted_admin is None, "Admin should not be in list after deletion"

    def test_create_duplicate_admin(self, base_url, api_client, auth_headers):
        """Test creating admin with duplicate name"""
        admin_data = {
            "full_name": "Debora",
            "password": "anypass",
            "role": "admin"
        }
        response = api_client.post(f"{base_url}/api/admins", json=admin_data, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for duplicate name, got {response.status_code}"
