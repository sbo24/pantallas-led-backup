"""
Script para crear usuario administrador inicial
"""
import asyncio
from app.database.session import SessionLocal
from app.models.user import User, Role
from app.dependencies import get_password_hash
from sqlalchemy import select


async def create_admin_user():
    """Crear usuario administrador inicial"""
    async with SessionLocal() as session:
        # Verificar si ya existe un usuario admin
        stmt = select(User).where(User.username == "admin")
        result = await session.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("Usuario admin ya existe, actualizando password...")
            # Actualizar password con hash correcto
            existing_user.hashed_password = get_password_hash("admin")
            await session.commit()
            print("Password actualizado correctamente")
            return
        
        # Verificar si existe el rol admin
        stmt = select(Role).where(Role.name == "admin")
        result = await session.execute(stmt)
        admin_role = result.scalar_one_or_none()
        
        if not admin_role:
            # Crear rol admin
            admin_role = Role(
                name="admin",
                description="Administrador del sistema",
                permissions=["all"]
            )
            session.add(admin_role)
            await session.commit()
            await session.refresh(admin_role)
            print("Rol admin creado")
        
        # Crear usuario admin
        admin_user = User(
            username="admin",
            email="admin@puydufou.com",
            full_name="Administrator",
            hashed_password=get_password_hash("admin"),
            role_id=admin_role.id,
            is_active=True
        )
        
        session.add(admin_user)
        await session.commit()
        await session.refresh(admin_user)
        
        print("Usuario administrador creado:")
        print(f"  Username: {admin_user.username}")
        print(f"  Email: {admin_user.email}")
        print(f"  Password: admin")
        print(f"  Role: {admin_role.name}")


if __name__ == "__main__":
    asyncio.run(create_admin_user())