# Reglas de Diseño UI/UX y Mobile-First

Este documento establece los lineamientos de diseño visual, experiencia de usuario y adaptabilidad responsiva enfocados prioritariamente en dispositivos móviles.

---

## 1. Filosofía Mobile-First (Prioridad Absoluta a Celulares)

- **Diseñado para Móviles Primero**:
  - Toda interfaz debe pensarse, diseñarse y optimizarse inicialmente para pantallas de teléfonos inteligentes (smartphones: 320px - 480px).
  - La navegación, disposición de controles, formularios y botones deben ser intuitivos para uso táctil con el pulgar (*thumb-friendly zone*).
- **Adaptación a Escritorio/Computadora**:
  - En pantallas más grandes (Tablets / Desktop: > 768px / > 1024px), la interfaz debe expandirse y distribuirse suavemente utilizando Media Queries y layouts adaptativos (`grid` / `flex`).
  - No se distorsiona ni se ve excesivamente estirada; se reacomoda ordenadamente aprovechando el espacio adicional sin perder la fluidez vista en el celular.

---

## 2. Estándares UI/UX y Estética Premium

- **Paleta de Colores Curada**:
  - Uso de esquemas de color armónicos, modernos y atractivos (modo oscuro elegante o temas claros con alto contraste y colores de acento vibrantes).
  - Prohibido el uso de colores planos o genéricos por defecto (ej. azul puro `#0000ff` o rojo puro `#ff0000`).
- **Tipografía Moderna**:
  - Implementación de fuentes web legibles y profesionales (como Inter, Outfit, Roboto o Poppins desde Google Fonts).
  - Jerarquía visual clara entre títulos (`h1`, `h2`), subtítulos y texto de cuerpo.
- **Interactividad y Micro-animaciones**:
  - Transiciones suaves (`transition: all 0.3s ease`), efectos hover/active responsivos y animaciones sutiles para ofrecer retroalimentación táctil y visual constante al usuario.
  - Botones y zonas de toque con tamaño mínimo adecuado (mínimo 44px x 44px) para evitar clics accidentales en pantallas táctiles.

---

## 3. Rendimiento Visual y Optimización

- **Imágenes y Recurso Visuales**:
  - Carga rápida y optimización de activos visuales.
  - Sin elementos rotos ni marcadores de posición genéricos desalineados.
- **Consistencia Visual**:
  - Coherencia en radios de borde (`border-radius`), sombras (`box-shadow`), espaciados (`margin`, `padding`) y elevaciones de capa.
