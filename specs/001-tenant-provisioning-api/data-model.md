# Data Model Specification: Tenant Provisioning & PostgreSQL / Supabase Schema

**Feature**: `001-tenant-provisioning-api`
**Date**: 2026-10-15
**Status**: Ready

## Entity Relationship Overview

```mermaid
erDiagram
    Usuario ||--o{ Suscripcion : "tiene"
    Usuario ||--o{ SesionDispositivo : "mantiene"
    Usuario ||--o| AccesoMiniposApi : "sincroniza_con"
    MetodoPago ||--o{ Suscripcion : "procesa"

    Usuario {
        int id PK
        string nombre_completo
        string nombre_empresa
        string email UK
        string telefono UK
        string password_hash
        string rol
        boolean esta_bloqueado
        string motivo_bloqueo
        datetime creado_en
    }

    Suscripcion {
        int id PK
        int usuario_id FK
        string codigo_plan
        string nombre_plan
        float monto_usd
        string metodo_pago
        string referencia_ultimos4
        string ruta_comprobante
        string estado
        string tenant_company_id
        string tenant_admin_id
        string tenant_plan_id
        string tenant_provisioning_status
        string tenant_error_detail
        datetime tenant_provisioned_at
        datetime fecha_inicio
        datetime fecha_fin
        datetime creado_en
    }

    MetodoPago {
        int id PK
        string tipo_metodo
        string titulo
        string nombre_banco
        string telefono
        string cedula
        string binance_id
        string titular_cuenta
        boolean esta_activo
        datetime creado_en
        datetime actualizado_en
    }

    AccesoMiniposApi {
        int id PK
        string telefono UK
        boolean acceso_concedido
        boolean esta_bloqueado
        string estado
        string plan_activo
        string mensaje_bloqueo
        datetime fecha_expiracion
        datetime ultima_sincronizacion
    }
```

## Detailed Entities & Attributes

### 1. Usuario (`usuarios`)
- `id`: Integer, Clave primaria autoincremental.
- `nombre_completo`: String(150), no nulo.
- `nombre_empresa`: String(150), nullable=True. Nombre comercial del negocio/empresa.
- `email`: String(150), único, indexado, nullable=True. Correo del administrador de la cuenta.
- `telefono`: String(50), único, indexado, no nulo. Usuario para la aplicación móvil miniPOS.
- `password_hash`: String(255), no nulo. Hash de la contraseña con bcrypt/argon2.
- `rol`: String(20), por defecto `"cliente"`. (`"cliente"` o `"admin"`).
- `esta_bloqueado`: Boolean, por defecto `False`.
- `motivo_bloqueo`: String(255), por defecto `""`.
- `creado_en`: DateTime, timestamp de registro UTC.

### 2. Suscripcion (`suscripciones`)
- `id`: Integer, Clave primaria.
- `usuario_id`: Integer, Clave foránea referenciando `usuarios.id`.
- `codigo_plan`: String(50), valores permitidos: `'FREE'`, `'BASIC'`, `'PRO'`.
- `nombre_plan`: String(100), ej: `'Plan Prueba Gratis'`, `'Plan Básico'`, `'Plan Profesional'`.
- `monto_usd`: Float, valores: `0.0`, `8.0`, `10.0`.
- `metodo_pago`: String(50), ej: `'pago_movil'`, `'binance'`, `'transferencia'`, `'gratis'`.
- `referencia_ultimos4`: String(20), referencia bancaria o `'FREE-TRIAL'`.
- `ruta_comprobante`: String(255), path local o URL de imagen subida.
- `estado`: String(20), `'pendiente'`, `'aprobado'`, `'rechazado'`.
- **Campos de Aprovisionamiento Externo miniPOS**:
  - `tenant_company_id`: String(100), UUID retornado por `POST /api/provisioning/tenant`.
  - `tenant_admin_id`: String(100), UUID del usuario admin en el backend de tenants.
  - `tenant_plan_id`: String(100), UUID del plan asignado en el backend de tenants.
  - `tenant_provisioning_status`: String(50), `'pendiente'`, `'exitoso'`, `'fallido'`.
  - `tenant_error_detail`: Text, detalle de error si falló la llamada a la API externa.
  - `tenant_provisioned_at`: DateTime, timestamp de confirmación de aprovisionamiento.

### 3. MetodoPago (`metodos_pago`)
- Totalmente dinámico y gestionado exclusivamente vía Base de Datos y Panel de Administración.
- La eliminación física borra el registro de PostgreSQL de inmediato.
