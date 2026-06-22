# ProjeQtOr MCP Server

Serveur **Model Context Protocol (MCP)** production-ready pour connecter Claude Desktop, Cursor, VS Code Copilot et tout agent compatible MCP à une instance **ProjeQtOr 12.x**.

- Langage : TypeScript / Node.js ≥ 18
- SDK : `@modelcontextprotocol/sdk`
- Transports : stdio local et Streamable HTTP distant
- Validation : Zod
- Écriture ProjeQtOr : payload JSON chiffré AES-CTR
- Logs : stderr uniquement, compatible stdio

## Installation

```bash
git clone <repo> projeqtor-mcp-server
cd projeqtor-mcp-server
npm install
npm run build
```

## Configuration

Copiez `.env.example` ou fournissez les variables via votre lanceur MCP :

```env
PROJEQTOR_BASE_URL=https://mon-instance.projeqtor.com
PROJEQTOR_USERNAME=api_user
PROJEQTOR_PASSWORD=secret
PROJEQTOR_API_KEY=ma_cle_api_aes
PROJEQTOR_AES_KEY_LENGTH=128
MCP_TRANSPORT=stdio
MCP_HTTP_PORT=3000
LOG_LEVEL=info
```

> `PROJEQTOR_BASE_URL` ne doit pas inclure `/api` ; le serveur ajoute ce préfixe.

## Démarrage

### Stdio local

```bash
MCP_TRANSPORT=stdio node build/index.js
```

### Streamable HTTP

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 node build/index.js
curl http://localhost:3000/health
```

Endpoint MCP : `POST http://localhost:3000/mcp`.

## Configuration Claude Desktop

```json
{
  "mcpServers": {
    "projeqtor": {
      "command": "node",
      "args": ["/chemin/vers/projeqtor-mcp-server/build/index.js"],
      "env": {
        "PROJEQTOR_BASE_URL": "https://mon-instance.projeqtor.com",
        "PROJEQTOR_USERNAME": "api_user",
        "PROJEQTOR_PASSWORD": "secret",
        "PROJEQTOR_API_KEY": "ma_cle_api",
        "PROJEQTOR_AES_KEY_LENGTH": "128",
        "MCP_TRANSPORT": "stdio",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Outils MCP inclus

### Projets
- `list_projects` : liste les projets, filtres optionnels statut/type.
- `get_project` : détail d'un projet.
- `create_project` : crée un projet.
- `update_project` : met à jour un projet.
- `get_project_kpis` : données consolidées pour avancement, coût, délai.

### Activités & planning
- `list_activities`
- `create_activity`
- `update_activity`
- `get_gantt_data`
- `add_dependency`
- `get_project_planning_snapshot`

### Tickets
- `list_tickets`
- `create_ticket`
- `update_ticket`
- `search_tickets`

### Ressources & temps
- `list_resources`
- `assign_resource`
- `get_resource_workload`
- `log_work`
- `get_timesheet`

### Risques, finance, documents, réunions, recherche
- `list_risks`, `create_risk`, `list_issues`
- `get_project_budget`, `create_expense`
- `list_documents`, `create_document_record`
- `list_meetings`, `create_meeting`, `list_decisions`
- `global_search`, `get_recent_changes`

Total : plus de 30 outils MCP.

## Resources MCP

- `projeqtor://projects/{id}/summary`
- `projeqtor://dashboard/overview`
- `projeqtor://reference/statuses`
- `projeqtor://reference/types`
- `projeqtor://resources/{id}/availability`

## Prompts MCP

- `project_status_report`
- `risk_analysis`
- `resource_optimization`
- `sprint_review_summary`

## Exemples d'usage côté agent

- « Liste les tickets critiques ouverts du projet 42. » → `list_tickets`
- « Crée une activité de recette dans le projet 42 pour 3 jours. » → `create_activity`
- « Donne-moi un rapport d'avancement du projet 42 cette semaine. » → prompt `project_status_report` + resource summary.
- « Qui est surchargé entre le 1er et le 15 juillet ? » → `list_resources` puis `get_resource_workload`.

## Chiffrement AES-CTR

Les opérations d'écriture (`PUT`, `POST`, `DELETE`) chiffrent le JSON métier avec AES-CTR en utilisant `PROJEQTOR_API_KEY` et `PROJEQTOR_AES_KEY_LENGTH` (128, 192 ou 256). L'enveloppe envoyée est :

```json
{ "data": "base64(iv):base64(ciphertext)" }
```

Certaines installations ProjeQtOr personnalisées peuvent attendre un format d'enveloppe différent. Dans ce cas, adaptez uniquement `src/client/aes-ctr.ts` ou la méthode `write()` de `src/client/projeqtor-api.ts`.

## Sécurité et exploitation

- Aucun credential n'est retourné via MCP.
- Le logger masque mots de passe, API keys, tokens et authorization headers.
- En mode stdio, les logs utilisent `console.error()` exclusivement afin de ne jamais corrompre stdout JSON-RPC.
- Retry avec backoff exponentiel sur timeout, HTTP 429 et erreurs 5xx.
- Les erreurs MCP sont nettoyées : pas de stack trace brute.

## Docker

```bash
docker build -t projeqtor-mcp-server .
docker run --rm -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e PROJEQTOR_BASE_URL=https://mon-instance.projeqtor.com \
  -e PROJEQTOR_USERNAME=api_user \
  -e PROJEQTOR_PASSWORD=secret \
  -e PROJEQTOR_API_KEY=ma_cle_api \
  projeqtor-mcp-server
```

## Développement

```bash
npm run dev
npm run typecheck
npm test
```

## Notes ProjeQtOr

Le serveur utilise les endpoints standards :

- `GET /api/{ObjectClass}/{id}`
- `GET /api/{ObjectClass}/all`
- `GET /api/{ObjectClass}/search/{criteria...}`
- `GET /api/{ObjectClass}/updated/{from}/{to}`
- `PUT|POST|DELETE /api/{ObjectClass}` avec payload chiffré

Les noms de champs (`idProject`, `idStatus`, `plannedStartDate`, etc.) suivent les conventions ProjeQtOr usuelles. Les instances personnalisées peuvent utiliser `extra`/`updates` pour transmettre des champs natifs additionnels.
