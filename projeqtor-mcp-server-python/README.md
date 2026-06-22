# ProjeQtOr MCP Server v2 — Python

Version Python production-ready d'un serveur **Model Context Protocol (MCP)** pour connecter Claude Desktop, Cursor, VS Code Copilot ou tout client MCP à une instance **ProjeQtOr 12.x**.

## Fonctionnalités

- Python ≥ 3.11
- SDK officiel `mcp` avec `FastMCP`
- Transports :
  - `stdio` pour Claude Desktop/local
  - `streamable-http` pour usage distant
- Client REST ProjeQtOr async basé sur `httpx`
- Authentification HTTP Basic
- Écritures `PUT` / `POST` / `DELETE` avec payload JSON chiffré **AES-CTR**
- Validation automatique des inputs via annotations/Pydantic/FastMCP
- Logs JSON vers `stderr` uniquement pour préserver stdout JSON-RPC en stdio
- Retry avec backoff exponentiel sur timeouts, 429 et 5xx
- Erreurs nettoyées, sans stack traces ni credentials

## Arborescence

```text
projeqtor-mcp-server-python/
├── pyproject.toml
├── Dockerfile
├── .env.example
├── README.md
├── src/projeqtor_mcp_server/
│   ├── __main__.py
│   ├── server.py
│   ├── config.py
│   ├── client/
│   │   ├── aes_ctr.py
│   │   └── projeqtor_api.py
│   ├── tools/
│   │   ├── projects.py
│   │   ├── activities.py
│   │   ├── tickets.py
│   │   ├── resources.py
│   │   ├── risks.py
│   │   ├── financial.py
│   │   ├── documents.py
│   │   ├── meetings.py
│   │   └── search.py
│   ├── resources/
│   │   ├── project_summary.py
│   │   ├── dashboard.py
│   │   └── reference_data.py
│   ├── prompts/
│   │   ├── project_status_report.py
│   │   ├── risk_analysis.py
│   │   ├── resource_optimization.py
│   │   └── sprint_review.py
│   └── utils/
│       ├── logger.py
│       ├── errors.py
│       └── dates.py
└── tests/
```

## Installation

```bash
cd projeqtor-mcp-server-python
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Pour le développement :

```bash
pip install -e '.[dev]'
pytest
ruff check .
```

## Configuration

Copier `.env.example` en `.env` ou fournir les variables via le client MCP :

```env
PROJEQTOR_BASE_URL=https://mon-instance.projeqtor.com
PROJEQTOR_USERNAME=api_user
PROJEQTOR_PASSWORD=secret
PROJEQTOR_API_KEY=ma_cle_api_aes
PROJEQTOR_AES_KEY_LENGTH=128
MCP_TRANSPORT=stdio
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3000
LOG_LEVEL=INFO
PROJEQTOR_TIMEOUT_SECONDS=30
PROJEQTOR_RETRY_ATTEMPTS=3
PROJEQTOR_RETRY_BASE_DELAY_SECONDS=0.3
```

`PROJEQTOR_BASE_URL` peut être fourni avec ou sans `/api`; le serveur normalise l'URL.

## Lancement

### Mode stdio local

```bash
MCP_TRANSPORT=stdio projeqtor-mcp-server-python
```

### Mode Streamable HTTP

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 projeqtor-mcp-server-python
```

Endpoint MCP :

```text
POST http://localhost:3000/mcp
```

## Configuration Claude Desktop

```json
{
  "mcpServers": {
    "projeqtor-python": {
      "command": "/chemin/vers/projeqtor-mcp-server-python/.venv/bin/projeqtor-mcp-server-python",
      "env": {
        "PROJEQTOR_BASE_URL": "https://mon-instance.projeqtor.com",
        "PROJEQTOR_USERNAME": "api_user",
        "PROJEQTOR_PASSWORD": "secret",
        "PROJEQTOR_API_KEY": "ma_cle_api",
        "PROJEQTOR_AES_KEY_LENGTH": "128",
        "MCP_TRANSPORT": "stdio",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## Tools MCP inclus

### Projets

- `list_projects`
- `get_project`
- `create_project`
- `update_project`
- `get_project_kpis`

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

### Risques & suivi

- `list_risks`
- `create_risk`
- `list_issues`

### Finance

- `get_project_budget`
- `create_expense`

### Documents, réunions, recherche

- `list_documents`
- `create_document_record`
- `list_meetings`
- `create_meeting`
- `list_decisions`
- `global_search`
- `get_recent_changes`

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

## Chiffrement AES-CTR

Les écritures envoient l'enveloppe :

```json
{
  "data": "base64(iv):base64(ciphertext)"
}
```

Le JSON métier est chiffré avec AES-CTR. La clé AES est dérivée de `PROJEQTOR_API_KEY` via SHA-256 et tronquée à 128, 192 ou 256 bits selon `PROJEQTOR_AES_KEY_LENGTH`.

Si votre instance ProjeQtOr attend une enveloppe différente, adaptez uniquement :

```text
src/projeqtor_mcp_server/client/aes_ctr.py
src/projeqtor_mcp_server/client/projeqtor_api.py::_write
```

## Docker

```bash
docker build -t projeqtor-mcp-server-python:v2 .
docker run --rm -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e PROJEQTOR_BASE_URL=https://mon-instance.projeqtor.com \
  -e PROJEQTOR_USERNAME=api_user \
  -e PROJEQTOR_PASSWORD=secret \
  -e PROJEQTOR_API_KEY=ma_cle_api \
  projeqtor-mcp-server-python:v2
```

## Sécurité

- Les credentials ne sont jamais retournés via MCP.
- Les logs masquent mots de passe, clés API, tokens et Authorization headers.
- En stdio, aucun log n'est écrit vers stdout.
- Les erreurs retournées aux agents sont lisibles et sans stack trace brute.

## Notes de compatibilité ProjeQtOr

Le serveur cible les endpoints standards :

- `GET /api/{ObjectClass}/{id}`
- `GET /api/{ObjectClass}/all`
- `GET /api/{ObjectClass}/filter/{filterId}`
- `GET /api/{ObjectClass}/search/{criteria...}`
- `GET /api/{ObjectClass}/updated/{from}/{to}`
- `PUT|POST|DELETE /api/{ObjectClass}` avec payload chiffré

Les champs sont transmis avec les noms natifs ProjeQtOr usuels (`idProject`, `idStatus`, `plannedStartDate`, etc.). Les paramètres `extra` et `updates` permettent de passer les champs spécifiques à votre instance.
