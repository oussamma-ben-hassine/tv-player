# Authentification SSO — OIDC & PKCE

## Configuration OpenID Connect

L'application délègue l'authentification au serveur central SSO disponible sur `https://sso-a.oussamma.tn`.

- **Client ID :** `client_tv_app`
- **Client Secret :** `sec_tv_platform_secret_2026`
- **Scopes autorisés :** `openid profile email`
- **Redirect URIs enregistrées :**
  - `https://tv.oussamma.tn/auth/callback`
  - `https://tv.oussamma.tn/api/v1/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:5173/auth/callback`

## Déroulement du Flux PKCE

1. L'utilisateur clique sur **Connexion SSO** ou est redirigé vers `/auth/login`.
2. Le backend génère cryptographiquement un `code_verifier` (32 octets aléatoires en base64url) et dérive le `code_challenge` :
   $$\text{code\_challenge} = \text{base64url}(\text{SHA256}(\text{code\_verifier}))$$
3. Un paramètre `state` anti-CSRF est associé à la session.
4. Redirection vers `https://sso-a.oussamma.tn/oauth/authorize`.
5. Après validation des identifiants sur le SSO, l'utilisateur revient sur `/auth/callback?code=...&state=...`.
6. Le backend vérifie le `state` puis échange le `code` et le `code_verifier` contre l'`access_token` sur l'endpoint `/oauth/token`.
7. Le profil est récupéré sur `/oauth/userinfo` et synchronisé localement dans PostgreSQL (`User` & `Preference`).
8. Le rôle administrateur est automatiquement attribué si l'email correspond à `oussammabenhassine@gmail.com` ou si le SSO transmet le rôle `admin`/`super_admin`.
