# Stats endpoint tests
import pytest

class TestStats:
    """Stats endpoint tests"""

    def test_get_stats_as_admin(self, base_url, api_client, auth_headers):
        """Test GET /api/stats as admin"""
        response = api_client.get(f"{base_url}/api/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_students" in data
        assert "total_drivers" in data
        assert "total_vehicles" in data
        assert "vehicles_in_transit" in data
        assert "vehicles_in_garage" in data
        assert "total_routes" in data
        assert "total_admins" in data
        
        # Verify data types
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_drivers"], int)
        assert isinstance(data["total_vehicles"], int)
        assert isinstance(data["vehicles_in_transit"], int)
        assert isinstance(data["vehicles_in_garage"], int)
        assert isinstance(data["total_routes"], int)
        assert isinstance(data["total_admins"], int)
        
        # Verify reasonable values
        assert data["total_students"] >= 3, "Should have at least 3 students from seed"
        assert data["total_drivers"] >= 1, "Should have at least 1 driver from seed"
        assert data["total_vehicles"] >= 1, "Should have at least 1 vehicle from seed"
        assert data["total_admins"] >= 1, "Should have at least 1 admin (Debora)"

    def test_get_stats_as_driver_forbidden(self, base_url, api_client, driver_headers):
        """Test GET /api/stats as driver (should be forbidden)"""
        response = api_client.get(f"{base_url}/api/stats", headers=driver_headers)
        assert response.status_code == 403, f"Expected 403 for driver accessing stats, got {response.status_code}"

    def test_get_stats_no_auth(self, base_url, api_client):
        """Test GET /api/stats without authentication"""
        response = api_client.get(f"{base_url}/api/stats")
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
