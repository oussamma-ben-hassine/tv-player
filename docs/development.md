# Guide de Développement — TV Player

## Structure du Code

- `src/` : Code source NestJS (modules Auth, Channels, Categories, Favorites, Playback, Epg, Sources, Admin, Prisma).
- `prisma/` : Schéma de base de données PostgreSQL et scripts de migration.
- `frontend/` : Application React + Vite + Tailwind CSS + HLS.js.
- `docs/` : Documentation complète de la plateforme.

## Commandes Utiles

- `npm run build` : Compilation du backend et synchronisation Prisma.
- `cd frontend && npm run build` : Compilation de la SPA React dans `../dist/public`.
- `npm run prisma:push` : Synchronisation du schéma Prisma avec PostgreSQL.
- `npm run prisma:seed` : Initialisation des chaînes TV par défaut.
