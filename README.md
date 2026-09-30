# Lab 7 - Balanceo de carga (GLAB-S07)

Curso: Desarrollo de Soluciones en la Nube - Tecsup

## Qué es

Una app monolito con LOGIN + CRUD de productos (Node.js, Express, EJS y PostgreSQL) que se usa para probar el balanceo de carga. Cada página muestra qué servidor atendió la petición, y la sesión usa JWT en una cookie, así que funciona sin importar a qué instancia llegue el usuario.

## Estructura

```
lab7-balanceador/
├── app-monolito/    App Node.js + Express + EJS + PostgreSQL
├── parte-a-nginx/   Scripts para levantar las 3 copias locales (Parte A)
└── parte-b-aws/     Parte B en AWS
```

## Parte A: balanceo local con Nginx

Se levantan 3 copias de la app en la misma máquina (Ubuntu en WSL2), en los puertos 8081, 8082 y 8083, detrás de Nginx con Round Robin (el algoritmo por defecto). Cada copia se identifica con la variable `SERVER_NAME` (Backend 1, Backend 2 y Backend 3).

Iniciar y detener las copias:

```bash
cd parte-a-nginx
./start-backends.sh     # logs en /tmp/backendN.log, PID en /tmp/backendN.pid
./stop-backends.sh
```

En el `upstream` de Nginx se usa `zone` para que los procesos de Nginx compartan el estado de los servidores. Además de Round Robin, también se probaron `ip_hash` y `least_conn`.

```nginx
upstream backends {
    zone backends 64k;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    server 127.0.0.1:8083;
}
```

Verificar el reparto (el nombre del servidor cambia en cada petición):

```bash
curl -s http://localhost/health
curl -sI http://localhost/login | grep -i x-served-by
```

## Parte B: balanceo en AWS

- VPC con 2 subredes públicas.
- 2 instancias EC2 con la app: `web-server-1` en `us-east-1a` y `web-server-2` en `us-east-1b`.
- Grupo de destino `tg-lab-web`, con health check en `/health`.
- Application Load Balancer `alb-lab-web`, que reparte el tráfico entre las dos instancias.

Prueba de tolerancia a fallos: se detiene uno de los servidores. El grupo de destino lo marca como no saludable y el ALB envía todo el tráfico al servidor que sigue activo, sin que la app deje de responder. Al volver a iniciarlo, regresa al reparto.

## Cómo correr la app

Requisitos: Node.js 18 o superior y PostgreSQL.

```bash
cd app-monolito
npm install
cp .env.example .env    # ajustar datos de la BD y JWT_SECRET
npm run seed            # carga productos de ejemplo
npm start
```

La app queda en `http://localhost:3000` (o en el puerto definido en `PORT`). Más detalles en `app-monolito/README.md`.

## Autora

Anali Salvador
