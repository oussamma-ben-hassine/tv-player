# Gestion des Sources — TV Player

## Typologie des Sources Supportées

TV Player supporte 4 types de sources de flux conformément au cahier des charges :

### 1. Source Manuelle (Type A)
Ajoutée directement par l'administrateur depuis le back-office :
- Nom et description de la chaîne.
- URL du flux direct (`.m3u8` HLS).
- Logo et catégorie.
- Langue, pays et ordre de tri.
- Statut actif/inactif et visibilité par rôle (`USER` ou `ADMIN`).

### 2. Playlists M3U / M3U8 (Type B)
- **Import par URL ou fichier brut :** Téléchargement asynchrone sécurisé avec protection SSRF stricte.
- **Parseur d'attributs standardisés :** Extraction de `#EXTINF`, `tvg-id`, `tvg-name`, `tvg-logo`, `group-title`, `tvg-country`, `tvg-language`.
- **Prévisualisation interactive :** L'administrateur prévisualise la liste complète, filtre et coche uniquement les chaînes qu'il souhaite importer.
- **Détection des doublons :** Les chaînes existantes sont mises à jour sans régénérer de nouvel identifiant, ce qui préserve intacts les favoris des utilisateurs.

### 3. IPTV Server (Type C)
- Connecteur optionnel permettant de relier TV Player à l'instance IPTV Server de l'écosystème.
- **Résilience et isolation :** TV Player fonctionne de manière 100% autonome. Si IPTV Server est éteint ou inaccessible, les chaînes issues des autres sources continuent de fonctionner sans aucune interruption.
- Les identifiants et jetons API sont stockés de façon sécurisée côté serveur et ne sont jamais transmis au navigateur.

### 4. Sources Personnalisées (Type D)
Architecture modulaire basée sur le pattern Adaptateur dans `SourcesService`, permettant d'ajouter facilement tout futur connecteur propriétaire sans modifier le moteur de rendu.
