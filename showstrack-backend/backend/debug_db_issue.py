#!/usr/bin/env python3
"""
Script to debug the database session issue in POST /api/admin/events testing
"""
import asyncio
import sys
import json
from typing import AsyncGenerator
sys.path.append('.')

from app.database.session import get_db
from app.models.show import Show
from app.models.event import ScheduledEvent
from app.services.event_service import EventService
from app.schemas.event import EventCreate
from sqlalchemy import select
import httpx
from fastapi.testclient import TestClient
from app.main import app

async def test_db_directly():
    """Test database access directly"""
    print("=== Testing Database Access Directly ===")
    
    # Proper way to use async generator
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    try:
        # Check shows
        stmt = select(Show)
        result = await db.execute(stmt)
        shows = result.scalars().all()
        print(f"Shows found: {len(shows)}")
        
        for i, show in enumerate(shows[:5]):
            print(f"  {i+1}. ID: {show.id}, Name: {show.name}")
            
        # Check if show_id 6 exists
        show_6 = None
        for show in shows:
            if show.id == 6:
                show_6 = show
                break
                
        if show_6:
            print(f"\n✅ Show ID 6 exists: {show_6.name}")
            
            # Try creating event with EventService
            try:
                event_data = EventCreate(
                    external_event_id="DEBUG-TEST-EVENT-20250730-15:00",
                    show_id=6, 
                    event_date="2025-07-30",
                    start_time="15:00",
                    end_time="16:00", 
                    duration_minutes=60,
                    is_multiple_shows_flag=False
                )
                
                # Test EventService.create_event directly
                event = await EventService.create_event(db, event_data) 
                print(f"✅ EventService.create_event works: Created event ID {event.id}")
                
                # Clean up
                await db.delete(event)
                await db.commit()
                print("✅ Event cleaned up")
                
            except Exception as e:
                print(f"❌ EventService.create_event failed: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("❌ Show ID 6 does NOT exist")
            
    except Exception as e:
        print(f"❌ Database access failed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.close()
        await db_gen.aclose()

def test_with_testclient():
    """Test with FastAPI TestClient (synchronous)"""
    print("\n=== Testing with TestClient (Sync) ===")
    
    try:
        client = TestClient(app)
    except Exception as e:
        print(f"❌ TestClient creation failed: {e}")
        return
    
    # Login first
    login_response = client.post("/api/admin/auth/login", data={
        "username": "admin",
        "password": "admin"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
        
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test POST /api/admin/events
    event_data = {
        "external_event_id": "TESTCLIENT-DEBUG-20250730-15:00",
        "show_id": 6,
        "event_date": "2025-07-30", 
        "start_time": "15:00",
        "end_time": "16:00",
        "duration_minutes": 60,
        "is_multiple_shows_flag": False
    }
    
    response = client.post("/api/admin/events", headers=headers, json=event_data)
    print(f"TestClient result: {response.status_code}")
    
    if response.status_code == 201:
        print("✅ TestClient POST /api/admin/events works!")
        event_id = response.json()["id"]
        
        # Clean up
        delete_response = client.delete(f"/api/admin/events/{event_id}", headers=headers)
        print(f"Cleanup: {delete_response.status_code}")
    else:
        print(f"❌ TestClient POST /api/admin/events failed:")
        print(f"Response: {response.text}")

async def test_with_async_client():
    """Test with httpx AsyncClient (like the failing test)"""
    print("\n=== Testing with AsyncClient (Like failing test) ===")
    
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Login first
        login_response = await client.post("/api/admin/auth/login", data={
            "username": "admin", 
            "password": "admin"
        })
        
        if login_response.status_code != 200:
            print(f"❌ AsyncClient login failed: {login_response.status_code}")
            return
            
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test POST /api/admin/events
        event_data = {
            "external_event_id": "ASYNCCLIENT-DEBUG-20250730-15:00",
            "show_id": 6,
            "event_date": "2025-07-30",
            "start_time": "15:00", 
            "end_time": "16:00",
            "duration_minutes": 60,
            "is_multiple_shows_flag": False
        }
        
        response = await client.post("/api/admin/events", headers=headers, json=event_data)
        print(f"AsyncClient result: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ AsyncClient POST /api/admin/events works!")
            event_id = response.json()["id"]
            
            # Clean up
            delete_response = await client.delete(f"/api/admin/events/{event_id}", headers=headers)
            print(f"Cleanup: {delete_response.status_code}")
        else:
            print(f"❌ AsyncClient POST /api/admin/events failed:")
            print(f"Response: {response.text}")
            print(f"Headers: {response.headers}")

async def main():
    """Run all debugging tests"""
    await test_db_directly()
    test_with_testclient()
    await test_with_async_client()

if __name__ == "__main__":
    asyncio.run(main())