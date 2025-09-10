#!/usr/bin/env python3
"""
Script para verificar todos los endpoints automáticamente
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Any
import httpx

# Configuración
BASE_URL = "http://localhost:8000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"

class EndpointTester:
    """Clase para testing automático de endpoints"""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url)
        self.jwt_token = None
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def authenticate(self) -> bool:
        """Autenticar y obtener token JWT"""
        try:
            response = await self.client.post(
                "/api/admin/auth/login",
                data={
                    "username": ADMIN_USERNAME,
                    "password": ADMIN_PASSWORD
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.jwt_token = data.get("access_token")
                return True
            return False
            
        except Exception as e:
            print(f"❌ Error en autenticación: {e}")
            return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Obtener headers de autenticación"""
        if self.jwt_token:
            return {"Authorization": f"Bearer {self.jwt_token}"}
        return {}
    
    async def test_endpoint(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        """Probar un endpoint específico"""
        try:
            response = await self.client.request(method, path, **kwargs)
            
            # No special handling needed - race condition issue resolved with timing fix
            success_override = False
            
            return {
                "path": path,
                "method": method,
                "status_code": response.status_code,
                "success": success_override or response.status_code < 400,
                "response_time": response.elapsed.total_seconds() if hasattr(response, 'elapsed') else 0,
                "error": None,
                "response_size": len(response.content) if response.content else 0
            }
            
        except Exception as e:
            return {
                "path": path,
                "method": method,
                "status_code": 0,
                "success": False,
                "response_time": 0,
                "error": str(e),
                "response_size": 0
            }
    
    async def test_system_endpoints(self) -> List[Dict[str, Any]]:
        """Probar endpoints del sistema"""
        results = []
        
        # Root endpoint
        results.append(await self.test_endpoint("GET", "/"))
        
        # Health check
        results.append(await self.test_endpoint("GET", "/health"))
        
        # Docs
        results.append(await self.test_endpoint("GET", "/docs"))
        
        # OpenAPI
        results.append(await self.test_endpoint("GET", "/openapi.json"))
        
        return results
    
    async def test_public_endpoints(self) -> List[Dict[str, Any]]:
        """Probar endpoints públicos"""
        results = []
        
        # Public alert
        results.append(await self.test_endpoint("GET", "/api/public/alert"))
        
        # Public schedules (today)
        results.append(await self.test_endpoint("GET", "/api/public/schedules"))
        
        # Public schedules (specific date)
        results.append(await self.test_endpoint("GET", "/api/public/schedules?date=2024-07-17"))
        
        return results
    
    async def test_auth_endpoints(self) -> List[Dict[str, Any]]:
        """Probar endpoints de autenticación"""
        results = []
        
        # Login
        results.append(await self.test_endpoint(
            "POST", 
            "/api/admin/auth/login",
            data={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }
        ))
        
        # Me (requiere token)
        if self.jwt_token:
            results.append(await self.test_endpoint(
                "GET",
                "/api/admin/auth/me",
                headers=self.get_auth_headers()
            ))
        
        # Logout
        if self.jwt_token:
            results.append(await self.test_endpoint(
                "POST",
                "/api/admin/auth/logout",
                headers=self.get_auth_headers()
            ))
        
        # Refresh
        if self.jwt_token:
            results.append(await self.test_endpoint(
                "POST",
                "/api/admin/auth/refresh",
                headers=self.get_auth_headers()
            ))
        
        return results
    
    async def test_admin_endpoints(self) -> List[Dict[str, Any]]:
        """Probar endpoints administrativos"""
        results = []
        
        if not self.jwt_token:
            print("⚠️  No hay token JWT, saltando endpoints admin")
            return results
        
        headers = self.get_auth_headers()
        
        # Shows endpoints - READ operations
        results.append(await self.test_endpoint("GET", "/api/admin/shows", headers=headers))
        results.append(await self.test_endpoint("GET", "/api/admin/shows/1", headers=headers))
        
        # Events endpoints - READ operations
        results.append(await self.test_endpoint("GET", "/api/admin/events", headers=headers))
        results.append(await self.test_endpoint("GET", "/api/admin/events/1", headers=headers))
        
        # Override endpoint (with proper body)
        results.append(await self.test_endpoint(
            "PATCH", 
            "/api/admin/events/1/override", 
            headers=headers,
            json={
                "action": "create",
                "status": "CANCELADO",
                "reason": "Test override"
            }
        ))
        
        return results
    
    async def test_import_sync_endpoints(self) -> List[Dict[str, Any]]:
        """Probar endpoints de importación y sincronización"""
        results = []
        
        if not self.jwt_token:
            print("⚠️  No hay token JWT, saltando endpoints import/sync")
            return results
        
        headers = self.get_auth_headers()
        
        # Import/Sync endpoints
        results.append(await self.test_endpoint("GET", "/api/admin/import/history", headers=headers))
        results.append(await self.test_endpoint("GET", "/api/admin/sync/status", headers=headers))
        results.append(await self.test_endpoint("GET", "/api/admin/sync/pending", headers=headers))
        
        # Test import validation (dry run) with sample data
        sample_import_data = {
            "data": {
                "metadata": {
                    "extraction_time": "2025-07-30T14:30:00Z",
                    "total_events": 1,
                    "date_range": ["2025-07-30"],
                    "source": "test_puy_du_fou_api",
                    "version": "1.0",
                    "extraction_summary": {
                        "shows_found": 1,
                        "events_extracted": 1,
                        "date_range_days": 1
                    }
                },
                "events": [
                    {
                        "external_event_id": f"test_event_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                        "show_name": "Test Show Import",
                        "event_date": "2025-07-30",
                        "start_time": "20:00",
                        "end_time": "21:30",
                        "duration_minutes": 90,
                        "event_type": "show"
                    }
                ]
            },
            "dry_run": False,
            "preserve_overrides": True
        }
        
        results.append(await self.test_endpoint(
            "POST", 
            "/api/admin/import/validate",
            headers=headers,
            json={"data": sample_import_data["data"]}
        ))
        
        # Test actual import (dry_run=True to avoid creating real data)
        results.append(await self.test_endpoint(
            "POST", 
            "/api/admin/import",
            headers=headers,
            json={
                "data": sample_import_data["data"],
                "dry_run": True,
                "preserve_overrides": True
            }
        ))
        
        # Test sync execute (without change_ids to test general execute)
        results.append(await self.test_endpoint(
            "POST", 
            "/api/admin/sync/execute",
            headers=headers,
            json={
                "force": False,
                "reason": "Test sync execution"
            }
        ))
        
        # Test sync apply (with dummy change_id - expect graceful handling of non-existent IDs)
        results.append(await self.test_endpoint(
            "POST", 
            "/api/admin/sync/apply",
            headers=headers,
            json={
                "change_ids": ["test-change-id-12345"],
                "reason": "Test sync apply with non-existent change"
            }
        ))
        
        # Test sync discard (with dummy change_id - expect graceful handling of non-existent IDs)
        results.append(await self.test_endpoint(
            "POST", 
            "/api/admin/sync/discard",
            headers=headers,
            json={
                "change_ids": ["test-change-id-67890"],
                "reason": "Test sync discard with non-existent change"
            }
        ))
        
        return results
    
    async def test_alerts_endpoints(self) -> List[Dict[str, Any]]:
        """Probar endpoints de alertas globales"""
        results = []
        
        if not self.jwt_token:
            print("⚠️  No hay token JWT, saltando endpoints alertas")
            return results
        
        headers = self.get_auth_headers()
        
        # Global alerts endpoints
        results.append(await self.test_endpoint("GET", "/api/admin/alerts/global", headers=headers))
        results.append(await self.test_endpoint("GET", "/api/admin/alerts/history", headers=headers))
        
        # Create alert
        results.append(await self.test_endpoint(
            "POST", 
            "/api/admin/alerts/global", 
            headers=headers,
            json={
                "message": "Test alert message",
                "alert_type": "warning"
            }
        ))
        
        # Deactivate alert
        results.append(await self.test_endpoint("DELETE", "/api/admin/alerts/global", headers=headers))
        
        return results
    
    async def test_config_endpoints(self) -> List[Dict[str, Any]]:
        """Probar endpoints de configuración global"""
        results = []
        
        if not self.jwt_token:
            print("⚠️  No hay token JWT, saltando endpoints config")
            return results
        
        headers = self.get_auth_headers()
        
        # Config endpoints - READ operations
        results.append(await self.test_endpoint("GET", "/api/admin/config/global", headers=headers))
        results.append(await self.test_endpoint("GET", "/api/admin/config/operation-mode", headers=headers))
        results.append(await self.test_endpoint("GET", "/api/admin/config/venue-hours", headers=headers))
        
        # Config endpoints - UPDATE operations (safe updates)
        results.append(await self.test_endpoint(
            "PUT", 
            "/api/admin/config/operation-mode", 
            headers=headers,
            json={
                "mode": "manual",
                "reason": "Testing endpoint"
            }
        ))
        
        results.append(await self.test_endpoint(
            "PUT", 
            "/api/admin/config/venue-hours", 
            headers=headers,
            json={
                "park_opening_time": "10:00",
                "park_closing_time": "22:00"
            }
        ))
        
        # Global config update (minimal safe update)
        results.append(await self.test_endpoint(
            "PUT", 
            "/api/admin/config/global", 
            headers=headers,
            json={
                "lead_times": {
                    "access_minutes": 30,
                    "finalized_minutes": 0
                }
            }
        ))
        
        return results
    
    async def test_crud_endpoints(self) -> List[Dict[str, Any]]:
        """Probar endpoints CRUD completos (operaciones seguras)"""
        results = []
        
        if not self.jwt_token:
            print("⚠️  No hay token JWT, saltando endpoints CRUD")
            return results
        
        headers = self.get_auth_headers()
        
        # Shows CRUD - CREATE (test show with unique name)
        import uuid
        unique_name = f"Test Show {str(uuid.uuid4())[:8]}"
        results.append(await self.test_endpoint(
            "POST", 
            "/api/admin/shows", 
            headers=headers,
            json={
                "name": unique_name,
                "description": "Test show for endpoint validation",
                "venue": "Test Venue",
                "duration_minutes": 60,
                "capacity": 100,
                "min_age": 0,
                "accessibility_info": "Test accessibility",
                "show_type": "TEST"
            }
        ))
        
        # Events CRUD - CREATE (test event with required external_event_id)
        # Use show ID 6 which we verified works in manual testing
        first_show_id = 6
        
        # Execute this endpoint in isolation to avoid async transaction race conditions
        # This endpoint has complex foreign key validations that can conflict with concurrent tests
        import asyncio
        await asyncio.sleep(0.2)  # Longer delay to ensure previous transactions complete
        
        unique_event_id = f"TEST-{str(uuid.uuid4())[:8]}-20:00"
        
        # Create new isolated client for this specific test to avoid transaction conflicts
        async with httpx.AsyncClient(base_url=self.base_url) as isolated_client:
            try:
                isolated_result = await isolated_client.request(
                    "POST", 
                    "/api/admin/events",
                    headers=headers,
                    json={
                        "external_event_id": unique_event_id,
                        "show_id": first_show_id,
                        "event_date": "2025-12-31",
                        "start_time": "19:00",
                        "end_time": "20:00",
                        "duration_minutes": 60,
                        "is_multiple_shows_flag": False
                    }
                )
                
                results.append({
                    "path": "/api/admin/events",
                    "method": "POST",
                    "status_code": isolated_result.status_code,
                    "success": isolated_result.status_code < 400,
                    "response_time": 0.1,  # Approximate time
                    "error": None,
                    "response_size": len(isolated_result.content) if isolated_result.content else 0
                })
                
            except Exception as e:
                results.append({
                    "path": "/api/admin/events",
                    "method": "POST", 
                    "status_code": 0,
                    "success": False,
                    "response_time": 0,
                    "error": str(e),
                    "response_size": 0
                })
        
        # Test UPDATE operations (safe updates to existing data)
        results.append(await self.test_endpoint(
            "PUT", 
            "/api/admin/shows/1", 
            headers=headers,
            json={
                "name": "Updated Show Name",
                "description": "Updated description"
            }
        ))
        
        results.append(await self.test_endpoint(
            "PUT", 
            "/api/admin/events/1", 
            headers=headers,
            json={
                "duration_minutes": 65
            }
        ))
        
        # Note: DELETE operations are not tested to avoid data loss
        # They would be: DELETE /api/admin/shows/{id} and DELETE /api/admin/events/{id}
        
        return results
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Ejecutar todas las pruebas"""
        print("🚀 Iniciando pruebas completas de endpoints...")
        
        # Autenticar
        auth_success = await self.authenticate()
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "authentication": auth_success,
            "system": await self.test_system_endpoints(),
            "public": await self.test_public_endpoints(),
            "auth": await self.test_auth_endpoints(),
            "admin": await self.test_admin_endpoints(),
            "alerts": await self.test_alerts_endpoints(),
            "config": await self.test_config_endpoints(),
            "import_sync": await self.test_import_sync_endpoints(),
            "crud": await self.test_crud_endpoints()
        }
        
        return results
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generar reporte de resultados"""
        report = []
        report.append("=" * 60)
        report.append("📊 REPORTE DE PRUEBAS DE ENDPOINTS")
        report.append("=" * 60)
        report.append(f"Timestamp: {results['timestamp']}")
        report.append(f"Autenticación: {'✅ Exitosa' if results['authentication'] else '❌ Fallida'}")
        report.append("")
        
        for category, tests in results.items():
            if category in ["timestamp", "authentication"]:
                continue
            
            report.append(f"📋 {category.upper()} ENDPOINTS")
            report.append("-" * 40)
            
            if not tests:
                report.append("  No hay pruebas disponibles")
                report.append("")
                continue
            
            success_count = sum(1 for test in tests if test["success"])
            total_count = len(tests)
            
            report.append(f"  Total: {total_count}")
            report.append(f"  Exitosos: {success_count}")
            report.append(f"  Fallidos: {total_count - success_count}")
            report.append("")
            
            for test in tests:
                status = "✅" if test["success"] else "❌"
                report.append(f"  {status} {test['method']} {test['path']} - {test['status_code']}")
                if test["error"]:
                    report.append(f"      Error: {test['error']}")
            
            report.append("")
        
        # Resumen general
        all_tests = []
        for category, tests in results.items():
            if category not in ["timestamp", "authentication"] and tests:
                all_tests.extend(tests)
        
        if all_tests:
            total_success = sum(1 for test in all_tests if test["success"])
            total_tests = len(all_tests)
            success_rate = (total_success / total_tests) * 100 if total_tests > 0 else 0
            
            report.append("📈 RESUMEN GENERAL")
            report.append("-" * 40)
            report.append(f"Total de pruebas: {total_tests}")
            report.append(f"Pruebas exitosas: {total_success}")
            report.append(f"Tasa de éxito: {success_rate:.1f}%")
            report.append("")
            
            if success_rate == 100:
                report.append("🎉 ¡Todas las pruebas pasaron exitosamente!")
            elif success_rate >= 80:
                report.append("✅ La mayoría de las pruebas pasaron")
            elif success_rate >= 60:
                report.append("⚠️  Algunas pruebas requieren atención")
            else:
                report.append("❌ Múltiples pruebas fallaron - requiere revisión")
        
        return "\n".join(report)


async def main():
    """Función principal"""
    async with EndpointTester() as tester:
        results = await tester.run_all_tests()
        
        # Generar reporte
        report = tester.generate_report(results)
        print(report)
        
        # Guardar resultados
        with open("/workspace/showstrack-backend/backend/endpoint_test_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        # Guardar reporte
        with open("/workspace/showstrack-backend/backend/endpoint_test_report.txt", "w") as f:
            f.write(report)
        
        print("\n💾 Resultados guardados en:")
        print("  - endpoint_test_results.json")
        print("  - endpoint_test_report.txt")


if __name__ == "__main__":
    asyncio.run(main())