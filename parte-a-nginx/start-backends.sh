#!/usr/bin/env bash
# Levanta 3 instancias de la app monolítica en segundo plano (puertos 8081-8083)
# para balancearlas con Nginx. Uso: ./start-backends.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../app-monolito" && pwd)"
ENV_FILE="$APP_DIR/.env"

PORTS=(8081 8082 8083)

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js no está instalado (sudo apt install nodejs npm, o usa nvm)." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: no existe $ENV_FILE (cópialo desde .env.example y ajusta los datos de la BD)." >&2
  exit 1
fi

if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "Instalando dependencias en $APP_DIR ..."
  (cd "$APP_DIR" && npm install --omit=dev)
fi

# Carga las variables de la base (y JWT_SECRET) desde app-monolito/.env.
# Se eliminan los \r por si el .env se editó en Windows.
set -a
# shellcheck disable=SC1090
source <(sed 's/\r$//' "$ENV_FILE")
set +a

cd "$APP_DIR"

for i in 1 2 3; do
  port="${PORTS[$((i - 1))]}"
  pid_file="/tmp/backend$i.pid"
  log_file="/tmp/backend$i.log"

  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "Backend $i ya está corriendo (PID $(cat "$pid_file"), puerto $port)."
    continue
  fi

  PORT="$port" SERVER_NAME="Backend $i" nohup node src/app.js >"$log_file" 2>&1 &
  echo $! >"$pid_file"
  echo "Backend $i iniciado: puerto $port, PID $!, log $log_file"
done

# Comprueba que cada instancia responda en /health (la BD puede tardar unos segundos).
if command -v curl >/dev/null 2>&1; then
  echo
  echo "Verificando /health ..."
  for i in 1 2 3; do
    port="${PORTS[$((i - 1))]}"
    status="sin respuesta"
    for _ in $(seq 1 30); do
      if body="$(curl -fsS "http://127.0.0.1:$port/health" 2>/dev/null)"; then
        status="OK  $body"
        break
      fi
      sleep 1
    done
    echo "  Backend $i (:$port) -> $status"
    if [ "$status" = "sin respuesta" ]; then
      echo "    Revisa el log: tail -n 20 /tmp/backend$i.log"
    fi
  done
fi
