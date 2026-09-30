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

La configuración está en `parte-a-nginx/balanceador.conf`. En el `upstream` se usa `zone` para que los procesos de Nginx compartan el estado de los servidores. Además de Round Robin, también se probaron `ip_hash` y `least_conn`.

```nginx
upstream backend_pool {
    zone backend_pool 64k;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    server 127.0.0.1:8083;
}

server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://backend_pool;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Verificar el reparto (el nombre del servidor cambia en cada petición):

```bash
curl -s http://localhost/health
curl -sI http://localhost/login | grep -i x-served-by
```

## Parte B: balanceo en AWS

- VPC `vpc-lab-lb-vpc` con 2 subredes públicas.
- 2 instancias EC2 (Amazon Linux 2023, t3.micro): `web-server-1` en `us-east-1a` y `web-server-2` en `us-east-1b`. Cada una instala Apache con User Data y sirve una página con su Instance ID y su zona de disponibilidad.
- Grupo de destino `tg-lab-web` con las dos instancias.
- Application Load Balancer `alb-lab-web`, que reparte el tráfico entre ellas.

Detalle de los recursos y el script de User Data en `parte-b-aws/notas.md`.

Prueba de tolerancia a fallos: al detener `web-server-1`, el ALB respondió con error 504 durante 1 o 2 minutos, hasta que el health check lo sacó del grupo. Luego el destino quedó en estado Unused y todo el tráfico fue a `web-server-2`.

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
