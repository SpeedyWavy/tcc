# Driver CRUD tests
import pytest

class TestDrivers:
    """Driver CRUD operations"""

    def test_get_drivers_list(self, base_url, api_client, auth_headers):
        """Test GET /api/drivers"""
        response = api_client.get(f"{base_url}/api/drivers", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least 1 driver from seed data"
        
        # Verify driver structure
        if len(data) > 0:
            driver = data[0]
            assert "id" in driver
            assert "full_name" in driver
            assert "role" in driver
            assert driver["role"] == "driver"
            assert "password" not in driver, "Password should not be in response"

    def test_create_driver_and_verify(self, base_url, api_client, auth_headers):
        """Test POST /api/drivers and verify persistence"""
        new_driver = {
            "full_name": "TEST_Maria Motorista",
            "password": "testpass123"
        }
        
        # Create driver
        response = api_client.post(f"{base_url}/api/drivers", json=new_driver, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created["full_name"] == new_driver["full_name"]
        assert created["role"] == "driver"
        assert "password" not in created
        assert "id" in created
        driver_id = created["id"]
        
        # Verify persistence with GET
        get_response = api_client.get(f"{base_url}/api/drivers/{driver_id}", headers=auth_headers)
        assert get_response.status_code == 200, "Driver should be retrievable after creation"
        
        retrieved = get_response.json()
        assert retrieved["full_name"] == new_driver["full_name"]

    def test_update_driver_and_verify(self, base_url, api_client, auth_headers):
        """Test PUT /api/drivers/{id} and verify changes"""
        # Create a driver
        new_driver = {
            "full_name": "TEST_Update Driver",
            "password": "original123"
        }
        create_response = api_client.post(f"{base_url}/api/drivers", json=new_driver, headers=auth_headers)
        assert create_response.status_code == 200
        driver_id = create_response.json()["id"]
        
        # Update driver
        updated_data = {
            "full_name": "TEST_Updated Driver Name",
            "password": "newpass456"
        }
        update_response = api_client.put(f"{base_url}/api/drivers/{driver_id}", json=updated_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify changes persisted
        get_response = api_client.get(f"{base_url}/api/drivers/{driver_id}", headers=auth_headers)
        assert get_response.status_code == 200
        
        retrieved = get_response.json()
        assert retrieved["full_name"] == updated_data["full_name"], "Name should be updated"

    def test_delete_driver_and_verify(self, base_url, api_client, auth_headers):
        """Test DELETE /api/drivers/{id} and verify removal"""
        # Create a driver to delete
        new_driver = {
            "full_name": "TEST_Delete Driver",
            "password": "delete123"
        }
        create_response = api_client.post(f"{base_url}/api/drivers", json=new_driver, headers=auth_headers)
        assert create_response.status_code == 200
        driver_id = create_response.json()["id"]
        
        # Delete driver
        delete_response = api_client.delete(f"{base_url}/api/drivers/{driver_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify driver is gone
        get_response = api_client.get(f"{base_url}/api/drivers/{driver_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Driver should return 404 after deletion"

    def test_create_duplicate_driver(self, base_url, api_client, auth_headers):
        """Test creating driver with duplicate name"""
        driver_data = {
            "full_name": "João Silva",
            "password": "anypass"
        }
        response = api_client.post(f"{base_url}/api/drivers", json=driver_data, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for duplicate name, got {response.status_code}"
