# TV Player — Live TV & IPTV Streaming Platform

Application web moderne, réactive et performante permettant à tous les utilisateurs autorisés de l'écosystème `oussamma.tn` de visionner les chaînes de télévision en direct configurées par l'administrateur.

- **Domaine de production :** [https://tv.oussamma.tn](https://tv.oussamma.tn)
- **Dépôt GitHub :** [https://github.com/oussamma-ben-hassine/tv-player](https://github.com/oussamma-ben-hassine/tv-player)
- **Hébergement :** VPS OVH
- **Déploiement :** Coolify & Docker Compose
- **Authentification :** SSO Centralisé OIDC (`https://sso-a.oussamma.tn`)

---

## 🚀 Fonctionnalités Clés

- **Authentification SSO OIDC & PKCE :**
  - Connexion fluide avec Authorization Code Flow et PKCE S256.
  - Détection automatique et synchronisation des rôles (`ADMIN` / `USER`).
  - Sessions persistantes sécurisées (cookies HttpOnly `SameSite=Lax`).
- **Lecteur Vidéo HLS Ultra-Performant :**
  - Moteur `hls.js` avec fallback natif Safari / iOS.
  - Sélecteur de qualité multi-résolutions (Auto, 1080p, 720p, 480p).
  - Contrôle du volume précis (0-100%), bouton muet et mémorisation.
  - Plein écran natif multi-navigateurs et mode Image dans l'Image (PiP).
  - Badge LIVE animé, détection de coupure et reconnexion automatique avec temporisation.
- **Back-Office Administrateur Dédié :**
  - Métriques clés (total chaînes, chaînes actives, catégories, erreurs récentes).
  - CRUD complet des chaînes TV, logos, catégories et droits d'accès.
  - Importateur de playlists M3U / M3U8 (URL ou fichier, prévisualisation, sélection fine, détection des doublons).
  - Connecteur extensible pour serveur IPTV externe avec tolérance aux pannes.
- **Guide TV (EPG) & Favoris :**
  - Intégration XMLTV optionnelle avec affichage du programme en cours et suivant.
  - Barre de progression du direct en temps réel.
  - Gestion des favoris synchronisée avec le profil SSO.
- **PWA Installable & Responsive :**
  - Compatible Desktop (panneau rétractable 260-320px) et Mobile-first (lecteur en haut, liste tactile en bas).
  - Manifest PWA, service worker avec mise en cache des ressources statiques et écran hors connexion.

---

## 🛠 Stack Technique

- **Frontend :** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, HLS.js.
- **Backend API :** NestJS, TypeScript, OpenAPI / Swagger (`/api/docs`), Axios, Fast-XML-Parser.
- **Base de données & ORM :** PostgreSQL 17, Prisma ORM.
- **Infrastructure :** Docker Compose multi-stage, Coolify, Traefik, Let's Encrypt SSL.

---

## 📚 Documentation Détaillée

- [Architecture Système](docs/architecture.md)
- [Guide d'Installation](docs/installation.md)
- [Guide de Déploiement Coolify](docs/deployment.md)
- [Intégration SSO OIDC & PKCE](docs/sso.md)
- [Guide Administrateur](docs/admin-guide.md)
- [Guide Utilisateur](docs/user-guide.md)
- [Sources & Playlists M3U](docs/sources.md)
- [Documentation de l'API](docs/api.md)
- [Guide de Développement](docs/development.md)

---

## 📄 Licence

Propriété de l'écosystème oussamma.tn. Tous droits réservés.
