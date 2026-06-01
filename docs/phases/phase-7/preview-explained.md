# Fase 7 — Cómo funciona la previsualización de archivos (guía para entender los conceptos)

Este documento explica, desde cero, **por qué** podemos mostrar imágenes, PDFs y videos
directamente dentro de la app, y qué significan palabras como *S3*, *URL presignada*, *inline*,
*Content-Type* y *CORS*. Está escrito para que alguien que nunca ha trabajado con almacenamiento en
la nube pueda seguirlo.

> TL;DR: los archivos no viven en nuestro servidor, viven en **S3**. S3 es privado, así que para
> verlos pedimos una **URL temporal con permiso** (presignada). Si esa URL le dice al navegador
> "muéstrame el archivo" (*inline*) en vez de "descárgalo" (*attachment*), entonces podemos
> incrustarlo en un `<img>` o `<iframe>` y se ve dentro de la app.

---

## 1. ¿Dónde viven los archivos? — S3

Cuando un investigador sube una foto, esa foto **no** se guarda en la base de datos ni en el disco
de nuestro backend. Se guarda en **S3** (Amazon Simple Storage Service), o en **MinIO** en
desarrollo (MinIO es un S3 "casero" que corre en local y habla el mismo idioma que S3).

Conceptos de S3:

- **Objeto**: un archivo guardado (la foto, el PDF…). Cada objeto tiene un contenido + unos
  *metadatos* (su tipo, su nombre, etc.).
- **Bucket**: una "carpeta raíz" / contenedor donde viven los objetos. Nuestro bucket se llama algo
  como `aegiscase-media`.
- **Key (clave)**: la "ruta" del objeto dentro del bucket. En nuestro caso sigue el patrón
  `<carpeta>/<entityId>/<uuid>.<ext>`, p. ej. `evidence/550e.../a1b2.jpg`. Eso es el campo `s3Key`.

Por qué se usa S3 y no nuestra base de datos:
- Las bases de datos son malas guardando archivos grandes (videos de 50 MB).
- S3 está hecho exactamente para eso: barato, escalable, y sirve los bytes muy rápido.

```
   Usuario sube foto.jpg
          │
          ▼
   media-service (NestJS) ──guarda el archivo──▶  S3 / MinIO  (bucket: aegiscase-media)
          │                                        objeto key: evidence/<id>/<uuid>.jpg
          └──guarda solo los METADATOS──▶  Postgres (id, url, s3Key, mimeType, fileSize…)
```

En Postgres queda una fila con los **datos sobre** el archivo (no el archivo en sí): su `id`, su
`s3Key`, su `mimeType`, su tamaño, etc.

---

## 2. ¿Por qué no podemos usar el campo `url` directamente?

La entidad `Media` tiene un campo `url` que se ve así:

```
https://aegiscase-media.s3.us-east-1.amazonaws.com/evidence/<id>/<uuid>.jpg
```

Parece un enlace normal, pero **si lo pegas en el navegador casi siempre da un error de acceso
(403 Forbidden)**. ¿Por qué? Porque los buckets de S3 son **privados por defecto**: cualquiera en
internet conoce (o adivina) la dirección, pero S3 no deja que un desconocido lea el objeto.

Esto es **a propósito y deseable** en un sistema policial: no queremos que una foto de evidencia
sea accesible para cualquiera que tenga el link. El propio backend lo advierte:

> "this is **not** a usable download URL by itself unless the bucket grants public read"
> — BACKEND_INVESTIGATION_REPORT.md §3.9

Entonces, ¿cómo vemos el archivo si el bucket es privado? Con una **URL presignada**.

---

## 3. La URL presignada — un "pase temporal con permiso"

Una **URL presignada** (*presigned URL*) es un enlace al mismo objeto de S3, pero con una **firma**
añadida que dice: *"el portador de este enlace tiene permiso para leer este objeto durante la
próxima hora"*.

Piensa en ello como un **boleto de entrada con caducidad**:

- Lo emite alguien que **sí** tiene la llave del bucket: nuestro **backend** (que tiene las
  credenciales de S3).
- Lleva una firma criptográfica (los parámetros `X-Amz-Signature`, `X-Amz-Expires`, etc. en la URL).
- **Caduca**: en nuestro caso vive **1 hora (3600 s)**. Pasado ese tiempo, el mismo enlace da 403.

El flujo:

```
  Frontend                          Backend                         S3
     │   GET /media/:id/download-url    │                            │
     │ ───────────────────────────────▶│  "firma" un acceso temporal│
     │                                  │ ──────────────────────────▶│
     │   { url: "https://...X-Amz...",  │                            │
     │     expiresIn: 3600 }            │                            │
     │ ◀───────────────────────────────│                            │
     │                                                               │
     │   El navegador usa esa url directamente  ───────────────────▶│  200 OK + bytes del archivo
     │   (en un <img src>, <iframe>, etc.)       ◀───────────────────│
```

Dos cosas importantes:

1. **El archivo NO pasa por nuestro backend.** El backend solo emite el boleto; los bytes van
   directo de S3 al navegador. Por eso la regla de oro de esta fase es *"never proxy the file bytes
   through the API"*: sería lento y caro hacer que cada foto pase por NestJS.
2. **El enlace caduca**, así que lo pedimos *cuando hace falta* y lo guardamos en caché poco tiempo
   (nosotros lo cacheamos ~50 min, por debajo de la hora de vida).

---

## 4. Cómo decide el navegador entre "mostrar" y "descargar": `Content-Disposition`

Cuando S3 te entrega el archivo, manda junto a los bytes unos **encabezados HTTP** (metadatos de la
respuesta). Dos son clave:

### `Content-Type`
Dice **qué tipo de archivo es**: `image/jpeg`, `application/pdf`, `video/mp4`… El navegador lo usa
para saber **cómo** interpretarlo. Si le llega `application/pdf`, abre su visor de PDF; si le llega
`image/png`, lo dibuja como imagen.

### `Content-Disposition`
Dice **qué hacer con el archivo**. Tiene dos valores que nos importan:

| Valor | Qué hace el navegador |
|---|---|
| `inline` | **Lo muestra** en la pestaña/visor (lo "incrusta"). Es lo que queremos para previsualizar. |
| `attachment; filename="foto.jpg"` | **Lo descarga** al disco con ese nombre. Es lo que queremos en el botón *Download*. |

Ejemplo mental:
- `Content-Type: application/pdf` + `Content-Disposition: inline` → el PDF se ve dentro de un `<iframe>`.
- `Content-Type: application/pdf` + `Content-Disposition: attachment` → el navegador lo baja como archivo.

**Por qué tu preview ya funcionaba sin tocar el backend:** tus objetos en S3 se sirven **inline por
defecto** (nadie les puso `attachment`). Por eso el `<img>` y el `<iframe>` muestran el contenido
sin que hayas configurado nada. El parámetro `?disposition=inline` que manda el frontend hoy el
backend lo **ignora**, pero como inline ya es el comportamiento por defecto, igual se ve.

El único caso donde sí necesitas el backend es para que el botón **Download** **fuerce** la descarga
(`attachment` + nombre original) en vez de abrir el archivo en una pestaña. Eso es opcional.

---

## 5. ¿Por qué unos tipos se ven y otros no?

El navegador solo sabe renderizar nativamente ciertos formatos:

| Tipo | Cómo lo mostramos | ¿El navegador puede solo? |
|---|---|---|
| Imagen (png/jpg/webp/gif) | `<img src=url>` | ✅ Sí |
| PDF | `<iframe src=url>` (visor de PDF integrado) | ✅ Sí |
| Texto (.txt/.log) | `<iframe src=url>` | ✅ Sí |
| Video (mp4) | `<video controls src=url>` | ✅ Sí |
| Audio (mp3) | `<audio controls src=url>` | ✅ Sí |
| **Word / Excel (docx/xlsx/doc/xls)** | — | ❌ **No** |

Word y Excel **no** tienen visor nativo en el navegador. Para verlos *dentro* de la app habría dos
caminos, y ambos se descartaron en esta fase:
- **Mandar el archivo a un visor externo** (Google/Microsoft) → inaceptable: enviaría evidencia a un
  tercero. (Contexto policial = privacidad.)
- **Convertirlo en el navegador con una librería** (p. ej. `docx-preview`) → añade dependencias y
  además obligaría a hacer `fetch()` de los bytes (lo que sí necesitaría CORS, ver §6).

Por eso, para Office mostramos una tarjeta *"Preview not available"* con un botón de **Descargar**.

---

## 6. ¿Qué es CORS y por qué aquí NO nos hizo falta?

**CORS** (*Cross-Origin Resource Sharing*) es una regla de seguridad del navegador. "Origen" =
protocolo + dominio + puerto. Nuestra app corre en `http://localhost:5173`; S3 está en otro dominio
(`...amazonaws.com`). Son **orígenes distintos**.

La regla del navegador es:
- Cargar recursos cruzados con **etiquetas HTML** (`<img>`, `<video>`, `<script>`, `<iframe>`) está
  **permitido** sin CORS. Por eso un `<img src="https://otro-dominio/...">` funciona siempre.
- Pero leer datos cruzados con **JavaScript** (`fetch()` / `XMLHttpRequest`) está **bloqueado**
  salvo que el servidor remoto (S3) responda con cabeceras CORS que autoricen tu origen.

Como nosotros mostramos **todo con etiquetas** (`<img>`, `<iframe>`, `<video>`, `<audio>` apuntando
a la URL presignada), **nunca hacemos `fetch()` de los bytes**, así que **no necesitamos configurar
CORS en el bucket S3**. (Solo lo necesitaríamos si hubiéramos elegido convertir Office en el
navegador, que requiere bajar los bytes con `fetch()`.)

> Ojo, no confundir: el backend **sí** tiene CORS configurado en su *API gateway* (para que el FE
> pueda llamar a `localhost:3000`). Pero ese CORS **no aplica a S3**, porque la URL presignada va
> directo a S3 sin pasar por el gateway. Son dos cosas separadas.

---

## 7. Cómo se ve todo esto en nuestro código

| Concepto del documento | Dónde vive en el código |
|---|---|
| Pedir la URL presignada | `services/media/media.api.ts` → `getDownloadUrl(id, disposition?)` |
| `inline` vs `attachment` | tipo `MediaDisposition` en `services/media/media.types.ts` |
| Cachear la URL inline ~50 min | `useMediaInlineUrlQuery` en `services/media/media.queries.ts` |
| Forzar descarga (abre la url `attachment`) | `fetchAndOpenDownloadUrl` en `media.queries.ts` |
| Miniatura real de imágenes | `features/media/components/MediaThumbnail.tsx` (`<img src=urlInline>`) |
| Decidir cómo renderizar cada tipo | `mediaKind()` y `canPreviewInApp()` en `features/media/mediaConstraints.ts` |
| Visor in-app (img/pdf/txt/video/audio + fallback Office) | `features/media/components/MediaViewerDialog.tsx` |

Flujo completo cuando abres una imagen en el visor:

```
1. Click en la miniatura
2. MediaViewerDialog se abre y llama useMediaInlineUrlQuery(media.id)
3. Eso hace GET /media/:id/download-url?disposition=inline  →  backend firma  →  { url }
4. Render: <img src={url} />   (el navegador pide los bytes directo a S3 con esa url firmada)
5. S3 responde 200 con Content-Type: image/jpeg + (inline)  →  se ve la imagen
```

---

## 8. Resumen en una frase

Los archivos viven en **S3 (privado)**; para verlos pedimos al **backend** una **URL firmada y
temporal**; si esa URL sirve el contenido **inline**, lo incrustamos con etiquetas HTML y se
previsualiza **sin pasar por nuestro servidor y sin necesitar CORS**. Word/Excel no se previsualizan
porque el navegador no sabe dibujarlos y no queremos mandarlos a un tercero.
