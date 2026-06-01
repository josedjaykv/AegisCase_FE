# Backend prompt — Feature 009: Evidence `title` field

> **Esto es la Feature 009.** Impleméntala en el backend **y documéntala** del lado del backend
> (su propio registro de features/changelog), igual que se documentó en el FE
> (`docs/features/feature-009-evidence-title.md`). Pega esto como tarea para el equipo/agente de
> backend.

## Contexto

Hoy una evidencia tiene `description` pero **no** tiene un campo de **título** corto. El FE ya
añadió un campo **Title** al formulario de registro/edición de evidencia, para distinguir un
encabezado corto del cuerpo largo. Ejemplo de uso real:

- **Título:** `Testimonio de Juanito`
- **Descripción:** *(todo el testimonio escrito, varios párrafos)*

El servicio afectado es **`evidence-service`**, entidad `Evidence` (`evidence_db.evidence`),
endpoints `POST /evidence` y `PUT /evidence/:id`.

## Cambio requerido — añadir `title`

1. **Entidad / DB** (`apps/evidence-service/.../evidence.entity.ts`):
   - Nueva columna **`title`** (`varchar(200)` o `text`), **nullable** (default `NULL`).
   - Generar la migración. Es nullable para no romper las evidencias ya existentes (que no tienen
     título).
2. **`CreateEvidenceDto`** (`POST /evidence`):
   - Aceptar **`title`** (string). Sugerencia de validación: `@IsString() @MaxLength(200)`.
   - El FE **siempre lo envía** y lo trata como **requerido** en su formulario. En el backend puede
     ser `@IsOptional()` (por compatibilidad con otros clientes) o requerido — a su criterio. Lo
     importante: **no rechazarlo**. Si usan `forbidNonWhitelisted: true`, asegúrense de que `title`
     esté whitelisted en el DTO, o los `POST`/`PUT` del FE fallarían con 400.
3. **`UpdateEvidenceDto`** (`PUT /evidence/:id`):
   - Aceptar **`title`** opcional (`@IsOptional() @IsString() @MaxLength(200)`) y persistirlo.
4. **Persistencia y lectura:** guardar `title` y devolverlo en **todas** las respuestas que incluyan
   una evidencia:
   - `POST /evidence` (201), `PUT /evidence/:id`, `GET /evidence`, `GET /evidence/:id`,
     `GET /evidence?caseId=…`.
5. **Auditoría / eventos:** incluir `title` en el `newState`/payload del evento `evidence.added`
   (y en updates si aplica) para que el módulo de Audit lo refleje. (Opcional pero recomendado.)

## Lo que el FE ya manda hoy

```
POST /evidence
{
  "caseId": "<uuid>",
  "evidenceType": "TESTIMONIAL",
  "title": "Testimonio de Juanito",
  "description": "<texto largo del testimonio>",
  "currentCustodianId": "<uuid opcional>"
}

PUT /evidence/:id
{ "evidenceType": "...", "title": "...", "description": "..." }
```

El FE muestra `title` como encabezado en la lista, las cards y el detalle, con **fallback a
`description`** cuando una evidencia antigua no tiene título.

## Criterios de aceptación

- [ ] `POST /evidence` acepta y persiste `title`; no rompe si llega (whitelisted).
- [ ] `PUT /evidence/:id` puede actualizar `title`.
- [ ] `GET /evidence`, `GET /evidence/:id` y el filtrado por `caseId` devuelven `title`.
- [ ] Evidencias antiguas sin `title` siguen funcionando (columna nullable, retrocompatible).
- [ ] Documentado del lado del backend como **Feature 009**.
