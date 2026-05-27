# Route generation and management tests
import pytest

class TestRoutes:
    """Route generation and CRUD operations"""

    def test_get_routes_list(self, base_url, api_client, auth_headers):
        """Test GET /api/routes"""
        response = api_client.get(f"{base_url}/api/routes", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify route structure if routes exist
        if len(data) > 0:
            route = data[0]
            assert "id" in route
            assert "vehicle_id" in route
            assert "driver_id" in route
            assert "stops" in route
            assert isinstance(route["stops"], list)
            
            if len(route["stops"]) > 0:
                stop = route["stops"][0]
                assert "student_id" in stop
                assert "student_name" in stop
                assert "address" in stop
                assert "order" in stop

    def test_generate_routes(self, base_url, api_client, auth_headers):
        """Test POST /api/routes/generate"""
        response = api_client.post(f"{base_url}/api/routes/generate", json={}, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "routes_created" in data
        assert "students_assigned" in data
        assert data["routes_created"] >= 1, "Should create at least 1 route"

    def test_get_route_by_id(self, base_url, api_client, auth_headers):
        """Test GET /api/routes/{id}"""
        # First get list of routes
        list_response = api_client.get(f"{base_url}/api/routes", headers=auth_headers)
        assert list_response.status_code == 200
        
        routes = list_response.json()
        if len(routes) > 0:
            route_id = routes[0]["id"]
            
            # Get specific route
            get_response = api_client.get(f"{base_url}/api/routes/{route_id}", headers=auth_headers)
            assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
            
            route = get_response.json()
            assert route["id"] == route_id
            assert "stops" in route

    def test_delete_route_and_verify(self, base_url, api_client, auth_headers):
        """Test DELETE /api/routes/{id} and verify removal"""
        # First generate routes to ensure we have one
        api_client.post(f"{base_url}/api/routes/generate", json={}, headers=auth_headers)
        
        # Get a route to delete
        list_response = api_client.get(f"{base_url}/api/routes", headers=auth_headers)
        routes = list_response.json()
        
        if len(routes) > 0:
            route_id = routes[0]["id"]
            
            # Delete route
            delete_response = api_client.delete(f"{base_url}/api/routes/{route_id}", headers=auth_headers)
            assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
            
            # Verify route is gone
            get_response = api_client.get(f"{base_url}/api/routes/{route_id}", headers=auth_headers)
            assert get_response.status_code == 404, "Route should return 404 after deletion"

    def test_driver_get_own_route(self, base_url, api_client, driver_headers):
        """Test GET /api/drivers/me/route as driver"""
        response = api_client.get(f"{base_url}/api/drivers/me/route", headers=driver_headers)
        # Should return 200 if route exists, 404 if no route assigned
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            route = response.json()
            assert "id" in route
            assert "stops" in route
            assert len(route["stops"]) >= 1, "Driver route should have at least 1 stop"
