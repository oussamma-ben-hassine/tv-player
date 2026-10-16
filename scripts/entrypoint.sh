#!/bin/sh
set -e

echo "[STARTUP] Attente de la disponibilité de PostgreSQL..."
until npx prisma db push --accept-data-loss; do
  echo "[STARTUP] PostgreSQL en cours de démarrage, nouvelle tentative dans 2s..."
  sleep 2
done

echo "[STARTUP] Migration de la base de données réussie."

echo "[STARTUP] Exécution du seed initial..."
node dist/src/prisma/seed.js || true

echo "[STARTUP] Démarrage du serveur TV Player..."
exec node dist/src/main.js
