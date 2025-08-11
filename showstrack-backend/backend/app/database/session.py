"""
Database session configuration.
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from .connection import engine

# Create async session maker
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    """
    Dependency that provides a database session.
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()