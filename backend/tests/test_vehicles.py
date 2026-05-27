# Vehicle CRUD tests
import pytest

class TestVehicles:
    """Vehicle CRUD operations"""

    def test_get_vehicles_list(self, base_url, api_client, auth_headers):
        """Test GET /api/vehicles"""
        response = api_client.get(f"{base_url}/api/vehicles", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least 1 vehicle from seed data"
        
        # Verify vehicle structure
        if len(data) > 0:
            vehicle = data[0]
            assert "id" in vehicle
            assert "license_plate" in vehicle
            assert "model" in vehicle
            assert "capacity" in vehicle
            assert "status" in vehicle
            assert vehicle["status"] in ["garage", "transit"]

    def test_create_vehicle_and_verify(self, base_url, api_client, auth_headers):
        """Test POST /api/vehicles and verify persistence"""
        new_vehicle = {
            "license_plate": "TEST-9999",
            "model": "Test Van",
            "capacity": 15,
            "driver_id": None
        }
        
        # Create vehicle
        response = api_client.post(f"{base_url}/api/vehicles", json=new_vehicle, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created["license_plate"] == new_vehicle["license_plate"]
        assert created["model"] == new_vehicle["model"]
        assert created["capacity"] == new_vehicle["capacity"]
        assert created["status"] == "garage", "New vehicle should default to garage status"
        assert "id" in created
        vehicle_id = created["id"]
        
        # Verify persistence with GET
        get_response = api_client.get(f"{base_url}/api/vehicles/{vehicle_id}", headers=auth_headers)
        assert get_response.status_code == 200, "Vehicle should be retrievable after creation"
        
        retrieved = get_response.json()
        assert retrieved["license_plate"] == new_vehicle["license_plate"]

    def test_update_vehicle_and_verify(self, base_url, api_client, auth_headers):
        """Test PUT /api/vehicles/{id} and verify changes"""
        # Create a vehicle
        new_vehicle = {
            "license_plate": "TEST-8888",
            "model": "Original Model",
            "capacity": 10,
            "driver_id": None
        }
        create_response = api_client.post(f"{base_url}/api/vehicles", json=new_vehicle, headers=auth_headers)
        assert create_response.status_code == 200
        vehicle_id = create_response.json()["id"]
        
        # Update vehicle
        updated_data = {
            "license_plate": "TEST-8888",
            "model": "Updated Model",
            "capacity": 20,
            "driver_id": None
        }
        update_response = api_client.put(f"{base_url}/api/vehicles/{vehicle_id}", json=updated_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify changes persisted
        get_response = api_client.get(f"{base_url}/api/vehicles/{vehicle_id}", headers=auth_headers)
        assert get_response.status_code == 200
        
        retrieved = get_response.json()
        assert retrieved["model"] == updated_data["model"], "Model should be updated"
        assert retrieved["capacity"] == updated_data["capacity"], "Capacity should be updated"

    def test_update_vehicle_status(self, base_url, api_client, auth_headers):
        """Test PATCH /api/vehicles/{id}/status"""
        # Create a vehicle
        new_vehicle = {
            "license_plate": "TEST-7777",
            "model": "Status Test Van",
            "capacity": 12,
            "driver_id": None
        }
        create_response = api_client.post(f"{base_url}/api/vehicles", json=new_vehicle, headers=auth_headers)
        assert create_response.status_code == 200
        vehicle_id = create_response.json()["id"]
        
        # Update status to transit
        status_response = api_client.patch(
            f"{base_url}/api/vehicles/{vehicle_id}/status",
            json={"status": "transit"},
            headers=auth_headers
        )
        assert status_response.status_code == 200, f"Expected 200, got {status_response.status_code}"
        
        # Verify status changed
        get_response = api_client.get(f"{base_url}/api/vehicles/{vehicle_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "transit", "Status should be updated to transit"

    def test_delete_vehicle_and_verify(self, base_url, api_client, auth_headers):
        """Test DELETE /api/vehicles/{id} and verify removal"""
        # Create a vehicle to delete
        new_vehicle = {
            "license_plate": "TEST-6666",
            "model": "Delete Test Van",
            "capacity": 8,
            "driver_id": None
        }
        create_response = api_client.post(f"{base_url}/api/vehicles", json=new_vehicle, headers=auth_headers)
        assert create_response.status_code == 200
        vehicle_id = create_response.json()["id"]
        
        # Delete vehicle
        delete_response = api_client.delete(f"{base_url}/api/vehicles/{vehicle_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify vehicle is gone
        get_response = api_client.get(f"{base_url}/api/vehicles/{vehicle_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Vehicle should return 404 after deletion"

    def test_create_duplicate_vehicle(self, base_url, api_client, auth_headers):
        """Test creating vehicle with duplicate license plate"""
        vehicle_data = {
            "license_plate": "ABC-1234",
            "model": "Duplicate Test",
            "capacity": 10,
            "driver_id": None
        }
        response = api_client.post(f"{base_url}/api/vehicles", json=vehicle_data, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for duplicate plate, got {response.status_code}"
