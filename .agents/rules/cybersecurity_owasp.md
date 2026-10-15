# Reglas de Ciberseguridad y Estándares OWASP Top 10

Este documento define las reglas de seguridad informática, protección de datos y cumplimiento con los estándares OWASP (Open Web Application Security Project) para el proyecto MiniPOS, bajo la perspectiva de un Especialista en Ciberseguridad y Arquitecto de Soluciones TI Senior.

---

## 1. Protección de Base de Datos y Credenciales (MySQL)

- **Sanitización e Inyección SQL (OWASP A03: Injection)**:
  - Estrictamente prohibida la concatenación de cadenas en consultas SQL.
  - Uso obligatorio de consultas preparadas (*Prepared Statements*) y mapeadores objeto-relacional (ORM como SQLAlchemy con FastAPI) o consultas parametrizadas.
- **Cifrado y Hashing de Credenciales (OWASP A02: Cryptographic Failures)**:
  - **Contraseñas**: Hashing con algoritmos robustos con sal (*salt*) integrados como **bcrypt** / **argon2** (usando librerías como `passlib` o `bcrypt`). Nunca almacenar contraseñas en texto plano ni hashes débiles (MD5/SHA1 prohibidos).
  - **Datos Sensibles**: Cifrado simétrico (AES-256 via `cryptography.fernet`) para tokens o información confidencial guardada en la base de datos MySQL.
  - **Conexiones Seguras**: Tráfico a MySQL cifrado mediante SSL/TLS (`PyMySQL` con contexto SSL activado).
- **Principio de Mínimo Privilegio**:
  - Las credenciales de MySQL de la aplicación tendrán permisos acotados exclusivamente a las tablas e instrucciones necesarias (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), nunca privilegios de superusuario (`ROOT`).

---

## 2. Autenticación y Control de Acceso (OWASP A01: Broken Access Control & A07: Identification and Authentication Failures)

- **Gestión de Sesiones e Identidad**:
  - Implementación de **JWT (JSON Web Tokens)** firmados con algoritmos seguros (`HS256` / `RS256`) y claves secretas de alta entropía.
  - Expiración de tokens acotada y mecanismos de refresco seguro (*Refresh Tokens*).
- **Cookies y Headers de Seguridad**:
  - Si se usan cookies: atributos `HttpOnly`, `Secure`, `SameSite=Strict`.
- **Protección de Rutas**:
  - Verificación metódica de roles y permisos en cada endpoint del backend FastAPI mediante *Dependencies* / Middlewares.

---

## 3. Seguridad Web, Entrada y Salida (OWASP A03: Injection / A04: Insecure Design)

- **Validación de Entradas Estricta**:
  - Validación de esquemas en el backend usando `Pydantic` de FastAPI. Ningún dato del cliente entra al sistema sin ser tipado y validado.
  - Escapado y sanitización contra **XSS (Cross-Site Scripting)** en el cliente y servidor.
- **Protección contra CSRF y CORS**:
  - Configuración estricta de políticas CORS (`allow_origins` acotado a dominios autorizados).
  - Protección Anti-CSRF en formulación de peticiones sensibles.

---

## 4. Endurecimiento (Hardening), Registro y Monitoreo (OWASP A05: Security Misconfiguration & A09: Security Logging Failures)

- **Manejo Seguro de Secretos**:
  - Almacenamiento exclusivo de claves API, secret-keys y passwords de BD en variables de entorno (`.env`), nunca hardcodeados en el repositorio de código.
- **Ocultamiento de Accesos Administrativos y Cero Exposición en UI**:
  - El Panel de Administración (`/admin`) NUNCA debe estar enlazado ni visible en la interfaz pública (landing page, footers, botones del sitio).
  - Prohibición absoluta de mostrar credenciales reales o de prueba (nombres de usuario, contraseñas de ejemplo como `Diego_admin`), o sugerencias en placeholders dentro de formularios HTML.
  - Prohibido hacer gala o exponer términos de infraestructura de seguridad interna (como menciones técnicas "OWASP Top 10") en la interfaz de usuario pública para prevenir actividades de reconocimiento (*footprinting*) por parte de atacantes.
- **Manejo de Errores Silencioso para Atacantes**:
  - No exponer rastros de pila (*stack traces*), versiones de servidor ni consultas SQL internas al cliente en caso de error HTTP 500. Retornar mensajes de error estandarizados y sanitizados.
- **Registro de Auditoría (*Logging*)**:
  - Bitácora de eventos críticos (intentos de inicio de sesión fallidos, cambios de credenciales, accesos denegados) sin registrar información sensible en texto plano.
