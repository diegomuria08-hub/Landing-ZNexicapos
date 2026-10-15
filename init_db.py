import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

from app.database import engine, Base, SessionLocal
from app import models

def main():
    print("Conectando a la base de datos MySQL y creando tablas...")
    # Crear todas las tablas
    Base.metadata.create_all(bind=engine)
    print("¡Tablas creadas exitosamente!\n")

    db = SessionLocal()
    try:
        # Sembrar métodos de pago de prueba si no hay ninguno
        count = db.query(models.MetodoPago).count()
        if count == 0:
            print("Agregando métodos de pago iniciales...")
            m1 = models.MetodoPago(
                tipo_metodo="pago_movil",
                titulo="Pago Móvil - Banco de Venezuela",
                nombre_banco="Banco de Venezuela (0102)",
                telefono="0412-457-9238",
                cedula="13405568",
                titular_cuenta="Diego Muria",
                esta_activo=True
            )
            m2 = models.MetodoPago(
                tipo_metodo="binance",
                titulo="Binance Pay (USDT)",
                binance_id="284910381",
                titular_cuenta="Diego Muria",
                esta_activo=True
            )
            db.add(m1)
            db.add(m2)
            db.commit()
            print("Métodos de pago agregados correctamente.")
        else:
            print(f"Ya existen {count} métodos de pago en la base de datos. No se agregaron nuevos.")
    except Exception as e:
        print(f"Error durante el seeding: {e}")
        db.rollback()
    finally:
        db.close()

    print("\n¡Configuración completada! Ahora puedes iniciar la aplicación y verificar el CRUD.")

if __name__ == "__main__":
    main()
