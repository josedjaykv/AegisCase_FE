# Respuesta FE — Integración en Docker Compose

Respuesta punto por punto a la solicitud de infraestructura.

## 1. Repositorio y build

| Dato | Valor |
|---|---|
| Carpeta del repo | `AegisCase_FE` → referenciar como `../AegisCase_FE` |
| Rama | `phase_10` (rama actual de trabajo; `main` es la estable) |
| Framework / build tool | **React 18 + Vite 5** (TypeScript) |
| Gestor de paquetes | **npm** (hay `package-lock.json` → usar `npm ci`) |
| Versión de Node | **Node 20** (`.nvmrc` = 20, `engines.node >= 20`) |
| Comando de build | `npm run build` (ejecuta `tsc -b && vite build`) |
| Carpeta de salida | **`dist`** (raíz del repo) |
| ¿SPA estático o server Node? | **SPA estático**. Se sirve con **nginx**. NO necesita Node en runtime. |

## 2. Dockerfile

✅ **Ya está en el repo.** Archivos agregados:

- `Dockerfile` — multi-stage: `node:20-alpine` (build) → `nginx:1.27-alpine` (serve).
- `nginx.conf` — server block con history-fallback a `index.html` (necesario para react-router) y cache de assets.
- `.dockerignore`.

El contenedor expone el puerto **80**.

## 3. Configuración de conexión al backend (crítico)

- **Una sola variable:** `VITE_API_BASE_URL`.
- **NO existe variable de Keycloak en el FE.** El navegador **no habla con Keycloak directamente** — todo el auth pasa por el API Gateway (`POST /auth/login`, `/auth/refresh`, `/auth/me`). El gateway es quien habla con Keycloak. Por lo tanto **no necesitan pasarnos `KEYCLOAK_URL` al FE**.
- **Build-time vs runtime:** las variables `VITE_*` se **incrustan en tiempo de build** (Vite las inyecta en el bundle). Por eso el `Dockerfile` las recibe como `ARG`:

  ```
  --build-arg VITE_API_BASE_URL=http://localhost:3000
  ```

- **URL pública:** confirmado. El FE apunta al gateway en `http://localhost:3000` (es la URL que el navegador resuelve en el host, no un nombre interno de Docker). El default del Dockerfile ya es `http://localhost:3000`, así que si exponen el gateway ahí no necesitan pasar nada.

Otras variables opcionales (tienen defaults, no son necesarias para levantar):
- `VITE_ENV` (default `production`)
- `VITE_SENTRY_DSN` (default vacío → Sentry desactivado)

## 4. Puerto

✅ Nos sirve **`4200`** en el host. El contenedor escucha en `80`; mapear `4200:80`.

## 5. Autenticación con Keycloak

- **Flujo de login:** **directo** — usuario + contraseña contra `POST /auth/login` del gateway. **NO** usamos redirect OIDC / Authorization Code desde el navegador.
- En consecuencia, el FE **no usa el client `aegiscase-frontend` directamente** ni necesita Redirect URIs / Web Origins de Keycloak. (El gateway maneja la conversación con Keycloak.)
- **CORS:** lo único que importa es que el gateway permita el origen del FE. Con el FE en `http://localhost:4200`, asegúrense de que ese origen esté en el CORS del gateway (ya lo tienen permitido según la solicitud).

## 6. Datos de prueba

- El FE **no es dueño de los usuarios** — viven en Keycloak/seed del backend. Necesitamos que **ustedes nos pasen** un usuario/contraseña de prueba ya cargado (idealmente uno por rol: `ADMIN`, `DETECTIVE`, `ANALYST`) para validar login end-to-end.

---

## Snippet sugerido para el `docker-compose.yml`

```yaml
  frontend:
    build:
      context: ../AegisCase_FE
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: http://localhost:3000
    ports:
      - "4200:80"
    depends_on:
      - api-gateway   # ajustar al nombre real del servicio del gateway
```

> El FE es estático: una vez construido sirve archivos. No tiene healthcheck de
> dependencias en runtime, así que `depends_on` es solo orden de arranque.
