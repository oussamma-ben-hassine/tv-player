# Guide d'Installation — TV Player

## Prérequis

- Docker et Docker Compose
- Node.js 20+ (pour exécution locale)
- Accès au SSO `https://sso-a.oussamma.tn`

## Déploiement Local avec Docker

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/oussamma-ben-hassine/tv-player.git
   cd tv-player
   ```

2. Configurer les variables d'environnement dans `.env` :
   ```bash
   cp .env.example .env
   ```

3. Démarrer les services avec Docker Compose :
   ```bash
   docker-compose up -d --build
   ```

4. L'application est disponible sur `http://localhost:3000` et la documentation API sur `http://localhost:3000/api/docs`.
