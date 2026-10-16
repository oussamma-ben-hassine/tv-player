# Spécification et Référence de l'API — TV Player

Documentation interactive OpenAPI / Swagger disponible sur `/api/docs`.

## Endpoints Publics & Authentification

- `GET /health` : Vérification de la disponibilité du service (Healthcheck).
- `GET /auth/login` : Initialise le flux d'autorisation OIDC avec défi PKCE S256.
- `GET /auth/callback` : Réception du code d'autorisation, échange de jetons et initialisation de session.
- `GET /auth/logout` : Révocation de session locale et redirection vers la déconnexion SSO.
- `GET /api/v1/me` : Récupère le profil de l'utilisateur connecté, ses rôles et préférences.
- `PATCH /api/v1/preferences` : Met à jour le volume, le mode muet et la dernière chaîne regardée.

## Endpoints Chaînes & Lecture (Utilisateur Authentifié)

- `GET /api/v1/channels` :
  - Paramètres optionnels : `search` (recherche textuelle), `categoryId` (filtre catégorie), `onlyFavorites` (filtre favoris).
  - Retourne les chaînes autorisées classées par ordre d'affichage.
- `GET /api/v1/channels/:id` : Détails d'une chaîne spécifique.
- `GET /api/v1/categories` : Liste des catégories avec nombre de chaînes associées.
- `GET /api/v1/favorites` : Liste des chaînes favorites de l'utilisateur.
- `POST /api/v1/favorites` : Ajoute une chaîne aux favoris (`{ "channelId": "uuid" }`).
- `DELETE /api/v1/favorites/:channelId` : Supprime une chaîne des favoris.
- `POST /api/v1/playback-sessions` : Crée une session de streaming éphémère (`{ "channelId": "uuid" }`).
- `POST /api/v1/playback-errors` : Remonte une anomalie de lecture pour diagnostic.
- `GET /api/v1/epg/:channelId` : Retourne le programme en cours et suivant avec pourcentage de progression.

## Endpoints Back-Office (Rôle ADMIN requis)

- `GET /api/v1/admin/dashboard` : Métriques globales et statistiques d'utilisation.
- `GET /api/v1/admin/channels` : Liste complète de toutes les chaînes (y compris inactives).
- `POST /api/v1/admin/channels` : Création manuelle d'une chaîne.
- `PUT /api/v1/admin/channels/:id` : Mise à jour d'une chaîne.
- `DELETE /api/v1/admin/channels/:id` : Suppression définitive d'une chaîne.
- `PATCH /api/v1/admin/channels/:id/toggle` : Activation ou désactivation rapide.
- `POST /api/v1/admin/sources/m3u/preview` : Analyse et prévisualisation d'un fichier ou lien M3U.
- `POST /api/v1/admin/sources/m3u/import` : Importation par lot de chaînes sélectionnées.
- `POST /api/v1/admin/sources/:id/sync-iptv` : Déclenchement de la synchronisation avec IPTV Server.
- `POST /api/v1/admin/categories` : Création d'une catégorie.
- `DELETE /api/v1/admin/categories/:id` : Suppression d'une catégorie.
- `POST /api/v1/admin/epg/import-xmltv` : Importation d'une grille horaire XMLTV.
