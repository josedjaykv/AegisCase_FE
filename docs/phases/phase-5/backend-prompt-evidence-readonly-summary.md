# Backend prompt — Feature 011: Read-only single-evidence summary (no custody side effect)

> **Esto es la Feature 011.** Impleméntala en el backend **y documéntala** del lado del backend
> (su propio registro de features/changelog), igual que el FE en
> `docs/features/feature-011-evidence-readonly-summary.md`. Pega esto como tarea para el
> equipo/agente de backend.

## Contexto y problema

`GET /evidence/:id` **muta**: registra al que llama como custodio (`currentCustodianId = actor.sub`)
y agrega una fila `chain_of_custody` con `transferReason="Viewed by user"`. Por eso el FE **nunca**
lo llama automáticamente — solo tras una confirmación explícita ("View & take custody").

Para mostrar la página de detalle sin efectos secundarios, el FE arma el resumen desde la **caché de
una lista** ya cargada (`GET /evidence` o `GET /evidence?caseId=…`). Pero si el usuario **recarga**
`/evidence/:id` o entra por **deep-link**, no hay lista en caché y no se puede mostrar el resumen
(aparece "A read-only summary isn't cached…"). Hoy **no existe** ningún `GET` de una sola evidencia
que sea de solo lectura (el único single-item read-only es `/evidence/:id/chain-of-custody`, que no
trae los campos del resumen).

## Cambio requerido — endpoint de solo lectura

`GET /evidence/:id/summary`

- **Roles:** los mismos que pueden leer evidencia hoy (ADMIN, DETECTIVE, ANALYST).
- **Sin efectos secundarios:** **NO** modificar `currentCustodianId`, **NO** insertar filas en la
  cadena de custodia, **NO** publicar eventos. Es puramente de lectura.
- **Response 200:** la entidad `Evidence` (mismos campos que devuelve la lista: `id`, `caseId`,
  `evidenceType`, `title`, `description`, `evidenceStatus`, `currentCustodianId`, `createdByUserId`,
  `archived`, `archivedAt`, `createdAt`, `updatedAt`). **No** es necesario incluir `custodyChain`
  (para eso ya está `/evidence/:id/chain-of-custody`).
- **Errores:** `404` si no existe.

> Alternativa aceptable si prefieren no crear una ruta nueva: un query param en el GET actual, p. ej.
> `GET /evidence/:id?inspect=true` que **suprima** el efecto de custodia y devuelva el resumen. Pero
> una ruta dedicada `/summary` es más clara y difícil de usar mal. Si optan por el query param,
> avísenme y el FE se adapta (hoy el FE llama a `/evidence/:id/summary`).

## Lo que el FE ya hace hoy

El FE ya llama a `GET /evidence/:id/summary` como **fallback** cuando no hay nada en caché (detalle y
edición). Mientras el backend no lo tenga, el FE **degrada con gracia**: la query usa `retry: false`
y, ante el 404, vuelve a mostrar el mensaje actual "summary not cached" (sin romperse). En cuanto el
endpoint exista, el detalle/edición cargarán el resumen automáticamente al recargar o entrar por
deep-link.

## Criterios de aceptación

- [ ] `GET /evidence/:id/summary` devuelve la evidencia (200) **sin** tocar la custodia ni la cadena
      ni publicar eventos.
- [ ] Llamarlo repetidamente **no** cambia `currentCustodianId` ni agrega filas a la cadena.
- [ ] `404` cuando el id no existe.
- [ ] Lo pueden llamar ADMIN, DETECTIVE y ANALYST.
- [ ] Documentado del lado del backend como **Feature 011**.
