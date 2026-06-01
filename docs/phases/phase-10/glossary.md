# Fase 10 — Glosario (términos explicados)

Explicación en lenguaje sencillo de cada término que ataca la Fase 10, con cómo aplica a AegisCase.

---

## Code-splitting (división del bundle)
**Qué es:** en vez de empaquetar **toda** la app en un solo archivo JavaScript que el navegador
descarga al entrar, se parte en muchos archivos ("chunks") que se cargan **solo cuando hacen falta**.
**Cómo lo hicimos:** `React.lazy(() => import('…'))` por cada página, envuelto en `<Suspense>`. Así,
quien entra a `/login` ya **no** descarga el Kanban, el visor de media ni auditoría — eso llega solo
cuando navega a esas rutas.
**Por qué importa:** menos JavaScript inicial = la app aparece antes. Pasamos de **un chunk de ~835
KB** a un inicial de ~190 KB gzip + chunks por ruta bajo demanda.

## Lazy loading (carga diferida) de imágenes
**Qué es:** `loading="lazy"` en un `<img>` le dice al navegador que **no** descargue esa imagen
hasta que esté por aparecer en pantalla (al hacer scroll).
**Dónde:** las miniaturas de `MediaGallery`. **Por qué:** no gastar datos descargando imágenes de
evidencia que el usuario quizá nunca scrollee — clave en móvil/4G.

## Bundle "gzipped"
**Qué es:** el navegador y el servidor comprimen los archivos con **gzip** al transferirlos. El
tamaño que importa para la velocidad real es el **comprimido (gzip)**, no el tamaño en disco.
**Nuestro objetivo (quality-gate):** ≤ **350 KB gzipped** por ruta inicial. Hoy el arranque ronda
~190 KB gzip → cumplimos con margen.

## LCP — Largest Contentful Paint
**Qué es:** una métrica de **Web Vitals** de Google. Mide cuánto tarda en pintarse el **elemento más
grande visible** (típicamente el bloque de contenido principal) desde que empieza a cargar la página.
Es un proxy de "¿qué tan rápido siente el usuario que la página ya cargó?".
**Objetivo:** **≤ 2.5 s** en un perfil **4G** (bueno). Entre 2.5–4 s es "mejorable", >4 s "malo".
**Cómo lo mejora la fase:** menos JS inicial (code-splitting) → el contenido principal pinta antes.

## Perfil 4G
**Qué es:** una **simulación de red móvil** (ancho de banda y latencia de un 4G) que activas en
DevTools (pestaña Network → "throttling" → "Fast/Slow 4G") o en Lighthouse. Sirve para medir cómo se
siente la app en un teléfono en campo, no en tu WiFi rápido.
**Por qué en AegisCase:** se usa desde el móvil en la escena (intake de evidencia), así que la
experiencia en 4G es la que cuenta.

## Lighthouse
**Qué es:** una herramienta de auditoría integrada en Chrome (DevTools → pestaña **Lighthouse**) que
da puntajes 0–100 en varias categorías. Las que nos interesan:
- **Performance** (rendimiento): combina métricas como LCP, etc. **Objetivo ≥ 90.**
- **Accessibility** (accesibilidad): chequeos automáticos de a11y. **Objetivo ≥ 95.**
**Cómo se corre:** se explica en el manual-testing (modo incógnito, perfil móvil/4G).

## WCAG 2.1 AA
**Qué es:** **Web Content Accessibility Guidelines** — el estándar internacional de accesibilidad
web (W3C). Versión **2.1**; nivel **AA** (hay A < AA < AAA; **AA** es el exigido habitualmente, y a
menudo **obligatorio por ley** en el sector público).
**Idea base — "POUR":** el contenido debe ser **P**erceivable (perceptible), **O**perable (operable,
p. ej. con teclado), **U**nderstandable (comprensible) y **R**obust (robusto para tecnologías de
asistencia). Ejemplos concretos AA: **contraste de texto ≥ 4.5:1**, todo operable por teclado,
elementos con nombres accesibles (labels/aria), foco visible.
**Por qué en AegisCase:** sistema de sector público/policial → cumplimiento de accesibilidad suele
ser requisito, no opcional.

## axe-core
**Qué es:** el **motor de pruebas de accesibilidad** más usado (de Deque). Inspecciona el **DOM ya
renderizado** y reporta violaciones de WCAG con su **impacto**: `minor`, `moderate`, `serious`,
`critical`.
**Cómo lo usamos:** `@axe-core/playwright` dentro de los E2E; fallamos el build ante violaciones
**`serious`/`critical`**. Complementa a `jsx-a11y` (que revisa el **código** estático): axe revisa lo
que el usuario realmente ve (p. ej. contraste real, estados dinámicos, diálogos abiertos).
**Ejemplo real de esta fase:** axe detectó que el toast de éxito de sonner (verde #008a2e sobre
#ecfdf3 = **4.25:1**) no llegaba a 4.5:1 → lo corregimos.

## CSP — Content-Security-Policy
**Qué es:** una **política de seguridad** que declara **de qué orígenes** puede la página cargar
recursos (scripts, imágenes, conexiones, iframes…). Es una de las defensas más fuertes contra
**XSS** (inyección de scripts maliciosos): si un atacante inyecta un `<script>` de un dominio no
permitido, el navegador lo **bloquea**.
**Directivas (las "reglas"):** cada tipo de recurso tiene la suya, p. ej.:
- `default-src 'self'` — por defecto, solo desde nuestro propio origen.
- `connect-src` — a qué APIs/sockets se puede conectar (en AegisCase: el gateway, S3 presignado,
  Sentry, el websocket de HMR en dev).
- `img-src`, `media-src`, `frame-src` — imágenes/video/iframes (permitimos `https:`/`blob:` para la
  media presignada de S3 y los PDF/TXT en iframe).
- `script-src 'self'`, `object-src 'none'`, `base-uri 'self'` — endurecen scripts y orígenes base.

### CSP "report-only"
**Qué es:** el modo `Content-Security-Policy-Report-Only` **no bloquea** nada — solo **reporta**
(en consola, o a un endpoint) lo que *habría* bloqueado. Sirve para **observar y afinar** la política
sin riesgo de romper la app, antes de activarla en modo "enforce" (bloqueante).
**Cómo lo hicimos:** un plugin de Vite inyecta la meta `report-only` **solo en desarrollo**. En
**producción**, el CSP se debe poner como **header HTTP real en el proxy/CDN** (un `<meta>` no
soporta `report-uri`/`report-to` y no debe ser la frontera de seguridad de prod) — por eso el build
de prod queda limpio y el endurecimiento real es responsabilidad de la infraestructura.

## Suspense / fallback
**Qué es:** `<Suspense fallback={…}>` de React muestra ese `fallback` (en nuestro caso, un spinner)
**mientras** se descarga un chunk diferido (lazy). Sin él, React no sabría qué mostrar durante esa
breve espera.

## Focus ring y hit target (de design-system §9)
- **Focus ring (anillo de foco):** el borde visible que rodea el elemento enfocado al navegar con
  **teclado** (Tab). Es obligatorio para accesibilidad: el usuario de teclado debe **ver** dónde está.
  Token: `ring-2 ring-primary ring-offset-2`.
- **Hit target (área táctil):** tamaño mínimo de un control para poder tocarlo con el dedo sin error.
  Mínimo **40×40 px** (44×44 en móvil). Botones de solo ícono siempre llevan `aria-label`.

---

### Resumen
La Fase 10 ataca tres frentes con vocabulario propio: **performance** (code-splitting, lazy,
bundle/gzip, LCP, 4G, Lighthouse), **accesibilidad** (WCAG 2.1 AA, axe-core, focus ring, hit target)
y **hardening** (CSP report-only). Todos son estándares de la industria; en AegisCase pesan extra por
el uso en campo (4G) y el contexto de sector público (accesibilidad y seguridad).
