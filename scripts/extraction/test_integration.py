"""
Test simple d'intégration ETL → API ShowsTrack
"""
from api.showstrack_api_client import ShowsTrackAPIClient
from config import config

def test_api():
    """Test simple de l'API"""
    
    # Données de test
    test_data = {
        "metadata": {
            "extraction_time": "2025-08-14T12:00:00",
            "total_events": 1,
            "date_range": ["2025-08-14"],
            "source": "puy_du_fou_api",
            "version": "1.0",
            "extraction_summary": {
                "events_by_type": {"show": 1},
                "events_by_show": {"Test Show": 1},
                "events_by_date": {"2025-08-14": 1}
            }
        },
        "events": [
            {
                "external_event_id": "test_etl_001",
                "show_name": "Test ETL Integration",
                "event_date": "2025-08-14",
                "start_time": "14:30",
                "end_time": "15:00",
                "duration_minutes": 30,
                "event_type": "show"
            }
        ]
    }
    
    print("Test d'integration ETL -> API ShowsTrack")
    print("=" * 50)
    
    # Test authentification
    print("1. Authentification...")
    api_url, username, password = config.get_credentials()
    api_client = ShowsTrackAPIClient(api_url, username, password)
    
    if api_client.authenticate():
        print("   OK - Authentification reussie")
    else:
        print("   ERREUR - Echec authentification")
        return
    
    # Test envoi dry-run
    print("2. Envoi donnees (dry-run)...")
    result = api_client.send_import_data(test_data, dry_run=True)
    
    if result["success"]:
        print("   OK - Envoi reussi")
        print(f"   Message: {result.get('message')}")
        
        validation = result.get('validation_result', {})
        if validation:
            print(f"   Total events: {validation.get('total_events', 0)}")
            print(f"   Nouveaux: {validation.get('new_events', 0)}")
    else:
        print(f"   ERREUR - {result.get('error')}")
    
    print("\nTest termine!")

if __name__ == "__main__":
    test_api()