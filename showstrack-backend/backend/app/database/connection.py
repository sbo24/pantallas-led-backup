"""
Database connection configuration.
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

# Get database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://showstrack_user:password@showstrack-postgres:5432/showstrack_main"
)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    poolclass=NullPool,  # Disable connection pooling for development
    future=True
)