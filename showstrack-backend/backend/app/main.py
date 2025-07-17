import asyncio
import psutil
import time
from datetime import datetime
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncpg
import os

app = FastAPI(
    title="ShowsTrack API", 
    version="1.0.0"
)

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    uptime: float
    database: Dict[str, Any]
    system: Dict[str, Any]
    components: Dict[str, Dict[str, Any]]

start_time = time.time()

async def check_database_health() -> Dict[str, Any]:
    """Verificar conexión y estado de PostgreSQL"""
    start_check = time.time()
    try:
        database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://showstrack_user:password@showstrack-postgres:5432/showstrack_main")
        
        # Convertir URL de SQLAlchemy a asyncpg
        if database_url.startswith("postgresql+asyncpg://"):
            asyncpg_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
        else:
            asyncpg_url = database_url
            
        conn = await asyncpg.connect(asyncpg_url)
        
        # Verificar conectividad básica
        await conn.execute("SELECT 1")
        
        # Obtener información de la base de datos
        db_info = await conn.fetchrow("SELECT version(), current_database(), current_user")
        
        # Verificar existencia de tablas críticas
        table_check = await conn.fetchval("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        
        await conn.close()
        
        response_time = round((time.time() - start_check) * 1000, 2)
        
        return {
            "status": "healthy",
            "version": db_info["version"].split()[0:2] if db_info["version"] else "Unknown",
            "database": db_info["current_database"],
            "user": db_info["current_user"],
            "tables_count": table_check,
            "response_time_ms": response_time
        }
    except Exception as e:
        response_time = round((time.time() - start_check) * 1000, 2)
        return {
            "status": "unhealthy",
            "error": str(e),
            "response_time_ms": response_time
        }

def get_system_metrics() -> Dict[str, Any]:
    """Obtener métricas del sistema"""
    try:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used
            },
            "disk": {
                "total": disk.total,
                "free": disk.free,
                "used": disk.used,
                "percent": round((disk.used / disk.total) * 100, 2)
            },
            "load_average": list(os.getloadavg()) if hasattr(os, 'getloadavg') else None
        }
    except Exception as e:
        return {
            "error": str(e),
            "status": "unavailable"
        }

@app.get("/health", response_model=HealthResponse)
async def health():
    """
    Endpoint health robusto con verificación de componentes críticos
    """
    current_time = datetime.now()
    uptime = round(time.time() - start_time, 2)
    
    # Verificar base de datos
    db_health = await check_database_health()
    
    # Obtener métricas del sistema
    system_metrics = get_system_metrics()
    
    # Estado de componentes críticos
    components = {
        "database": {
            "status": db_health["status"],
            "healthy": db_health["status"] == "healthy"
        },
        "system": {
            "status": "healthy" if "error" not in system_metrics else "unhealthy",
            "healthy": "error" not in system_metrics
        },
        "api": {
            "status": "healthy",
            "healthy": True
        }
    }
    
    # Determinar estado general
    overall_healthy = all(comp["healthy"] for comp in components.values())
    overall_status = "healthy" if overall_healthy else "unhealthy"
    
    return HealthResponse(
        status=overall_status,
        timestamp=current_time,
        version="1.0.0",
        uptime=uptime,
        database=db_health,
        system=system_metrics,
        components=components
    )

@app.get("/")
async def root():
    return {"message": "ShowsTrack API funcionando"}
