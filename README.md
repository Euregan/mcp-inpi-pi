# mcp-inpi-pi

Serveur [MCP](https://modelcontextprotocol.io/) exposant l'[API Propriété industrielle de l'INPI](https://www.inpi.fr/ressources/propriete-intellectuelle/acces-aux-api-et-ftp).

> **Ce projet est indépendant et n'est ni affilié, ni approuvé, ni sponsorisé par l'INPI.**

## Fonctionnalités

| Tool / Resource | Description |
|---|---|
| `search_trademarks` | Recherche de marques par nom, classe, titulaire |
| `get_trademark_details` | Fiche complète d'une marque (classes, statut, titulaire, événements) |
| `nice-classes://list` | Classification de Nice — 45 classes avec titres et exemples (données embarquées) |

## Installation

### Obtenir un compte API INPI (gratuit)

1. Créez un compte sur [data.inpi.fr](https://data.inpi.fr)
2. Allez dans "Mon espace client" → "Accès APIs PI"
3. Sélectionnez le contenu "Marques"
4. Un email d'activation vous sera envoyé pour créer votre mot de passe API

### Configuration Claude Desktop

```json
{
  "mcpServers": {
    "inpi-pi": {
      "command": "npx",
      "args": ["-y", "@guix77/mcp-inpi-pi"],
      "env": {
        "INPI_USERNAME": "votre-email@exemple.fr",
        "INPI_PASSWORD": "votre-mot-de-passe-API"
      }
    }
  }
}
```

## Transport HTTP (expérimental)

Un transport HTTP alternatif est disponible via la commande `mcp-inpi-pi-http`. Il utilise le protocole [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) du SDK MCP (remplaçant le SSE classique, désormais déprécié).

```bash
PORT=3000 INPI_USERNAME=… INPI_PASSWORD=… npx @guix77/mcp-inpi-pi-http
```

Endpoints exposés :
- `POST /mcp` — endpoint MCP principal (gestion de sessions via header `mcp-session-id`)
- `GET /health` — health check (`{"status":"ok","transport":"streamable-http"}`)

> Ce transport est expérimental : il n'est pas encore intégré dans les configurations Claude Desktop standard.

### Docker (expérimental)

```bash
# Exporter les variables puis lancer
INPI_USERNAME=… INPI_PASSWORD=… docker compose up -d
```

Ou sans docker-compose :

```bash
docker build -t mcp-inpi-pi .
docker run -p 3000:3000 \
  -e INPI_USERNAME=… \
  -e INPI_PASSWORD=… \
  mcp-inpi-pi
```

> Le conteneur expose uniquement le transport HTTP. Pour une intégration stdio classique (Claude Desktop), aucun conteneur n'est nécessaire.

### Vercel (expérimental)

Le serveur peut aussi être déployé comme [Vercel Function](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel), sans framework (`api/mcp.ts` à la racine, via [`mcp-handler`](https://www.npmjs.com/package/mcp-handler)) :

```bash
npx vercel deploy
```

Ce déploiement est **multi-utilisateurs** : il n'y a pas de compte INPI global configuré côté serveur. Chaque utilisateur fournit ses propres identifiants INPI, selon le client utilisé :

- **Claude Desktop / Claude Code CLI** : en-têtes HTTP `X-INPI-Username` / `X-INPI-Password`, envoyés avec chaque requête.
- **claude.ai (web)** : OAuth 2.1 — l'UI web des connecteurs ne supporte que "sans authentification" ou OAuth, pas les en-têtes personnalisés. Ce serveur agit donc aussi comme son propre serveur d'autorisation OAuth (`/authorize`, `/token`, `/register`, métadonnées `.well-known/*`). En ajoutant le connecteur, vous serez redirigé vers une page de connexion hébergée par ce serveur, où vous saisissez votre email et mot de passe API INPI — envoyés uniquement à ce serveur, jamais à Claude ni à un tiers.

Une requête sans identifiants valides (en-têtes ou token OAuth) reçoit une erreur 401.

Endpoint exposé : `https://<votre-projet>.vercel.app/api/mcp`.

En-têtes (Claude Desktop) :

```json
{
  "mcpServers": {
    "inpi-pi": {
      "url": "https://<votre-projet>.vercel.app/api/mcp",
      "headers": {
        "X-INPI-Username": "votre-email@exemple.fr",
        "X-INPI-Password": "votre-mot-de-passe-API"
      }
    }
  }
}
```

En-têtes (Claude Code) :

```bash
claude mcp add --transport http inpi-pi https://<votre-projet>.vercel.app/api/mcp \
  --header "X-INPI-Username: votre-email@exemple.fr" \
  --header "X-INPI-Password: votre-mot-de-passe-API"
```

OAuth (claude.ai) : ajoutez simplement `https://<votre-projet>.vercel.app/api/mcp` comme connecteur personnalisé dans les réglages de claude.ai — l'enregistrement du client (RFC 7591) et la découverte des métadonnées sont automatiques, vous serez redirigé vers le formulaire de connexion INPI.

**Note sur la sécurité du flux OAuth** : ce déploiement n'utilise aucune base de données. Chaque code d'autorisation / access token / refresh token est un blob chiffré (AES-256-GCM) qui porte directement les identifiants INPI — il n'y a rien à stocker côté serveur. Conséquence : il n'existe pas de révocation individuelle d'un token ; seule la rotation de `OAUTH_TOKEN_SECRET` invalide tous les tokens en circulation, pour tous les utilisateurs à la fois.

## Variables d'environnement

Pour les transports stdio, Docker et HTTP expérimental (`mcp-inpi-pi-http`) :

| Variable | Requis | Description |
|---|---|---|
| `INPI_USERNAME` | Oui | Email du compte API INPI |
| `INPI_PASSWORD` | Oui | Mot de passe du compte API INPI |
| `INPI_MAX_REQUESTS_PER_MINUTE` | Non | Limite de requêtes/min (défaut : 30) |
| `INPI_MAX_REQUESTS_PER_HOUR` | Non | Limite de requêtes/h (défaut : 500) |
| `PORT` | Non | Port HTTP pour le transport expérimental (défaut : 3000) |

Pour le déploiement Vercel uniquement :

| Variable | Requis | Description |
|---|---|---|
| `OAUTH_TOKEN_SECRET` | Oui | Secret servant à chiffrer les tokens OAuth (ex : `openssl rand -hex 32`). Sa rotation invalide tous les tokens émis. |

## Exemples d'utilisation

> Vérifie si le nom "FreshMeal" est déjà déposé comme marque en classe 43.

> Donne-moi les détails de la marque FR4216963.

## Couverture et extensions

La couverture de l'API Propriété industrielle par ce serveur MCP est **actuellement limitée** : elle ne couvre ni les brevets, ni les dessins et modèles, et ne couvre les marques que partiellement.

Vous souhaitez étendre cette couverture ou intégrer d'autres sources de données PI dans vos workflows ? Je peux réaliser cette extension sous forme de **prestation sur mesure**, et je propose également la **conception de workflows Claude (Skills) adaptés à votre métier**.

Contactez-moi : [guillaume.duveau@gmail.com](mailto:guillaume.duveau@gmail.com)

## Avertissement

Les résultats fournis par cet outil sont **indicatifs** et ne constituent pas un avis juridique. Consultez un conseil en propriété industrielle pour toute décision relative au dépôt ou à l'utilisation d'une marque.

## Licence

MIT

---

# mcp-inpi-pi (English)

[MCP](https://modelcontextprotocol.io/) server for searching French, European and international trademarks via the [INPI](https://data.inpi.fr) API (French National Institute of Industrial Property).

> **This project is independent and is not affiliated with, endorsed by, or sponsored by INPI.**

See French documentation above for setup instructions. The INPI API requires a free account on [data.inpi.fr](https://data.inpi.fr).

Coverage of the Industrial Property API is **currently limited**: patents and designs are not covered, and trademark coverage is partial. Need to extend coverage or integrate other IP data sources into your workflows? I offer **custom development** and **Claude workflow design (Skills) tailored to your business**.

Contact: [guillaume.duveau@gmail.com](mailto:guillaume.duveau@gmail.com)
