# Email Security Checker

Plateforme web et REST API pour vérifier si une ou plusieurs adresses e-mail apparaissent dans des violations de données connues. Interface React en français, API Express et fournisseur Have I Been Pwned (HIBP).

## Démarrage

Prérequis : Node.js 18.18+ et npm.

```bash
npm install
cp .env.example .env
```

Ajoutez votre clé API HIBP dans `.env` (`HIBP_API_KEY`). La clé reste côté serveur et n'est jamais envoyée au navigateur. Les comptes API HIBP peuvent être soumis à des conditions et limites propres au fournisseur.

```bash
npm run dev
```

L'interface est disponible à `http://localhost:5173`, l'API à `http://localhost:3000`. Sans clé configurée, l'interface et les routes de santé démarrent, mais la vérification répond avec `503 SERVICE_NOT_CONFIGURED`.

Pour lancer en mode production :

```bash
npm run build
NODE_ENV=production npm start
```

Le serveur Express sert alors l'application compilée depuis `dist/`.

## API REST

Toutes les réponses sont en JSON. Les requêtes `POST` utilisent `Content-Type: application/json`.

### `GET /health`

Indique l'état du serveur et si le fournisseur est configuré. Ne divulgue aucune clé.

### `POST /api/check`

Vérifie une adresse.

```json
{ "email": "vous@exemple.com" }
```

La réponse fournit `email`, `compromised`, `breachCount` et `breaches`. Pour chaque incident, les données exposées sont limitées au nom, domaine, dates, catégories de données et statut de vérification.

### `POST /api/check/batch`

Vérifie de 1 à 10 adresses, transmises séquentiellement au fournisseur.

```json
{ "emails": ["vous@exemple.com", "autre@exemple.com"] }
```

Retour : `{ "checked": 2, "results": [...] }`.

Les erreurs utilisent une enveloppe `{ "error": { "code": "...", "message": "..." } }`. Les adresses invalides reçoivent HTTP 400. Les requêtes API sont limitées à 30 par minute et par adresse IP (limitation en mémoire, adaptée à une instance unique).

## Confidentialité et sécurité

- Aucune adresse recherchée n'est écrite dans les journaux ni enregistrée par l'application.
- Les vérifications nécessitent de transmettre l'adresse au fournisseur HIBP ; informez-en les utilisateurs et consultez ses conditions et sa politique de confidentialité avant le déploiement.
- Clé fournisseur uniquement dans l'environnement serveur ; ne jamais la mettre dans une variable `VITE_*` ni dans le dépôt.
- En production multi-instance, configurez un stockage partagé pour la limitation de débit et ajoutez une politique de confidentialité adaptée à votre usage.
- Un résultat sans correspondance ne garantit pas qu'une adresse n'a jamais été exposée.

## Stack

React, Vite, Express, Helmet, express-rate-limit et API Have I Been Pwned.
