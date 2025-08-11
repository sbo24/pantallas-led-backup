#!/usr/bin/env python3
"""
Debug script to test shows endpoint
"""
import asyncio
from app.database.session import get_db
from app.dependencies import get_current_user, get_current_active_user
from app.services.show_service import ShowService
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt

# Test token
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInVzZXJfaWQiOjEsImV4cCI6MTc1MjgzODU4NH0._0Utzq24UUsty6jtkcoajaG5iHh3xJP2neMX8fIUxX8"

async def test_shows_endpoint():
    """Test the shows endpoint logic"""
    async for db in get_db():
        try:
            # Test user retrieval
            SECRET_KEY = "showstrack_secret_key_2025_change_in_production"
            ALGORITHM = "HS256"
            
            payload = jwt.decode(TEST_TOKEN, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            print(f"Token username: {username}")
            
            # Test getting user by username
            from app.dependencies import get_user_by_username
            user = await get_user_by_username(db, username)
            print(f"User found: {user.username}")
            print(f"User active: {user.is_active}")
            print(f"User role: {user.role.name}")
            
            # Test shows service
            shows, total = await ShowService.get_shows(db=db, visible_only=False, limit=50)
            print(f"Shows found: {len(shows)}")
            
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_shows_endpoint())