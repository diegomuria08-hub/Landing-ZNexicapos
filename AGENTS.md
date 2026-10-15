# Reglas Maestras de Desarrollo, Ciberseguridad y Diseño del Proyecto (MiniPOS)

Bienvenido. Este proyecto sigue estándares profesionales de Arquitectura de Software Full-Stack, Ciberseguridad (OWASP Top 10) y Diseño de Interfaces UI/UX Mobile-First impulsados por 20 años de experiencia técnica.

## Resumen de Reglas del Proyecto

1. **Arquitectura y Calidad de Código (Full-Stack)**:
   - **Backend**: Python 3.10+ con FastAPI, Pydantic, tipado estricto y manejo estructurado de endpoints RESTful y errores.
   - **Base de Datos**: **MySQL** gestionada de forma segura mediante **SQLAlchemy** (ORM anti-SQLi) o consultas parametrizadas.
   - **Frontend**: HTML5 Semántico, CSS3 Vanilla modular (Variables CSS, Flexbox, Grid) y JavaScript ES6+ asíncrono y limpio.
   - **Calidad**: Código ordenado, escalable, legible, sin redundancias y siguiendo estándares de la industria web.

2. **Ciberseguridad y Protección (OWASP Top 10)**:
   - **Ocultamiento de Accesos Administrativos**: El panel de administración NUNCA debe estar enlazado ni visible en la interfaz pública (landing page, menús, footers). El acceso es estrictamente confidencial ingresando la URL de forma manual.
   - **Cero Exposición de Credenciales e Infraestructura**: Prohibido mostrar nombres de usuario (ej: `Diego_admin`), contraseñas de ejemplo, sugerencias en placeholders o menciones técnicas (como "OWASP") en la UI que expongan información sensible o vectores a atacantes.
   - **Gestión de Secretos (.env)**: Todas las credenciales, claves maestras y tokens DEBEN cargarse desde variables de entorno (`.env`). Queda estrictamente prohibido hardcodear claves en el código fuente o repositorios.
   - **Cifrado y Hashing**: Contraseñas con **bcrypt** / **argon2** via librerías especializadas (`passlib`/`bcrypt`). Cifrado simétrico (AES-256 via `cryptography`) para datos confidenciales.
   - **Prevención Anti-Inyección**: Consultas estrictamente parametrizadas, ORM sanitizado, sin consultas SQL concatenadas.
   - **Autenticación y Sesiones**: JWT con algoritmos robustos, atributos de cookies de alta seguridad (`HttpOnly`, `Secure`, `SameSite=Strict`).

3. **Diseño UI/UX Mobile-First Prioritario**:
   - **Móvil Primero**: La prioridad absoluta es que la aplicación se vea impecable, fluida e intuitiva en celulares (pantallas táctiles, botones cómodos para el pulgar, tipografía adaptada).
   - **Adaptabilidad a Escritorio**: En computadoras, la interfaz se expande y redistribuye de manera armónica sin perder estética ni funcionalidad.
   - **Estética Premium**: Paleta de colores curada, tipografía moderna, sombras suaves, transiciones limpias y micro-interacciones.

4. **Metodología de Trabajo**:
   - **Pensar antes de actuar**: Diseñar la solución y estructurar el sistema formalmente antes de codificar.
   - **Verificar y Probar**: Validar el código, la seguridad del backend y el comportamiento responsivo antes de finalizar entregables.

5. **Prohibición Estricta de Hardcoding de Métodos de Pago y Datos de Negocio**:
   - Queda terminantemente PROHIBIDO hardcodear métodos de pago, bancos, cuentas, teléfonos o números de cuenta en el código (FastAPI, plantillas o JavaScript).
   - Todos los métodos de pago son 100% dinámicos: se crean, editan y eliminan única y exclusivamente a través de la Base de Datos y el Panel de Administración.
   - Si el administrador borra un método de pago, este se elimina físicamente de la base de datos y debe desaparecer de inmediato del checkout público del cliente.
   - El cliente podrá elegir entre los métodos activos configurados en base de datos.

6. **Funcionalidad Total (Cero Elementos de Adorno o Placeholders)**:
   - Absolutamente todos los botones, filtros, selectores, acciones de fila, botones de purga y controles en la interfaz deben tener lógica real y operativa.
   - Queda prohibido dejar botones decorativos o sin implementar. Si un botón existe en la UI, debe ejecutar su acción completa en backend y base de datos.

---
*Para ver el detalle completo de las normas, consultar los archivos en:*
- [`.agents/rules/architecture_and_code.md`](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/.agents/rules/architecture_and_code.md)
- [`.agents/rules/cybersecurity_owasp.md`](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/.agents/rules/cybersecurity_owasp.md)
- [`.agents/rules/ui_ux_mobile_first.md`](file:///c:/Users/Diego%20Muria/OneDrive/Codigos_Antigravity/landign%20miniPOS/.agents/rules/ui_ux_mobile_first.md)
