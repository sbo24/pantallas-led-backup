#!/usr/bin/env python3
"""
Test script to debug login endpoint
"""
import asyncio
from datetime import timedelta
from app.dependencies import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database.session import get_db
from app.schemas.auth import LoginResponse, UserResponse


async def test_login_endpoint():
    """Test the exact login endpoint logic"""
    async for db in get_db():
        try:
            # Simulate form_data
            username = "admin"
            password = "admin"
            
            print(f"Testing authentication for user: {username}")
            
            # Step 1: Authenticate user
            user = await authenticate_user(db, username, password)
            if not user:
                print("Authentication failed")
                return
            
            print(f"✓ User authenticated: {user.username}")
            print(f"✓ User role: {user.role.name}")
            print(f"✓ User active: {user.is_active}")
            
            # Step 2: Create token
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.username, "user_id": user.id},
                expires_delta=access_token_expires
            )
            
            print(f"✓ Token created: {access_token[:30]}...")
            
            # Step 3: Create user response
            user_response = UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                full_name=user.full_name,
                role=user.role.name,
                is_active=user.is_active,
                created_at=user.created_at
            )
            
            print(f"✓ UserResponse created: {user_response.username}")
            
            # Step 4: Create login response
            login_response = LoginResponse(
                access_token=access_token,
                token_type="bearer",
                expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user=user_response
            )
            
            print(f"✓ LoginResponse created")
            
            # Step 5: Test JSON serialization
            json_data = login_response.model_dump()
            print(f"✓ JSON serialization successful")
            print(f"Response keys: {list(json_data.keys())}")
            
            return json_data
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return None


if __name__ == "__main__":
    result = asyncio.run(test_login_endpoint())
    if result:
        print("\n✅ Login endpoint logic working correctly!")
        print(f"Sample response: {result['user']['username']}")
    else:
        print("\n❌ Login endpoint logic failed!")