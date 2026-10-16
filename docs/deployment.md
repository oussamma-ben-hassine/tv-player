# Guide de Déploiement — Coolify & Docker Compose

## Déploiement Automatisé sur Coolify

L'application TV Player est configurée pour un déploiement continu via Coolify sur VPS OVH.

### Spécifications Coolify

- **Project UUID :** `x8txkp5gaqagm6r2tvnjqbne`
- **Application UUID :** `lgkxgm0he6zlj8vygfb2ih08`
- **Build Pack :** `dockercompose`
- **Fichier Compose :** `/docker-compose.yaml`
- **Domaine FQDN :** `https://tv.oussamma.tn`
- **Port exposé :** `3000`

### Variables d'Environnement de Production

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL | `postgresql://postgres:...@db:5432/tvplayer?schema=public` |
| `PORT` | Port d'écoute interne du conteneur | `3000` |
| `NODE_ENV` | Environnement d'exécution | `production` |
| `APP_URL` | URL publique complète | `https://tv.oussamma.tn` |
| `SSO_BASE_URL` | Fournisseur SSO central | `https://sso-a.oussamma.tn` |
| `SSO_CLIENT_ID` | Identifiant du client OAuth | `client_tv_app` |
| `SSO_CLIENT_SECRET` | Secret de plateforme OAuth | `sec_tv_platform_secret_2026` |
| `SSO_REDIRECT_URI` | Callback de redirection OIDC | `https://tv.oussamma.tn/auth/callback` |
| `ADMIN_EMAILS` | Liste des emails avec statut ADMIN | `oussammabenhassine@gmail.com` |
| `SESSION_SECRET` | Clé secrète de chiffrement des cookies | Clé aléatoire complexe |

### Procédure de Déploiement

1. Pousser les modifications sur la branche `main` du dépôt GitHub `tv-player`.
2. Déclencher le webhook de build Coolify ou exécuter l'appel API :
   ```bash
   POST https://coolify.oussamma.tn/api/v1/deploy?uuid=lgkxgm0he6zlj8vygfb2ih08
   ```
3. Coolify compile l'image multi-stage, lance le conteneur PostgreSQL, applique les migrations Prisma automatiques et démarre le serveur.
4. Traefik met à jour le certificat SSL Let's Encrypt et achemine le trafic HTTPS vers `https://tv.oussamma.tn`.
