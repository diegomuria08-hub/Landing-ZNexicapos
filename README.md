# 🚀 miniPOS - Landing Page & Plataforma SaaS de Suscripciones

![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)
![Framework](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20MySQL-336791?logo=postgresql)
![Security](https://img.shields.io/badge/OWASP-Top%2010%20Compliant-success?logo=security)
![Architecture](https://img.shields.io/badge/Design-Mobile--First%20Responsive-orange)
![License](https://img.shields.io/badge/License-Proprietary-red)

Una solución completa y moderna de **Landing Page, Checkout Dinámico y Panel de Control Administrativo** orientada a la comercialización y gestión de planes de suscripción para el ecosistema móvil de punto de venta y facturación **miniPOS**.

---

## 📋 Tabla de Contenidos
1. [Descripción General](#-descripción-general)
2. [Características Principales](#-características-principales)
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)
4. [Seguridad y Protección OWASP](#-seguridad-y-protección-owasp)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Instalación y Configuración Local](#-instalación-y-configuración-local)
7. [Variables de Entorno (.env)](#-variables-de-entorno-env)
8. [Despliegue en la Nube (Supabase & Render)](#-despliegue-en-la-nube-supabase--render)
9. [Flujo de Aprovisionamiento Externo](#-flujo-de-aprovisionamiento-externo)
10. [Créditos](#-créditos)

---

## 🌟 Descripción General

**miniPOS Landing** sirve como el portal comercial y operativo para la adquisición de software de punto de venta miniPOS. Permite a los comerciantes:
- Explorar planes y características del sistema móvil (Facturación, Stock, Reportes).
- Registrarse en el plan gratuito de 15 días o adquirir planes premium (Mensual, Semestral, Anual).
- Realizar pagos mediante métodos completamente dinámicos (Pago Móvil, Zinli/Wally, Binance USDT) cargando su comprobante de pago de manera segura.
- Monitorear el estado de su suscripción y credenciales de acceso al software de punto de venta.

---

## ✨ Características Principales

### 🛒 Landing & Checkout Mobile-First
* **Diseño Ultra-Responsivo:** Optimizado prioritariamente para dispositivos móviles y expandible a pantallas de escritorio con transiciones fluidas.
* **Métodos de Pago 100% Dinámicos:** Cero métodos hardcodeados en el código. Todos los canales de pago se crean, actualizan, activan y eliminan en tiempo real desde la Base de Datos y el Panel Administrativo.
* **Subida Segura de Comprobantes:** Validación de extensiones (`.jpg`, `.jpeg`, `.png`, `.pdf`), límite de tamaño y nombres con hash criptográfico UUID.

### 🛡️ Panel Administrativo Confidencial
* **Ruta de Acceso Oculta:** Sin enlaces en el pie de página ni menús públicos para prevenir descubrimiento no autorizado.
* **Gestión Integral de Suscripciones:**
  - Aprobación o rechazo de comprobantes con visualizador modal integrado.
  - Activación manual inmediata de planes.
  - Modificación de planes y fechas de caducidad.
* **Control de Usuarios y Bajas:**
  - Eliminación definitiva con ventana modal de motivo y confirmación obligatoria.
  - Registro de auditoría permanente (`clientes_bajas_audit`) con timestamp, administrador responsable y motivo.
  - Purga y limpieza de clientes expirados con soporte de filtros.
* **CRUD de Métodos de Pago:**
  - Alta, edición, alternancia de estado activo/inactivo y eliminación física.

### ⚡ Integración de Aprovisionamiento (miniPOS Tenant API)
* Al aprobar o registrar un cliente, el sistema interactúa de manera transparente con la API externa de aprovisionamiento de tenants para emitir credenciales automáticas de base de datos para la aplicación móvil.

---

## 🏗️ Arquitectura del Sistema

```
[ Cliente Móvil / Web ] 
           │
           ▼
[ FastAPI Application (App Server / Render) ]
    ├── Router: Autenticación (JWT + Bcrypt)
    ├── Router: Suscripciones & Checkout
    ├── Router: Métodos de Pago Dinámicos
    ├── Router: Administración Confidencial
    └── Router: miniPOS Tenant Provisioning API
           │
           ├──► [ SQLAlchemy ORM ] ──► [ PostgreSQL (Supabase) / MySQL ]
           └──► [ Storage ] ─────────► [ static/uploads (Comprobantes) ]
```

---

## 🔒 Seguridad y Protección OWASP

1. **Gestión Estricta de Secretos:** Ninguna clave, contraseña o URL de base de datos está en el repositorio. Todo se maneja a través de variables de entorno `.env`.
2. **Cifrado y Hashing:**
   - Contraseñas protegidas mediante algoritmos de derivación de claves con **Bcrypt** (`passlib`).
   - Tokens de sesión JWT firmados criptográficamente.
3. **Protección Anti-SQL Injection:** Todas las interacciones con la base de datos se ejecutan a través de **SQLAlchemy ORM** con consultas estrictamente parametrizadas.
4. **Protección XSS & CORS:**
   - Headers de seguridad configurables.
   - Orígenes permitidos regulados por variable de entorno `CORS_ORIGINS`.

---

## 📂 Estructura del Proyecto

```text
├── app/
│   ├── __init__.py
│   ├── database.py              # Conexión multi-dialecto (PostgreSQL Supabase / MySQL)
│   ├── main.py                  # Punto de entrada FastAPI y middlewares
│   ├── models.py                # Modelos SQLAlchemy (Usuarios, Suscripciones, MetodosPago, etc.)
│   ├── schemas.py               # Esquemas de validación Pydantic
│   ├── security.py              # Hashing Bcrypt, generación y validación JWT
│   ├── routers/
│   │   ├── administracion.py    # Endpoints privados del panel de administración
│   │   ├── autenticacion.py     # Endpoints de login de clientes y administradores
│   │   ├── metodos_pago.py      # Endpoints para consulta y gestión de métodos de pago
│   │   ├── minipos_api.py       # API de aprovisionamiento e integración con miniPOS
│   │   └── suscripciones.py     # Endpoints de checkout y órdenes de pago
│   └── services/
│       ├── provisioning_service.py # Cliente HTTP asíncrono para la API externa
│       └── time_service.py         # Utilidades de cálculo de fechas de expiración
├── static/
│   ├── css/
│   │   ├── admin.css            # Estilos del panel de control
│   │   └── styles.css           # Estilos de la landing page y checkout
│   ├── js/
│   │   ├── admin.js             # Lógica asíncrona del panel administrativo
│   │   └── main.js              # Interacción de landing page y checkout
│   └── uploads/                 # Almacenamiento local de comprobantes
├── templates/
│   ├── admin.html               # Plantilla Jinja2 del panel privado
│   └── index.html               # Plantilla Jinja2 de la landing comercial
├── .env.example                 # Plantilla de variables de entorno segura
├── .gitignore                   # Exclusiones de Git (secretos, uploads, temporales)
├── render.yaml                  # Configuración de despliegue automatizado en Render
├── requirements.txt             # Dependencias del proyecto
└── README.md                    # Documentación del proyecto
```

---

## 🛠️ Instalación y Configuración Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/diegomuria08-hub/landing-minipos.git
cd landing-minipos
```

### 2. Crear entorno virtual y activarlo
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno
Crea tu archivo `.env` a partir de la plantilla:
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales locales o remotas.

### 5. Iniciar la aplicación en modo desarrollo
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Accede a la landing page en: `http://localhost:8000`

---

## ⚙️ Variables de Entorno (.env)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión SQLAlchemy (MySQL o Supabase Postgres) | `postgresql+psycopg2://postgres:pass@db.xyz.supabase.co:5432/postgres` |
| `SECRET_KEY` | Clave secreta para firma de tokens JWT | `cadena_criptografica_aleatoria_32_bytes` |
| `ADMIN_USERNAME` | Usuario del administrador principal | `admin_user` |
| `ADMIN_PASSWORD` | Contraseña del administrador principal | `contraseña_robusta` |
| `PROVISIONING_API_URL` | URL del endpoint de aprovisionamiento de miniPOS | `https://mini-pos-api.vercel.app/api/provisioning/tenant` |
| `PROVISIONING_API_USER` | Usuario de autenticación básica API externa | `miniPosContractor` |
| `PROVISIONING_API_PASSWORD` | Clave secreta de la API externa | `token_secreto` |
| `PORT` | Puerto asignado por el hosting | `8000` |
| `APP_BASE_URL` | URL pública de la aplicación | `https://landing-znexicapos.onrender.com` |

---

## ☁️ Despliegue en la Nube (Supabase & Render)

### 1. Base de Datos en Supabase (PostgreSQL)
1. Crea un proyecto en [Supabase](https://supabase.com).
2. En la sección **Project Settings > Database**, copia la URL de conexión en modo **URI / Direct Connection**.
3. El proyecto se encargará de crear las tablas de forma automática al iniciar (`Base.metadata.create_all(bind=engine)`).

### 2. Servicio Web en Render
1. Conecta este repositorio en [Render](https://render.com) como **Web Service**.
2. **Build Command:** `pip install -r requirements.txt`
3. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. En **Environment Variables**, añade las variables descritas en la sección anterior.

---

## 👥 Créditos y Autores

* **Desarrollador Principal:** [Diego Muria (diegomuria08-hub)](https://github.com/diegomuria08-hub)
* **Ecosistema:** miniPOS SaaS Mobile Billing & Inventory System
