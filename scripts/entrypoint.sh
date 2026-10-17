#!/bin/sh
set -e

mkdir -p /app/data
echo "[STARTUP] Initialisation de la base SQLite locale..."
npx prisma db push --accept-data-loss
echo "[STARTUP] Base de données SQLite prête."

echo "[STARTUP] Exécution du seed initial..."
if [ -f "dist/prisma/seed.js" ]; then
  node dist/prisma/seed.js || true
elif [ -f "dist/src/prisma/seed.js" ]; then
  node dist/src/prisma/seed.js || true
fi

echo "[STARTUP] Démarrage du serveur TV Player..."
if [ -f "dist/main.js" ]; then
  exec node dist/main.js
elif [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
else
  echo "[ERROR] Fichier main.js introuvable dans dist !"
  ls -la dist/
  exit 1
fi
