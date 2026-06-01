# Backend prompt — Evidence media gated by chain of custody (Opción C)

> Pega esto como tarea para el equipo/agente de backend. Es lo que el frontend de la Fase 7 ya
> espera para proteger los **archivos de evidencia** con la cadena de custodia.

## Contexto y decisión

Hoy los archivos (media) de una evidencia se ven y descargan libremente por cualquiera con
`evidence.read`, **sin dejar rastro y sin importar la custodia**. Eso es un hueco: el archivo es
*el contenido real* de la evidencia y está menos protegido que el propio registro
(`GET /evidence/:id` ya transfiere custodia y registra en la cadena).

Política elegida (**Opción C — "ver = log, descargar = custodia"**):

- **Ver / previsualizar** media de evidencia → permitido para cualquiera con `evidence.read`, pero
  **se registra como un acceso** (auditoría).
- **Descargar** media de evidencia → **solo el custodio actual**. Quien no lo sea debe **tomar la
  custodia** primero (acto deliberado que queda en la cadena de custodia).

> Nota de honestidad técnica: como "ver" ya entrega los bytes, esto **no** es un DRM; el objetivo es
> **trazabilidad y ceremonia de responsabilidad**, no impedir copiar. El valor está en el registro.

El FE ya implementó el lado cliente: si el usuario no es el custodio, al pulsar **Download** se
abre una confirmación; al aceptar, llama a "tomar custodia" y luego descarga. Para que esto
**signifique algo** (y no sea saltable), el backend debe enforce lo siguiente.

---

## Cambio 1 — Endpoint "tomar custodia" (REQUERIDO)

`PATCH /evidence/:id/take-custody`

- **Roles:** los **tres** (ADMIN, DETECTIVE, ANALYST). A diferencia de
  `PATCH /evidence/:id/transfer-custody` (que es ADMIN/DETECTIVE y requiere `newCustodianId`), aquí
  el **caller se asigna la custodia a sí mismo**.
- **Body:** vacío (o `{ reason?: string }` opcional). **El backend debe fijar la razón** del
  registro de cadena de custodia, sugerencia: **`"Accessed evidence file"`** (en el idioma/estilo
  que ya usan; hoy existe `"Viewed by user"`).
- **Efecto:**
  1. `currentCustodianId = caller.sub`.
  2. Inserta una fila en la cadena de custodia (`previousCustodianId` = el anterior,
     `newCustodianId` = caller, `transferredByUserId` = caller, `transferReason` = la razón fija).
  3. Publica el evento correspondiente (`evidence.transferred` o uno nuevo
     `evidence.custody.accessed`, a su criterio) para que Audit lo capture.
- **Respuesta 200:** la entidad `Evidence` actualizada (con `currentCustodianId` ya en el caller).
- **Idempotencia (recomendado):** si el caller **ya** es el custodio, no insertar una fila nueva
  (devolver la evidencia tal cual) para no ensuciar la cadena.

> Alternativa si prefieren no crear un endpoint nuevo: permitir que `transfer-custody` acepte
> `newCustodianId = self` para los tres roles **solo cuando es auto-asignación**. Pero un endpoint
> dedicado es más claro y auditable. Si optan por la alternativa, avísenme y el FE se adapta.

## Cambio 2 — Enforcement de la descarga (REQUERIDO)

El gating del FE no es seguridad. El backend debe rechazar la **descarga** de media de evidencia a
quien no sea custodio.

`GET /media/:id/download-url?disposition=attachment`

- Si la media pertenece a una entidad **EVIDENCE** y el caller **no** es el `currentCustodianId` de
  esa evidencia → **403 Forbidden** con un mensaje claro
  (p. ej. *"You must hold custody of this evidence to download its files"*).
- Si es el custodio → emitir la URL presignada `attachment` normal.
- Para **otras** entidades (CASE/TASK/INVOLVED_PERSON/USER) → sin cambios.

> Para esto, media-service necesita poder consultar el `currentCustodianId` de la evidencia
> (llamada interna a evidence-service o evento/replica). Si esa verificación cross-service es
> costosa hoy, indíquenmelo: una opción intermedia es que evidence-service exponga la verificación
> y media-service la consuma.

## Cambio 3 — Log de acceso al ver (Opción C, puede ir en Fase 8)

Registrar un evento de auditoría cuando se **ve/previsualiza** media de evidencia (no es un cambio
de custodia, solo trazabilidad):

- Cuando se emite `GET /media/:id/download-url?disposition=inline` para media de tipo EVIDENCE,
  registrar un evento de auditoría tipo `MEDIA_ACCESSED` / `EVIDENCE_MEDIA_VIEWED` con
  `userId`, `mediaId`, `evidenceId`, timestamp.
- **Cuidado con el ruido:** el FE auto-presigna `inline` para **cada miniatura** de imagen al abrir
  la galería. Si registran cada emisión `inline`, tendrán muchos accesos por simple apertura de
  página. Opciones para evitarlo:
  - Registrar solo cuando el FE lo pida explícitamente (el FE puede mandar un flag, p. ej.
    `?context=viewer` vs `?context=thumbnail`, **díganme si lo quieren y lo agrego**), **o**
  - De-duplicar accesos por (user, media) en una ventana de tiempo (p. ej. 1 vez cada N minutos).
- Este punto puede posponerse a la **Fase 8 (Audit)**; no bloquea los Cambios 1 y 2.

---

## Lo que el FE ya hace hoy

```
Usuario (no custodio) pulsa "Download" en media de una EVIDENCE
   └─ FE muestra confirmación: "Para descargar debes tomar la custodia; quedará registrado"
        └─ al confirmar:
             1) PATCH /evidence/:id/take-custody        (Cambio 1)
             2) GET /media/:id/download-url?disposition=attachment   (Cambio 2)
             3) abre la URL presignada → descarga
Usuario (custodio) pulsa "Download" → directo al paso 2-3 (sin confirmación)
Ver/previsualizar → sin gating en el FE (Cambio 3 lo audita en el back)
```

## Criterios de aceptación

- [ ] `PATCH /evidence/:id/take-custody` existe, lo pueden llamar los 3 roles, asigna custodia al
      caller y escribe una fila en la cadena con una razón fija (p. ej. "Accessed evidence file").
- [ ] Llamarlo cuando ya eres custodio no duplica filas (idempotente).
- [ ] `GET /media/:id/download-url?disposition=attachment` devuelve 403 para no-custodios cuando la
      media es de una EVIDENCE; 200 para el custodio; sin cambios para otras entidades.
- [ ] (Opcional/Fase 8) Se audita el acceso de **ver** media de evidencia sin generar ruido por
      miniaturas.
- [ ] El flujo del FE (confirmar → take-custody → download) funciona de punta a punta.
- Documentalo como la feature 007
