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
# Auth ProjeQtOr : bearer OU (username + password). Bearer gagne si les deux sont fournis.
PROJEQTOR_BEARER_TOKEN=
PROJEQTOR_USERNAME=api_user
PROJEQTOR_PASSWORD=secret
# Requis seulement pour les écritures (PUT/POST/DELETE) chiffrées AES.
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
Au moins une auth est obligatoire : `PROJEQTOR_BEARER_TOKEN`, ou `PROJEQTOR_USERNAME` + `PROJEQTOR_PASSWORD`.

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

## Mise à disposition des agents (Claude Code / Codex / deepagents)

Le serveur est un serveur MCP standard : il n'y a rien à réécrire pour chaque
agent, seulement à le configurer. Deux modes, fichiers prêts dans
[`clients/`](clients/) et [`deploy/`](deploy/).

> ⚠️ **Sécurité** — Le transport HTTP n'a aucune auth MCP intégrée
> (`stateless_http`). Quiconque atteint l'URL pilote ProjeQtOr avec les
> credentials du serveur. Le mode A ci-dessous ajoute un gateway qui exige un
> `GATE_TOKEN`. Ce `GATE_TOKEN` (auth agent → endpoint) est **distinct** du
> `PROJEQTOR_BEARER_TOKEN` (auth serveur → API ProjeQtOr).

### A — Serveur HTTP distant (aucun clone côté agent)

Déployé une fois derrière un proxy d'auth ; les agents pointent l'URL.
Les credentials ProjeQtOr restent côté serveur.

```bash
cd deploy
cp .env.example .env        # renseigner GATE_TOKEN + PROJEQTOR_*
docker compose up -d --build
# endpoint exposé : http://<host>:8080/mcp  (mettre derrière HTTPS en prod)
```

Branchement des clients :

```bash
# Claude Code
claude mcp add --transport http projeqtor https://ton-host:8080/mcp \
  --header "Authorization: Bearer GATE_TOKEN"
```

```toml
# Codex — ~/.codex/config.toml
[mcp_servers.projeqtor]
url = "https://ton-host:8080/mcp"
http_headers = { Authorization = "Bearer GATE_TOKEN" }
```

```python
# deepagents — cf. clients/deepagents/run_agent.py
MultiServerMCPClient({"projeqtor": {
    "transport": "streamable_http",
    "url": "https://ton-host:8080/mcp",
    "headers": {"Authorization": "Bearer GATE_TOKEN"},
}})
```

### B — Exécution locale depuis GitHub (sans `git clone` manuel)

`uvx` récupère et exécute le paquet directement depuis le dépôt (cache, pas de
clone manuel). Chaque agent s'exécute en local et fournit ses credentials.

```bash
uvx --from git+https://github.com/CouLiBaLy-B/server-mcp-ipmp.git projeqtor-mcp-server-python
```

Configs prêtes : [`clients/claude-code/.mcp.json`](clients/claude-code/.mcp.json),
[`clients/codex/config.toml`](clients/codex/config.toml),
[`clients/deepagents/run_agent.py`](clients/deepagents/run_agent.py)
(garder le bloc `*-uvx`). Dépôt privé → `uvx` utilise l'auth git locale (SSH/token).

| Besoin | Mode |
| --- | --- |
| Serveur central, agents légers, credentials centralisés | **A (HTTP)** |
| Pas de serveur à gérer, credentials par agent | **B (uvx git)** |

## Méthodes d'utilisation par client

Chaque client a un fichier de config prêt dans [`clients/`](clients/). Choisir le
mode **A** (HTTP distant) ou **B** (uvx local) selon le tableau ci-dessus, puis
remplacer les placeholders (`ton-host`, `GATE_TOKEN`, `PROJEQTOR_*`, `...`).

### Claude Code

Fichier prêt : [`clients/claude-code/.mcp.json`](clients/claude-code/.mcp.json)
(contient les deux blocs `projeqtor-remote` et `projeqtor-uvx`).

**Option 1 — fichier projet.** Copier `.mcp.json` à la racine du projet, garder le
bloc voulu, renseigner les valeurs. Claude Code le détecte au lancement.

```bash
cp clients/claude-code/.mcp.json ./.mcp.json
# éditer ./.mcp.json puis lancer `claude` dans ce dossier
```

**Option 2 — via CLI.**

```bash
# Mode A (HTTP distant)
claude mcp add --transport http projeqtor https://ton-host:8080/mcp \
  --header "Authorization: Bearer GATE_TOKEN"

# Mode B (uvx local)
claude mcp add projeqtor \
  --env MCP_TRANSPORT=stdio \
  --env PROJEQTOR_BASE_URL=https://mon-instance.projeqtor.com \
  --env PROJEQTOR_BEARER_TOKEN=... \
  --env PROJEQTOR_API_KEY=... \
  -- uvx --from git+https://github.com/CouLiBaLy-B/server-mcp-ipmp.git projeqtor-mcp-server-python
```

Vérifier : `claude mcp list`, ou la commande `/mcp` dans une session Claude Code.

### Codex

Fichier prêt : [`clients/codex/config.toml`](clients/codex/config.toml). Coller **un
seul** bloc dans `~/.codex/config.toml`.

```toml
# Mode A — HTTP distant
[mcp_servers.projeqtor]
url = "https://ton-host:8080/mcp"
http_headers = { Authorization = "Bearer GATE_TOKEN" }

# Mode B — uvx local
[mcp_servers.projeqtor]
command = "uvx"
args = ["--from", "git+https://github.com/CouLiBaLy-B/server-mcp-ipmp.git", "projeqtor-mcp-server-python"]
env = { MCP_TRANSPORT = "stdio", PROJEQTOR_BASE_URL = "https://mon-instance.projeqtor.com", PROJEQTOR_BEARER_TOKEN = "...", PROJEQTOR_API_KEY = "...", PROJEQTOR_AES_KEY_LENGTH = "128" }
```

Relancer Codex ; les tools `projeqtor` apparaissent dans la liste MCP.

### deepagents (LangChain)

Script prêt : [`clients/deepagents/run_agent.py`](clients/deepagents/run_agent.py).

```bash
pip install deepagents langchain-mcp-adapters
# éditer run_agent.py : choisir SERVER_REMOTE (A) ou SERVER_UVX (B)
python clients/deepagents/run_agent.py
```

Le script charge les tools MCP, les convertit en `BaseTool` LangChain et lance un
`create_deep_agent`. Adapter `model=` au provider voulu.

### Claude Desktop / Cursor / VS Code Copilot

Clients à transport `stdio`. Utiliser le bloc JSON ci-dessous (section
[Configuration Claude Desktop](#configuration-claude-desktop)) en pointant soit le
binaire local installé (`pip install -e .`), soit `uvx` (mode B) comme commande.

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
