#!/usr/bin/env bash
# Detiene las 3 instancias levantadas con start-backends.sh. Uso: ./stop-backends.sh
set -uo pipefail

for i in 1 2 3; do
  pid_file="/tmp/backend$i.pid"

  if [ ! -f "$pid_file" ]; then
    echo "Backend $i: no hay archivo PID ($pid_file), nada que detener."
    continue
  fi

  pid="$(cat "$pid_file")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    # Espera hasta 5 s a que termine; si no, lo fuerza.
    for _ in $(seq 1 10); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.5
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid"
      echo "Backend $i (PID $pid) detenido a la fuerza."
    else
      echo "Backend $i (PID $pid) detenido."
    fi
  else
    echo "Backend $i: el PID $pid ya no estaba corriendo."
  fi
  rm -f "$pid_file"
done
