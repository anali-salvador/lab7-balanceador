# App monolítica · Lab 7 (Balanceo de carga)

Inventario de productos con **Node.js + Express + EJS + PostgreSQL**, pensado para correr en varias instancias detrás de Nginx o de un ALB de AWS.

- Registro e inicio de sesión (contraseñas con bcrypt).
- Sesión **sin estado**: JWT en una cookie `httpOnly`. Cualquier instancia puede atender cualquier petición.
- CRUD de productos (nombre, categoría, precio, stock), solo para usuarios autenticados.
- `GET /health` → `200` si la base responde, `503` si no (útil para el health check del balanceador).
- El nombre del servidor que atiende cada petición se ve en el pie de página, en `/health` y en la cabecera `X-Served-By`. Es el valor de `SERVER_NAME` o, si no se define, el hostname de la máquina.
- Las tablas se crean solas al arrancar. Si la BD no está lista, reintenta 5 veces (cada 3 s) antes de salir.

## Requisitos

- Node.js 18 o superior
- PostgreSQL (por ejemplo en Docker):

```bash
docker run -d --name pg-lab7 -e POSTGRES_PASSWORD=lab7pass -e POSTGRES_DB=lab7 -p 5432:5432 postgres:16
```

## Cómo correrla

```bash
cd app-monolito
npm install
cp .env.example .env      # y ajusta los valores
npm run seed              # opcional: carga 8 productos de ejemplo
npm start                 # o: npm run dev (se reinicia al guardar cambios)
```

Abre http://localhost:3000 y crea una cuenta.

## Variables de entorno

| Variable        | Ejemplo            | Descripción                                               |
|-----------------|--------------------|-----------------------------------------------------------|
| `PORT`          | `3000`             | Puerto HTTP (escucha en `0.0.0.0`).                       |
| `DB_HOST`       | `localhost`        | Host de PostgreSQL.                                       |
| `DB_PORT`       | `5432`             | Puerto de PostgreSQL.                                     |
| `DB_USER`       | `postgres`         | Usuario.                                                  |
| `DB_PASSWORD`   | `lab7pass`         | Contraseña.                                               |
| `DB_NAME`       | `lab7`             | Base de datos.                                            |
| `JWT_SECRET`    | *(cadena larga)*   | Clave para firmar los JWT. **Obligatoria.**               |
| `COOKIE_SECURE` | `false`            | `true` solo si el balanceador sirve HTTPS.                |
| `SERVER_NAME`   | `Backend 1`        | Opcional. Nombre visible de la instancia; por defecto, el hostname. |

> ⚠️ **`JWT_SECRET` debe ser exactamente el mismo en todas las instancias.** Si cada servidor tiene uno distinto, el token firmado por una instancia será rechazado por las demás y el usuario "perderá" la sesión al cambiar de servidor.

## Detrás de un balanceador

- La app usa `app.set('trust proxy', 1)` para respetar las cabeceras `X-Forwarded-*` de Nginx o del ALB.
- Todas las instancias deben apuntar a la **misma base de datos**.
- Health check recomendado: ruta `/health`, código esperado `200`.
- Para comprobar el reparto de carga:

```bash
curl -s http://<balanceador>/health        # el campo "hostname" (SERVER_NAME) cambia entre peticiones
curl -sI http://<balanceador>/login | grep -i x-served-by
```

## Varias instancias en la misma máquina (Parte A · Nginx)

Si todas las copias corren en el mismo equipo, tendrán el mismo hostname. Usa `SERVER_NAME` para distinguirlas:

```bash
PORT=8081 SERVER_NAME="Backend 1" npm start
```

Los scripts de `../parte-a-nginx/` lo hacen automáticamente con las variables de `app-monolito/.env`:

```bash
cd parte-a-nginx
bash start-backends.sh    # Backend 1, 2 y 3 en los puertos 8081, 8082 y 8083
bash stop-backends.sh     # los detiene usando /tmp/backendN.pid
```

Los logs quedan en `/tmp/backend1.log`, `/tmp/backend2.log` y `/tmp/backend3.log`.
