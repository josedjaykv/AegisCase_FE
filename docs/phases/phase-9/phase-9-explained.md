# Fase 9 — Explicado: qué hicimos, por qué, cómo y qué ganamos

Este documento explica en lenguaje sencillo las tres piezas de la Fase 9, por qué eran necesarias,
cómo se implementaron, qué beneficios traen, y por qué tiene sentido hacerlas **en cualquier
proyecto** y **en AegisCase en particular**.

> Idea central: las fases anteriores construyeron *funcionalidad* (los 8 módulos + features de
> evidencia). La Fase 9 no agrega features de negocio: agrega la **red de seguridad** que hace que
> todo lo anterior sea confiable en producción. Es la diferencia entre "funciona en mi máquina" y
> "puedo confiar en esto con evidencia que puede acabar en un juicio".

---

## Pieza 1 — Polling que se pausa en background y se refresca al volver

### Qué se hizo
- Un hook `useVisibility()` que sabe si la pestaña está visible u oculta.
- Un `VisibilityRefetcher` que, cuando vuelves a la pestaña, **refresca de inmediato** las consultas
  de polling que estaban activas y desactualizadas.
- (Ya existía de antes) cada consulta periódica tiene `refetchIntervalInBackground: false`, así que
  **en segundo plano no consulta**.

### Por qué era necesario
La app "simula tiempo real" con **polling**: cada cierto tiempo vuelve a pedir datos al backend
(tareas cada 30 s, caso cada 60 s, feed de auditoría cada 30 s, cadena de custodia cada 60 s, etc.).
A medida que fuimos agregando módulos, **se acumularon muchas consultas periódicas**. Dos problemas:

1. **Costo / límite de tasa.** El gateway permite **100 peticiones por 60 s por IP**
   (BACKEND_INVESTIGATION_REPORT §12.7). Si una pestaña queda abierta en segundo plano consultando
   sin parar, gastas presupuesto inútilmente (nadie está mirando) y te acercas al `429`.
2. **Frescura al volver.** Teníamos `refetchOnWindowFocus` desactivado (para no recargar en cada
   clic de ventana). El efecto secundario: al volver a la pestaña, los datos podían quedar viejos
   hasta el siguiente "tick" del intervalo (hasta 60 s de retraso).

### Cómo se hizo
- En segundo plano, TanStack Query respeta `refetchIntervalInBackground: false` y **pausa** el
  temporizador → 0 peticiones mientras la pestaña está oculta.
- Al volver (`document.visibilityState` pasa a `visible`), disparamos
  `queryClient.refetchQueries({ type: 'active', stale: true })`: solo refresca lo que está **en
  pantalla** y **desactualizado**, no todo. Así es inmediato pero sigue siendo barato.

### Beneficios
- **Ahorro real de peticiones** → nos mantenemos cómodamente bajo el límite y evitamos `429`.
- **Sensación de “en vivo”** sin websockets: vuelves y ves datos frescos al instante.
- **Batería/CPU**: una pestaña oculta no trabaja.

### Por qué en todo proyecto
Cualquier app con polling o refetch periódico sufre lo mismo: pestañas en segundo plano que gastan
red y servidores. Pausar en background y refrescar al volver es una optimización estándar y de bajo
riesgo.

### Por qué en AegisCase específicamente
Tenemos **muchas** superficies de polling (dashboard, tableros, detalles, auditoría). Con un límite
duro de 100/60s y varias pestañas posibles (un detective con el caso en una pestaña y el tablero en
otra), sin esto es fácil rozar el `429`. Además, los datos de turno (tareas vencidas, custodia) deben
verse frescos apenas el investigador vuelve a la pantalla.

---

## Pieza 2 — Sentry + ErrorBoundary (visibilidad de errores en producción)

### Qué se hizo
- `initSentry()` que **solo** se activa si hay `VITE_SENTRY_DSN` configurado, y carga el SDK de forma
  perezosa (`import()` dinámico) → **cero peso en el bundle** si está apagado.
- Un `ErrorBoundary` de nivel superior: si un componente revienta al renderizar, en vez de pantalla
  en blanco muestra "Algo salió mal" + botón Recargar, y reporta el error a Sentry.
- **Limpieza de datos sensibles**: antes de enviar nada, se borran el JWT, los headers de
  `Authorization`/`Cookie`, el objeto de usuario, y se enmascaran emails y tokens en el texto.

### Por qué era necesario
Hasta ahora, si algo fallaba en producción, **nos enterábamos por el usuario** (o no nos
enterábamos). No había forma de ver qué se rompió, en qué pantalla, ni con qué frecuencia. Y un error
de render sin un `ErrorBoundary` deja la app en **pantalla blanca** — la peor experiencia posible.

### Cómo se hizo
- `ErrorBoundary` es un componente de clase de React (la única forma de capturar errores de render);
  envuelve toda la app en `App.tsx`.
- Sentry se inicializa "fire-and-forget" en `main.tsx`; como el `import()` es dinámico, **no entra al
  bundle** cuando no hay DSN (el caso por defecto en desarrollo).
- El "scrubbing" (limpieza) se hace en `beforeSend`/`beforeBreadcrumb`: una función recursiva que
  redacta claves tipo `token/authorization/cookie/email/secret` y aplica regex para tapar JWTs y
  correos en cualquier cadena.

### Beneficios
- **Sabes cuándo y dónde falla** en producción, con contexto, sin esperar a que reporten.
- **Nunca pantalla blanca**: el usuario ve un mensaje claro y puede recargar.
- **Cero costo cuando está apagado** y **sin fugas de datos** cuando está encendido.

### Por qué en todo proyecto
Observabilidad de errores es básico para operar en producción: priorizas arreglos por impacto real,
detectas regresiones rápido, y proteges la UX con un boundary. El patrón "monitorea pero nunca
filtres PII" aplica a cualquier app seria.

### Por qué en AegisCase específicamente
Es un sistema **policial/forense**: filtrar un JWT o un email a un tercero (Sentry) sería
inaceptable, por eso el scrubbing es obligatorio, no opcional. Y como la app maneja flujos sensibles
(custodia, auditoría), un fallo silencioso o una pantalla blanca en medio de una diligencia es
inadmisible: necesitamos enterarnos y degradar con dignidad.

---

## Pieza 3 — Pruebas E2E con Playwright (red mockeada)

### Qué se hizo
Una suite de pruebas de extremo a extremo que **maneja un navegador real** y recorre 3 flujos
críticos, con el **backend simulado** (interceptando las llamadas de red):
1. **Login** por los 3 roles y navegación según rol (Users/Audit solo para ADMIN).
2. **El guardrail de evidencia**: el detalle carga en modo lectura (summary + cadena) **sin** llamar
   al `GET /evidence/:id` que muta la custodia; esa llamada solo ocurre **al confirmar** el diálogo.
3. **Ciclo de vida de tarea**: PENDING → En progreso → Completada, comprobando la actualización
   optimista.

### Por qué era necesario
Acumulamos mucha lógica sensible (custodia de evidencia, permisos por rol, auditoría solo-ADMIN). Las
pruebas unitarias verifican piezas aisladas, pero **no** prueban que el flujo completo funcione en un
navegador. Sin E2E, una refactorización podría romper, por ejemplo, el guardrail de evidencia **sin
que nadie lo note** hasta producción.

### Cómo se hizo
- Playwright levanta el dev server y abre Chromium.
- En vez de depender de los 8 microservicios, **interceptamos las llamadas al API** y devolvemos
  respuestas controladas (`page.route`). Esto hace las pruebas **deterministas** y ejecutables en CI
  sin levantar todo el backend.
- Detalle clave: los mocks se **anclan al origen del API** (`http://localhost:3000`) para no
  interceptar por error la navegación del propio SPA (que usa rutas con el mismo nombre, como
  `/tasks/:id`). (De hecho ese fue el bug inicial que corregimos.)

### Beneficios
- **Confianza para cambiar código**: si rompes un flujo crítico, la suite te avisa antes de mergear.
- **Deterministas y rápidas**: sin datos sembrados ni dependencias de red flaky.
- **Documentación viva**: cada test describe el comportamiento esperado del flujo.

### Por qué en todo proyecto
Los flujos críticos (login, el "camino feliz" del negocio) merecen una prueba que los recorra de
verdad. Mockear la red para E2E es la práctica estándar para tener tests deterministas en CI.

### Por qué en AegisCase específicamente
El **guardrail de la evidencia** (no mutar la custodia al solo mirar) es una garantía **legal**, no
solo técnica. Tenerlo cubierto por un E2E que falla si alguien lo rompe es justo lo que protege la
confidencialidad e integridad de la evidencia a largo plazo. Lo mismo el gating por rol (que un
ANALYST no vea auditoría) y el optimismo en tareas.

---

## Resumen en una frase
La Fase 9 convierte una app que *funciona* en una app en la que se puede *confiar*: no desperdicia
peticiones, se siente viva, te avisa (sin filtrar datos) cuando algo se rompe, y protege con pruebas
los flujos que no pueden fallar — especialmente la cadena de custodia de la evidencia.
