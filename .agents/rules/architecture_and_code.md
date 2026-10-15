# Reglas de Arquitectura y Desarrollo de Código Full-Stack

Este documento define las reglas obligatorias de arquitectura, diseño de software y calidad de código para este proyecto, bajo la perspectiva de un Arquitecto de Soluciones TI Senior (20+ años de experiencia) y Especialista en Ciberseguridad.

---

## 1. Principios Generales de Desarrollo

- **Pensar antes de actuar**: Analizar detalladamente cada requerimiento, estructura de datos y flujo antes de escribir código.
- **Código Limpio (Clean Code)**:
  - Nombres descriptivos e inequívocos para funciones, variables, clases y archivos.
  - Funciones pequeñas con responsabilidad única (SRP - Single Responsibility Principle).
  - Ausencia de código muerto, comentarios innecesarios o parches superficiales.
- **Escalabilidad y Modularidad**:
  - Separación clara de capas: Presentación (HTML/CSS/JS), Lógica de Negocio/API (FastAPI), Persistencia/Seguridad (MySQL + ORM/Cifrado).
  - Estructura de archivos organizada y extensible.
- **Probar antes de entregar (Test-Driven Mindset)**:
  - Validar la sintaxis, funcionamiento de la API, conexión segura a BD y respuestas HTTP en cada fase.

---

## 2. Stack Tecnológico Estándar y Backend (Python + FastAPI + MySQL)

- **Base de Datos**: **MySQL** utilizando `SQLAlchemy` (ORM con consultas parametrizadas anti-SQLi) o conectores asíncronos (`aiomysql`/`PyMySQL`).
- **Seguridad y Cifrado**:
  - `passlib[bcrypt]` / `bcrypt` para hashing seguro de contraseñas.
  - `cryptography` (Fernet/AES-256) para cifrado de datos sensibles en tránsito y reposo.
  - `PyJWT` para gestión segura de tokens de autenticación.
- **Versión y Tipado**: Python 3.10+ utilizando `typing` estricto y modelos de `pydantic`.
- **Diseño API RESTful**:
  - Endpoints claros, semánticos y estructurados (`GET`, `POST`, `PUT`, `DELETE`).
  - Documentación OpenAPI/Swagger automática adecuada.
  - Manejo centralizado y profesional de excepciones con respuestas de error estandarizadas (`JSONResponse`).

---

## 3. Estándares para el Frontend (HTML5, CSS3, JavaScript)

- **HTML5 Semántico**:
  - Estructura limpia utilizando etiquetas semánticas (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).
  - Cumplimiento de estándares de accesibilidad (ARIA, etiquetas de formularios, contraste).
- **CSS3 Moderno**:
  - Uso de CSS nativo con variables globales (`:root`) para temas, paleta de colores, tipografía y espaciado.
  - Metodología modular para evitar colisiones de estilos.
  - Uso de Flexbox y CSS Grid para diagramación fluida.
- **JavaScript (ES6+)**:
  - Código modular, sin variables globales innecesarias.
  - Manipulación limpia del DOM y manejo eficiente de eventos.
  - Integración asíncrona (`fetch` / `async-await`) con la API backend y manejo sanitizado de respuestas.

---

## 4. Gestión Dinámica de Datos de Negocio (Cero Hardcoding)

- **Métodos de Pago y Cuentas**: Prohibido hardcodear cuentas bancarias, números telefónicos o pasarelas en el código fuente.
- Toda la configuración de medios de pago reside en la base de datos y se gestiona dinámicamente mediante el panel de administración.
- Cuando un método de pago se elimina en el panel de control, debe borrarse permanentemente de la base de datos y desaparecer en tiempo real de la interfaz del cliente.
- Si no hay métodos configurados, la API debe devolver una lista vacía `[]` y el frontend debe reflejar el estado sin inventar datos estáticos.

---

## 5. Funcionalidad Total (Sin Botones de Adorno)

- Todo botón, selector, filtro o enlace en las vistas de usuario y administrador debe tener una implementación real y probada.
- Las operaciones de vaciado de historial, limpieza por fecha y borrado de registros deben ejecutar la eliminación física de los registros y sus archivos asociados en disco (`static/uploads`).
- Los filtros de búsqueda (por estado, plan, texto) deben operar en conjunto y reflejar los resultados inmediatamente.
