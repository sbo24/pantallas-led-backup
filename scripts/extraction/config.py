"""
Configuration sécurisée pour l'ETL ShowsTrack
"""
import os
from pathlib import Path
from typing import Optional

def load_env_file(env_path: str = ".env") -> None:
    """Charger les variables d'environnement depuis un fichier .env"""
    env_file = Path(env_path)
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

class ETLConfig:
    """Configuration centralisée pour l'ETL"""
    
    def __init__(self):
        # Charger le fichier .env s'il existe
        load_env_file()
        
        # Configuration API ShowsTrack
        self.api_url = os.getenv('SHOWSTRACK_API_URL', 'http://localhost:8000')
        self.username = os.getenv('SHOWSTRACK_USERNAME')
        self.password = os.getenv('SHOWSTRACK_PASSWORD')
        
        # Configuration optionnelle
        self.timeout = int(os.getenv('SHOWSTRACK_TIMEOUT', '60'))
        self.max_retries = int(os.getenv('SHOWSTRACK_MAX_RETRIES', '3'))
        
        # Validation
        if not self.username or not self.password:
            raise ValueError(
                "Credentials manquants. Définissez SHOWSTRACK_USERNAME et SHOWSTRACK_PASSWORD "
                "dans les variables d'environnement ou dans un fichier .env"
            )
    
    def get_credentials(self) -> tuple[str, str, str]:
        """Retourner les credentials de façon sécurisée"""
        return self.api_url, self.username, self.password

# Instance globale
config = ETLConfig()