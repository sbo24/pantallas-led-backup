"""
Client API ShowsTrack pour l'envoi automatique des données ETL
"""
import requests
import json
import logging
import os
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ShowsTrackAPIClient:
    """Client pour envoyer les données à l'API ShowsTrack"""
    
    def __init__(self, base_url: str = None, username: str = None, password: str = None):
        self.base_url = (base_url or os.getenv('SHOWSTRACK_API_URL', 'http://localhost:8000')).rstrip('/')
        self.username = username or os.getenv('SHOWSTRACK_USERNAME')
        self.password = password or os.getenv('SHOWSTRACK_PASSWORD')
        self.token = None
        
        # Validation des credentials
        if not self.username or not self.password:
            raise ValueError("Username et password requis. Utilisez les variables d'environnement SHOWSTRACK_USERNAME et SHOWSTRACK_PASSWORD")
        
    def authenticate(self) -> bool:
        """Authentification JWT avec l'API ShowsTrack"""
        try:
            # Préparer les données de connexion (form data)
            form_data = {
                'username': self.username,
                'password': self.password
            }
            
            response = requests.post(
                f"{self.base_url}/api/admin/auth/login",
                data=form_data,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                logger.info("Authentication successful")
                return True
            else:
                logger.error(f"Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False
    
    def send_import_data(self, json_data: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        """
        Envoyer les données d'importation à l'API ShowsTrack
        
        Args:
            json_data: Données au format ShowsTrack JSON
            dry_run: Mode test (ne pas appliquer les changements)
            
        Returns:
            Réponse de l'API avec les résultats
        """
        if not self.token:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
        
        try:
            # Préparer les données d'importation
            import_payload = {
                "data": json_data,
                "dry_run": dry_run,
                "preserve_overrides": True
            }
            
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/api/admin/import",
                json=import_payload,
                headers=headers,
                timeout=60
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"Import successful: {result.get('message', 'OK')}")
                return {
                    "success": True,
                    "import_id": result.get('import_id'),
                    "status": result.get('status'),
                    "message": result.get('message'),
                    "validation_result": result.get('validation_result'),
                    "applied": result.get('applied', False),
                    "execution_time": result.get('execution_time_seconds')
                }
            else:
                error_msg = f"Import failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}
                
        except Exception as e:
            error_msg = f"Import request error: {e}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    def get_import_history(self, limit: int = 10) -> Dict[str, Any]:
        """Obtenir l'historique des importations"""
        if not self.token:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            
            response = requests.get(
                f"{self.base_url}/api/admin/import/history",
                headers=headers,
                params={'size': limit},
                timeout=30
            )
            
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}