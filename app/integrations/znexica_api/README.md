# Guía de Consumo e Integración — API ZNexica POS (miniPOS)

Esta carpeta contiene el módulo oficial y aislado para la comunicación con la API del producto SaaS **ZNexica POS**.

---

## 📂 1. Ubicación del Código

| Componente | Archivo |
| :--- | :--- |
| **Cliente de la API (Consumo HTTP)** | [`app/integrations/znexica_api/client.py`](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/app/integrations/znexica_api/client.py) |
| **Exportación del Módulo** | [`app/integrations/znexica_api/__init__.py`](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/app/integrations/znexica_api/__init__.py) |
| **Servicio de Negocio (Landing -> App)** | [`app/services/provisioning.py`](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/app/services/provisioning.py) |

Dentro de `client.py` encontrarás los comentarios claros señalando cada endpoint:
- Línea ~160: `# >>> API ZNexica — ENDPOINT 1: POST /api/provisioning/tenant (crear empresa + admin + plan) <<<`
- Línea ~184: `# >>> API ZNexica — ENDPOINT 2: PATCH /api/provisioning/user-status (ACTIVE / INACTIVE) <<<`

---

## 🔐 2. Variables de Entorno Requeridas (.env y Render)

En el archivo `.env` local y en el panel de **Environment en Render**:

```env
PROVISIONING_API_URL=https://mini-pos-api.vercel.app/api/provisioning/tenant
PROVISIONING_API_USER=dannysmuria
PROVISIONING_API_PASSWORD=rtdg2049
```

> **Regla de Seguridad**: Ninguna credencial ni contraseña se sube al repositorio Git. Ambas variables se leen estrictamente desde el entorno.

---

## 🚀 3. Peticiones HTTPS para Probar en Postman

### Endpoint 1: Creación de Empresa + Admin + Plan (Aprovisionamiento)

* **Método**: `POST`
* **URL**: `https://mini-pos-api.vercel.app/api/provisioning/tenant`
* **Pestaña Authorization**:
  * **Type**: `Basic Auth`
  * **Username**: `dannysmuria`
  * **Password**: `rtdg2049`
* **Pestaña Headers**:
  * `Content-Type`: `application/json`
  * `Accept`: `application/json`
* **Pestaña Body (raw -> JSON)**:
```json
{
  "companyName": "Inversiones Muria C.A.",
  "adminName": "Diego Muria",
  "adminEmail": "cliente_prueba@ejemplo.com",
  "adminPassword": "PasswordSegura123*",
  "planCode": "PRO"
}
```
* **Respuesta Exitosa esperada (HTTP 201)**:
```json
{
  "success": true,
  "message": "Tenant aprovisionado exitosamente.",
  "data": {
    "company": { "id": "...", "name": "Inversiones Muria C.A." },
    "admin": { "id": "...", "name": "Diego Muria", "email": "cliente_prueba@ejemplo.com", "role": "ADMIN", "status": "ACTIVE" },
    "plan": { "id": "...", "code": "PRO" }
  }
}
```

---

### Endpoint 2: Activar o Suspender Acceso (Gestión de Pagos / Vencimientos)

* **Método**: `PATCH`
* **URL**: `https://mini-pos-api.vercel.app/api/provisioning/user-status`
* **Pestaña Authorization**:
  * **Type**: `Basic Auth`
  * **Username**: `dannysmuria`
  * **Password**: `rtdg2049`
* **Pestaña Headers**:
  * `Content-Type`: `application/json`
  * `Accept`: `application/json`

#### Caso A: Suspender servicio por falta de pago (por correo)
* **Pestaña Body (raw -> JSON)**:
```json
{
  "status": "INACTIVE",
  "email": "cliente_prueba@ejemplo.com",
  "reason": "Servicio suspendido por falta de pago"
}
```

#### Caso B: Reactivar servicio tras confirmación de pago (por correo)
* **Pestaña Body (raw -> JSON)**:
```json
{
  "status": "ACTIVE",
  "email": "cliente_prueba@ejemplo.com",
  "reason": "Pago verificado y aprobado"
}
```

#### Caso C: Suspender a toda la empresa (por ID de empresa)
* **Pestaña Body (raw -> JSON)**:
```json
{
  "status": "INACTIVE",
  "companyId": "ID_DE_EMPRESA_AQUI",
  "reason": "Mensualidad vencida"
}
```

