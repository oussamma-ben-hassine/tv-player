# Architecture du Système — TV Player

## Vue d'Ensemble

L'application **TV Player** est conçue selon une architecture modulaire et découplée, intégrant un frontend SPA React moderne et un backend d'API NestJS conteneurisés avec PostgreSQL.

```mermaid
graph TD
    Client[Navigateur Web / PWA Mobile] -->|HTTPS 443| Traefik[Traefik Proxy Coolify]
    Traefik -->|Port 3000| AppContainer[TV Player App Container (NestJS)]
    AppContainer -->|Prisma ORM| Postgres[PostgreSQL 17 Container]
    AppContainer -->|OIDC / PKCE| SSO[SSO Provider sso-a.oussamma.tn]
    AppContainer -->|HLS Stream Session| CDN[Flux HLS Externes Autorisés]
    AppContainer -->|Import / Sync| M3USource[Sources M3U & IPTV Server]
```

## Composants Principaux

1. **Frontend SPA (React + TypeScript + Vite) :**
   - Rendu fluide de l'interface en thème sombre.
   - Intégration de `hls.js` avec gestion fine des événements réseau et codecs.
   - Synchronisation optimiste des favoris et préférences de volume.
   - Service Worker pour la mise en cache statique PWA.

2. **Backend API (NestJS) :**
   - **AuthModule :** Gestion de l'Authorization Code Flow PKCE S256, échange de tokens, validation de session par cookies sécurisés.
   - **ChannelsModule :** Récupération filtrée du catalogue de chaînes, vérification des rôles d'accès (`USER` vs `ADMIN`).
   - **PlaybackModule :** Émission de sessions de lecture sécurisées (`/api/v1/playback-sessions`) et collecte d'erreurs de télémétrie.
   - **SourcesModule :** Adaptateurs indépendants pour ajouts manuels, playlists M3U avec validation SSRF, et connecteur optionnel IPTV Server.
   - **EpgModule :** Moteur d'estimation de grille horaire et parseur XMLTV.
   - **AdminModule :** Métriques agrégées pour le back-office administrateur.

3. **Base de Données (PostgreSQL + Prisma) :**
   - Modèle relationnel normalisé assurant l'intégrité référentielle des chaînes, catégories, favoris et sources.
   - Persistance sur volume Docker dédié `tv-db-data`.
