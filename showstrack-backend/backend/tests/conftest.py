"""
Configuración pytest y fixtures globales
"""
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.session import get_db
from app.models.base import Base

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    await engine.dispose()

@pytest.fixture(scope="session")
async def test_session_factory(test_engine):
    """Create test session factory."""
    return async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

@pytest.fixture
async def test_session(test_session_factory) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async with test_session_factory() as session:
        yield session

@pytest.fixture
async def test_client(test_session) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client."""
    
    async def override_get_db():
        yield test_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
def admin_user_data():
    """Test admin user data."""
    return {
        "username": "test_admin",
        "email": "admin@test.com",
        "full_name": "Test Administrator",
        "password": "test_password"
    }

@pytest.fixture
def show_data():
    """Test show data."""
    return {
        "name": "Test Show",
        "description": "A test show",
        "duration_estimated": 60,
        "is_visible": True,
        "display_order": 1
    }

@pytest.fixture
def event_data():
    """Test event data."""
    return {
        "external_event_id": "test_event_001",
        "event_date": "2025-07-20",
        "start_time": "15:30:00",
        "end_time": "16:30:00",
        "duration_minutes": 60
    }