# Student CRUD tests
import pytest

class TestStudents:
    """Student CRUD operations"""

    def test_get_students_list(self, base_url, api_client, auth_headers):
        """Test GET /api/students"""
        response = api_client.get(f"{base_url}/api/students", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 3, "Should have at least 3 students from seed data"
        
        # Verify student structure
        if len(data) > 0:
            student = data[0]
            assert "id" in student
            assert "name" in student
            assert "address" in student
            assert "_id" not in student, "Response should not contain _id field"

    def test_create_student_and_verify(self, base_url, api_client, auth_headers):
        """Test POST /api/students and verify persistence"""
        new_student = {
            "name": "TEST_Carlos Silva",
            "address": "Rua Teste, 123, São Paulo, SP",
            "parent_contact": "11999999999"
        }
        
        # Create student
        response = api_client.post(f"{base_url}/api/students", json=new_student, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created["name"] == new_student["name"]
        assert created["address"] == new_student["address"]
        assert created["parent_contact"] == new_student["parent_contact"]
        assert "id" in created
        student_id = created["id"]
        
        # Verify persistence with GET
        get_response = api_client.get(f"{base_url}/api/students/{student_id}", headers=auth_headers)
        assert get_response.status_code == 200, "Student should be retrievable after creation"
        
        retrieved = get_response.json()
        assert retrieved["name"] == new_student["name"]
        assert retrieved["address"] == new_student["address"]

    def test_update_student_and_verify(self, base_url, api_client, auth_headers):
        """Test PUT /api/students/{id} and verify changes"""
        # First create a student
        new_student = {
            "name": "TEST_Update Student",
            "address": "Rua Original, 100",
            "parent_contact": "11888888888"
        }
        create_response = api_client.post(f"{base_url}/api/students", json=new_student, headers=auth_headers)
        assert create_response.status_code == 200
        student_id = create_response.json()["id"]
        
        # Update student
        updated_data = {
            "name": "TEST_Updated Name",
            "address": "Rua Atualizada, 200",
            "parent_contact": "11777777777"
        }
        update_response = api_client.put(f"{base_url}/api/students/{student_id}", json=updated_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify changes persisted
        get_response = api_client.get(f"{base_url}/api/students/{student_id}", headers=auth_headers)
        assert get_response.status_code == 200
        
        retrieved = get_response.json()
        assert retrieved["name"] == updated_data["name"], "Name should be updated"
        assert retrieved["address"] == updated_data["address"], "Address should be updated"
        assert retrieved["parent_contact"] == updated_data["parent_contact"], "Contact should be updated"

    def test_delete_student_and_verify(self, base_url, api_client, auth_headers):
        """Test DELETE /api/students/{id} and verify removal"""
        # Create a student to delete
        new_student = {
            "name": "TEST_Delete Student",
            "address": "Rua Delete, 300",
            "parent_contact": "11666666666"
        }
        create_response = api_client.post(f"{base_url}/api/students", json=new_student, headers=auth_headers)
        assert create_response.status_code == 200
        student_id = create_response.json()["id"]
        
        # Delete student
        delete_response = api_client.delete(f"{base_url}/api/students/{student_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify student is gone
        get_response = api_client.get(f"{base_url}/api/students/{student_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Student should return 404 after deletion"

    def test_get_student_invalid_id(self, base_url, api_client, auth_headers):
        """Test GET with invalid student ID"""
        response = api_client.get(f"{base_url}/api/students/invalid_id", headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"

    def test_create_student_missing_fields(self, base_url, api_client, auth_headers):
        """Test POST with missing required fields"""
        incomplete_student = {"name": "Only Name"}
        response = api_client.post(f"{base_url}/api/students", json=incomplete_student, headers=auth_headers)
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
