"""
Tests for Global Alerts endpoints.
"""
import pytest
import asyncio
from datetime import datetime
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.alert import GlobalAlert
from tests.conftest import get_test_client, get_test_db


class TestGlobalAlerts:
    """Test suite for global alerts functionality."""
    
    @pytest.mark.asyncio
    async def test_get_alert_status_no_alerts(self):
        """Test getting alert status when no alerts exist."""
        async with get_test_client() as client:
            # Get JWT token first
            login_response = await client.post(
                "/api/admin/auth/login",
                data={"username": "admin", "password": "admin"}
            )
            assert login_response.status_code == 200
            token = login_response.json()["access_token"]
            
            # Test alert status
            response = await client.get(
                "/api/admin/alerts/global",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["has_active_alert"] is False
            assert data["active_alert"] is None
            assert data["total_alerts_today"] == 0
    
    @pytest.mark.asyncio
    async def test_create_global_alert(self):
        """Test creating a new global alert."""
        async with get_test_client() as client:
            # Get JWT token
            login_response = await client.post(
                "/api/admin/auth/login",
                data={"username": "admin", "password": "admin"}
            )
            token = login_response.json()["access_token"]
            
            # Create alert
            alert_data = {
                "message": "Evacuación preventiva por tormenta eléctrica - Todos los espectáculos suspendidos",
                "alert_type": "emergency"
            }
            
            response = await client.post(
                "/api/admin/alerts/global",
                json=alert_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == alert_data["message"]
            assert data["alert_type"] == "emergency"
            assert data["is_active"] is True
            assert data["created_by"] == "admin"
            assert "id" in data
            assert "activated_at" in data
    
    @pytest.mark.asyncio
    async def test_create_alert_invalid_type(self):
        """Test creating alert with invalid type."""
        async with get_test_client() as client:
            # Get JWT token
            login_response = await client.post(
                "/api/admin/auth/login",
                data={"username": "admin", "password": "admin"}
            )
            token = login_response.json()["access_token"]
            
            # Try to create alert with invalid type
            alert_data = {
                "message": "Test alert",
                "alert_type": "invalid_type"
            }
            
            response = await client.post(
                "/api/admin/alerts/global",
                json=alert_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 400
            assert "Invalid alert type" in response.json()["detail"]
    
    @pytest.mark.asyncio  
    async def test_deactivate_alert(self):
        """Test deactivating an active alert."""
        async with get_test_client() as client:
            # Get JWT token
            login_response = await client.post(
                "/api/admin/auth/login",
                data={"username": "admin", "password": "admin"}
            )
            token = login_response.json()["access_token"]
            
            # First create an alert
            alert_data = {
                "message": "Test emergency alert",
                "alert_type": "emergency"
            }
            
            create_response = await client.post(
                "/api/admin/alerts/global",
                json=alert_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            assert create_response.status_code == 200
            
            # Now deactivate it
            response = await client.delete(
                "/api/admin/alerts/global",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "desactivada correctamente" in data["message"]
            assert data["deactivated_alert"]["is_active"] is False
            assert data["deactivated_alert"]["deactivated_at"] is not None
    
    @pytest.mark.asyncio
    async def test_deactivate_no_active_alert(self):
        """Test deactivating when no active alert exists."""
        async with get_test_client() as client:
            # Get JWT token
            login_response = await client.post(
                "/api/admin/auth/login",
                data={"username": "admin", "password": "admin"}
            )
            token = login_response.json()["access_token"]
            
            # Try to deactivate with no active alert
            response = await client.delete(
                "/api/admin/alerts/global",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "No hay alerta activa" in data["message"]
            assert data["deactivated_alert"] is None
    
    @pytest.mark.asyncio
    async def test_alert_history(self):
        """Test getting alert history."""
        async with get_test_client() as client:
            # Get JWT token
            login_response = await client.post(
                "/api/admin/auth/login",
                data={"username": "admin", "password": "admin"}
            )
            token = login_response.json()["access_token"]
            
            # Create a couple of alerts to have history
            alert_data_1 = {
                "message": "First test alert",
                "alert_type": "warning"
            }
            alert_data_2 = {
                "message": "Second test alert", 
                "alert_type": "emergency"
            }
            
            # Create first alert
            await client.post(
                "/api/admin/alerts/global",
                json=alert_data_1,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            # Create second alert (auto-deactivates first)
            await client.post(
                "/api/admin/alerts/global", 
                json=alert_data_2,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            # Get history
            response = await client.get(
                "/api/admin/alerts/history",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "alerts" in data
            assert "total_count" in data
            assert data["page"] == 1
            assert data["limit"] == 20
            assert len(data["alerts"]) >= 2  # Should have at least our 2 alerts
    
    @pytest.mark.asyncio
    async def test_alert_history_pagination(self):
        """Test alert history with pagination parameters."""
        async with get_test_client() as client:
            # Get JWT token
            login_response = await client.post(
                "/api/admin/auth/login",
                data={"username": "admin", "password": "admin"}
            )
            token = login_response.json()["access_token"]
            
            # Test with custom pagination
            response = await client.get(
                "/api/admin/alerts/history?page=2&limit=5&days_back=7",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["page"] == 2
            assert data["limit"] == 5
    
    @pytest.mark.asyncio
    async def test_only_one_active_alert(self):
        """Test that only one alert can be active at a time."""
        async with get_test_client() as client:
            # Get JWT token
            login_response = await client.post(
                "/api/admin/auth/login", 
                data={"username": "admin", "password": "admin"}
            )
            token = login_response.json()["access_token"]
            
            # Create first alert
            alert_data_1 = {
                "message": "First alert",
                "alert_type": "warning"
            }
            
            response1 = await client.post(
                "/api/admin/alerts/global",
                json=alert_data_1,
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response1.status_code == 200
            first_alert_id = response1.json()["id"]
            
            # Create second alert
            alert_data_2 = {
                "message": "Second alert", 
                "alert_type": "emergency"
            }
            
            response2 = await client.post(
                "/api/admin/alerts/global",
                json=alert_data_2,
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response2.status_code == 200
            
            # Check status - should only show second alert as active
            status_response = await client.get(
                "/api/admin/alerts/global",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert status_response.status_code == 200
            status_data = status_response.json()
            assert status_data["has_active_alert"] is True
            assert status_data["active_alert"]["message"] == "Second alert"
            assert status_data["active_alert"]["id"] != first_alert_id
    
    @pytest.mark.asyncio
    async def test_alert_endpoints_require_auth(self):
        """Test that all alert endpoints require authentication."""
        async with get_test_client() as client:
            # Test GET status without auth
            response = await client.get("/api/admin/alerts/global")
            assert response.status_code == 401
            
            # Test POST without auth
            response = await client.post(
                "/api/admin/alerts/global",
                json={"message": "test", "alert_type": "emergency"}
            )
            assert response.status_code == 401
            
            # Test DELETE without auth
            response = await client.delete("/api/admin/alerts/global")
            assert response.status_code == 401
            
            # Test history without auth
            response = await client.get("/api/admin/alerts/history")
            assert response.status_code == 401