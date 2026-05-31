# Backend prompt — Media: custom display name + description on upload

> Pega esto como tarea para el equipo/agente de backend. Es lo que el frontend de la Fase 7 ya
> espera tras añadir el renombrado y la descripción de media al subir un archivo.

## Contexto

En el FE, al subir un archivo a una entidad (CASE / EVIDENCE / TASK / INVOLVED_PERSON), ahora se
abre un diálogo donde la persona puede:
1. **Renombrar** el archivo (por defecto trae el nombre original, pero se puede cambiar a algo
   legible, p. ej. de `100393.jpg` a `Cámara frontal edificio.jpg`).
2. Escribir una **descripción** libre (p. ej. *"Video que muestra un fragmento de la cámara frontal
   del edificio"*).

El servicio afectado es **`media-service`**, endpoint `POST /media` (multipart), entidad `Media`
(`media_db.media`). Hoy el contrato es (BACKEND_INVESTIGATION_REPORT.md §3.9, §5.8):

- Form fields actuales: `file`, `entity_type`, `entity_id` (snake_case).
- `originalFilename` se deriva del nombre del archivo subido.
- **No existe** ningún campo de descripción.

## Cambio 1 — Descripción (REQUERIDO, no existe hoy)

Añadir soporte para una descripción opcional de la media.

1. **Entidad / DB** (`apps/media-service/src/media/media.entity.ts`):
   - Nueva columna `description` (`text` o `varchar`, **nullable**, default `NULL`).
   - Generar la migración correspondiente.
2. **DTO de `POST /media`**:
   - Aceptar un campo de formulario multipart **`description`** (string, **opcional**).
   - Validación sugerida: `@IsOptional() @IsString() @MaxLength(1000)`.
   - **Importante:** que el `ValidationPipe` **no rechace** este campo. Si usan
     `forbidNonWhitelisted: true`, asegúrense de que `description` esté en el DTO (whitelisted), o
     los uploads del FE con descripción fallarían con 400.
3. **Persistencia:** guardar `description` en la fila de `media` al crear.
4. **Lectura:** devolver `description` en **todas** las respuestas que incluyan media:
   - `POST /media` (201)
   - `GET /media/:id`
   - `GET /media/entity/:entityType/:entityId` (el array crudo)
5. **Auditoría:** incluir `description` en el payload del evento `media.uploaded` si aplica (opcional).

El FE envía `description` como **campo de formulario multipart** (solo cuando no está vacío),
junto a `file` / `entity_type` / `entity_id`.

## Cambio 2 — Nombre personalizado (CONFIRMAR; puede que no requiera cambios)

El FE envía el nombre elegido como el **`filename` de la parte multipart del archivo**, es decir, en
el `Content-Disposition: form-data; name="file"; filename="<nombre elegido>"`. Con `multer`, eso
llega como `file.originalname`.

**Acción:** confirmar que `media-service` guarda `originalFilename` a partir de
`file.originalname` (el filename de la parte multipart) **tal cual** lo recibe.

- ✅ Si ya es así → **no se requiere ningún cambio**; el renombrado funcionará automáticamente.
- ⚠️ Si el backend **sanitiza, ignora o reemplaza** ese nombre (p. ej. usa un slug o solo la
  extensión), entonces añadir un campo de formulario **opcional** explícito —sugerencia:
  **`original_filename`** (snake_case, para ser consistente con `entity_type`/`entity_id`)— que,
  si viene presente, sobreescriba el `originalFilename` almacenado. En ese caso, avísenme y el FE
  pasará a mandar ese campo explícito en lugar de (o además de) el filename de la parte.

> Nota: el `s3Key` puede seguir generándose como hoy (`<folder>/<entity_id>/<uuid>.<ext>`); el
> renombrado afecta solo al **nombre visible** (`originalFilename`), no a la clave de S3. El FE
> **siempre conserva la extensión original** (el usuario solo edita el nombre base, la extensión va
> fija como sufijo), así que `originalFilename` siempre llega con su extensión. Aun así, conviene
> que la extensión del `s3Key` se derive del **MIME real (magic bytes)** o del archivo en disco, no
> del nombre editable, por robustez.

## Resumen de lo que el FE ya manda hoy

```
POST /media   (multipart/form-data)
  file          = <binario>     ; filename = "<nombre elegido por el usuario>"
  entity_type   = CASE | TASK | EVIDENCE | INVOLVED_PERSON
  entity_id     = <uuid>
  description   = <texto>        ; solo si el usuario escribió algo (opcional)
```

## Criterios de aceptación

- [ ] `POST /media` acepta `description` opcional y la persiste; no rompe si no se envía.
- [ ] `GET /media/:id` y `GET /media/entity/:type/:id` devuelven `description`.
- [ ] Subir con un `filename` personalizado guarda ese nombre en `originalFilename`.
- [ ] Subir sin descripción sigue funcionando igual que antes (retrocompatible).
- [ ] El `ValidationPipe` no rechaza el campo `description`.
