# mcp-inpi-pi

Serveur MCP qui expose l'API Propriété industrielle de l'INPI. Recherche de marques françaises (FR), européennes (EU) et internationales (WO), classes de Nice, statut, titulaire.

## Stack

- TypeScript, Node.js ≥ 18
- `@modelcontextprotocol/sdk` (SDK officiel MCP)
- Transport : stdio (défaut), Streamable HTTP expérimental (`src/index-http.ts`)
- Build : tsup
- Tests : vitest
- Lint : eslint + prettier
- HTTP : fetch natif (Node 18+) — pas de dépendance externe pour HTTP

## API INPI

Base URL : `https://api-gateway.inpi.fr/services/apidiffusion/api/marques/`

### Auth (hybride XSRF + Bearer JWT)

Flow validé en production. 2 étapes :

**1. Obtenir le XSRF token :**
```
GET https://api-gateway.inpi.fr/services/uaa/api/authenticate
→ HTTP 401 (normal) + Set-Cookie : XSRF-TOKEN=...
```
⚠️ L'endpoint retourne 401 MAIS pose quand même le cookie XSRF-TOKEN. Ne pas lever d'erreur sur ce 401 — extraire le cookie directement.

**2. Login → JWT + cookies de session :**
```
POST https://api-gateway.inpi.fr/auth/login
Headers :
  Content-Type: application/json
  Accept: application/json, text/plain, */*
  X-XSRF-TOKEN: {xsrf}
  Cookie: XSRF-TOKEN={xsrf}
Body : {"username":"...", "password":"...", "rememberMe":true}
→ JSON : { "access_token": "jwt..." }
→ Set-Cookie : access_token=...; refresh_token=...
```
Capturer les cookies `access_token` et `refresh_token` posés par le login.

**Requêtes authentifiées :**
```
Headers :
  Authorization: Bearer {access_token}
  X-XSRF-TOKEN: {xsrf}
  Content-Type: application/json
  Accept: application/xml          ← search retourne XML, pas JSON
  Cookie: XSRF-TOKEN={xsrf}; access_token={...}; refresh_token={...}
```
⚠️ Le header `Cookie` est obligatoire sur toutes les requêtes API — le serveur valide le XSRF token contre la session. Sans cookie, réponse 403 "session not found".

`INPISession` stocke `{ xsrfToken, accessToken, sessionCookie }` où `sessionCookie` est le header Cookie complet à renvoyer.

Timeout recommandé : 15s. Credentials via env vars `INPI_USERNAME` et `INPI_PASSWORD`.

### Endpoints

| Endpoint | Méthode | Réponse | Description |
|---|---|---|---|
| `/search` | POST | XML | Recherche multicritères (SolR) |
| `/notice/{num}` | GET | XML | Notice complète d'une marque |
| `/bopi/{num}` | GET | PDF | Pages du BOPI |
| `/metadata` | GET | JSON | Infos de mise à jour |

Les chemins sont relatifs à la Base URL (ne pas dupliquer `/marques/`).

Pas d'endpoint séparé pour classes, événements ou titulaires — tout est dans la notice XML.

### Search — Syntaxe SolR

POST `/search` avec body JSON (chemin relatif à la BASE_URL, pas de `/marques/` dupliqué) :

```json
{
  "collections": ["FR", "EU", "WO"],
  "query": "[Mark=FRESHMEAL]",
  "size": 50
}
```

Paramètres : `collections` (obligatoire), `query` (obligatoire, syntaxe SolR), `fields`, `position` (défaut 0, max 500), `size` (défaut 20, max 200), `sort` (APPLICATION_DATE par défaut).

**Index de recherche :**

| Index | Usage | Exemple | Statut |
|---|---|---|---|
| `Mark` | Nom de marque (simple) | `[Mark=FRESHMEAL]` | **Validé** |
| `Mark_Exp` | Nom exact / commence par | `[Mark_Exp=archidat*]` | Doc PDF, à tester |
| `NGram_Mark` | Contient | `[NGram_Mark=chidat]` | Doc PDF, à tester |
| `ApplicationNumber` | N° de marque | `[ApplicationNumber=4216963]` | Doc PDF |
| `ClassNumber` | Classes de Nice | `[ClassNumber=(9 OU 16)]` | Doc PDF |
| `DEPOSANT` | Nom déposant | `[DEPOSANT=INPI]` | Doc PDF |
| `DEPOTIT` | Nom titulaire | `[DEPOTIT=INPI]` | Doc PDF |
| `ApplicantIdentifier` | SIREN (FR only) | `[ApplicantIdentifier=10080012]` | Doc PDF |
| `ApplicationDate` | Date de dépôt | `[ApplicationDate=20150707]` | Doc PDF |
| `ExpiryDate` | Marques en vigueur | `[ExpiryDate=20260402:99991231]` | Doc PDF |

**IMPORTANT** : le terme doit être en MAJUSCULES (`.toUpperCase()`).

Opérateurs : `ET`, `OU`, `SAUF`. Jokers : `?` (0-1 char), `*` (0-n chars).

**Réponse search : XML** (pas JSON). Format :
```xml
<trademarkSearch>
  <metadata><count>19</count><position>0</position><size>3</size></metadata>
  <results>
    <result documentId="4773435">
      <fields>
        <field name="ApplicationNumber"><value>4773435</value></field>
        <field name="Mark"><value>Jouve</value></field>
        <field name="MarkCurrentStatusCode"><value>Marque enregistrée</value></field>
        <field name="DEPOSANT"><value>Madame Florence Jouve</value></field>
        <field name="ukey"><value>FMARK|4773435</value></field>
      </fields>
    </result>
  </results>
</trademarkSearch>
```
La collection (FR/EU/WO) se déduit du préfixe du champ `ukey` (`FMARK` → FR, `CTMMARK`/`EUMARK` → EU, `WOMARK` → WO).

## Tools MCP

### search_trademarks

Recherche de marques. Traduit les paramètres utilisateur en requête SolR en coulisses.

Input :
- `query` (string, requis) — nom ou terme à rechercher
- `nice_classes` (number[]) — filtrer par classes de Nice 1-45
- `collections` (string[], défaut ["FR","EU","WO"]) — périmètre géographique
- `active_only` (boolean, défaut true) — ne retourner que les marques en vigueur
- `holder` (string) — filtrer par nom déposant/titulaire
- `limit` (number, défaut 20, max 200)

### get_trademark_details

Notice complète d'une marque. Parse XML → JSON plat.

Input :
- `trademark_number` (string, requis) — ex: FR4216963, EU018456789

## Resource MCP

`nice-classes://list` — classification de Nice, 45 classes, données embarquées (pas d'endpoint INPI).

## Disclaimers

Chaque réponse de tool doit inclure :
- Juridique : "Cette analyse est indicative et ne constitue pas un avis juridique. Consultez un conseil en propriété industrielle."
- Non-affiliation : "Ce projet est indépendant et n'est ni affilié, ni approuvé, ni sponsorisé par l'INPI."

## Sanitization des réponses (token economy)

L'API INPI retourne du JSON/XML verbeux. Ne PAS relayer brut au LLM.

- Filtrer : ne retourner que les champs utiles (nom, classes, statut, titulaire, dates)
- Aplatir : structures imbriquées → objets plats
- Paginer : listes longues → N premiers + count total
- Types stricts : `api/types.ts` = contrat LLM-facing, pas les types bruts INPI

## Rate limiting interne

Token bucket paramétrable via env vars :
- `INPI_MAX_REQUESTS_PER_MINUTE` (défaut 30)
- `INPI_MAX_REQUESTS_PER_HOUR` (défaut 500)
- Requêtes cachées exclues du budget
- Quand la limite est atteinte → erreur MCP explicite avec temps d'attente estimé

