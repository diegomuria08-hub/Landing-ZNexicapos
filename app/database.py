import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# Conexión dinámica a PostgreSQL (Supabase) o MySQL (Local)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "[ERROR CRÍTICO] La variable DATABASE_URL no está definida en el archivo .env. "
        "No se puede iniciar la aplicación sin conexión a la base de datos."
    )

# Normalizar prefijo para PostgreSQL en Supabase / Render
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine_kwargs = {
    "pool_pre_ping": True,
    "echo": False
}

# Configuración de pooling para PostgreSQL y MySQL
if "sqlite" not in DATABASE_URL:
    engine_kwargs.update({
        "pool_recycle": 1800,
        "pool_size": 10,
        "max_overflow": 20
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

# Identificar dialecto
dialect = "PostgreSQL (Supabase)" if "postgres" in DATABASE_URL else "MySQL" if "mysql" in DATABASE_URL else "SQLite"

# Verificar conexión al arrancar
try:
    with engine.connect() as conn:
        pass
    print(f"[OK] Conexión establecida con la base de datos -> {dialect}")
except Exception as e:
    raise RuntimeError(
        f"[ERROR CRÍTICO] No se pudo conectar a la base de datos ({dialect}): {e}. "
        "Verifica que el servicio esté activo y las credenciales en .env sean correctas."
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Generador de sesión de base de datos para inyección de dependencias en FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
