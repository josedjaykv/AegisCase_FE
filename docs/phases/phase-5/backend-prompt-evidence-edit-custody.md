# Backend prompt — Feature 010: Only the custodian can edit evidence

> **Esto es la Feature 010.** Impleméntala en el backend **y documéntala** del lado del backend
> (su propio registro de features/changelog), igual que el FE en
> `docs/features/feature-010-evidence-edit-requires-custody.md`. Pega esto como tarea para el
> equipo/agente de backend.

## Contexto y decisión

Para seguridad y confidencialidad de la evidencia, **solo el custodio actual puede editarla**. Es la
misma política que ya aplicamos a la **descarga** de archivos de evidencia (Opción C / Feature 007):
quien no es custodio debe **tomar la custodia** primero (acto deliberado que queda en la cadena de
custodia y, por tanto, en el audit).

El FE ya implementó el lado cliente: si el usuario no es el custodio, al pulsar **Edit** ve una
confirmación, y al aceptar se llama a `PATCH /evidence/:id/take-custody` (ya existe, Feature 007) y
luego se navega al formulario de edición. **Pero el gating del FE no es seguridad** — el backend
debe hacerlo cumplir.

## Cambio requerido — enforcement de la edición (REQUERIDO)

`PUT /evidence/:id`

- Si el **caller no es** el `currentCustodianId` de esa evidencia → **403 Forbidden** con un mensaje
  claro, p. ej. *"You must hold custody of this evidence to edit it"*.
- Si **es** el custodio → procede normal.
- Aplica **a todos los roles** que hoy pueden editar (ADMIN, DETECTIVE). Es decir, ni siquiera un
  ADMIN edita sin ser custodio — debe tomar la custodia primero (consistente con la descarga).
- (Recomendado) Misma regla para cualquier otra mutación de la evidencia que no sea tomar/transferir
  custodia ni archivar — por ahora el alcance es **`PUT /evidence/:id`**.

> El flujo del usuario es: no-custodio → `PATCH /evidence/:id/take-custody` (se vuelve custodio + se
> registra en la cadena) → `PUT /evidence/:id` (ahora pasa). Por eso `take-custody` debe seguir
> permitiendo la auto-asignación a los tres roles (ya implementado).

## Auditoría (lo que el usuario pidió: "que eso se guarde en el audit")

- **Ya cubierto por `take-custody`:** tomar la custodia escribe una fila en la cadena de custodia y
  emite el evento de custodia → el módulo Audit ya lo registra (`EVIDENCE_CUSTODY_TRANSFERRED` o el
  action que emita `take-custody`). Así, cuando un detective toma custodia para editar, queda el
  rastro de quién y cuándo.
- **Recomendado (para trazabilidad completa de la edición):** emitir un evento **`evidence.updated`**
  al hacer `PUT /evidence/:id` y registrarlo en Audit como **`EVIDENCE_UPDATED`** (hoy no existe ese
  action en el catálogo — §3.10). Incluir en el `newState` los campos editados (`title`,
  `description`, `evidenceType`, `evidenceStatus`). Hoy `case.updated`/`evidence.updated` **no** se
  publican; añadirlo daría el "quién editó qué" además del "quién tomó la custodia".

## Criterios de aceptación

- [ ] `PUT /evidence/:id` devuelve **403** para un caller que no es el custodio actual (cualquier rol).
- [ ] El custodio actual puede editar (200) con normalidad.
- [ ] Tras `PATCH /evidence/:id/take-custody`, el mismo usuario ya puede editar.
- [ ] La toma de custodia queda registrada en la cadena de custodia y en Audit (ya existente).
- [ ] (Recomendado) La edición emite `evidence.updated` y Audit lo registra como `EVIDENCE_UPDATED`.
- [ ] Documentado del lado del backend como **Feature 010**.
