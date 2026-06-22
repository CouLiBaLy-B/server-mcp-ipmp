from __future__ import annotations

import logging

from mcp.server.fastmcp import FastMCP

from src.projeqtor_mcp_server import __version__
from src.projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient
from src.projeqtor_mcp_server.config import Settings
from src.projeqtor_mcp_server.prompts import (
    register_project_status_report_prompt,
    register_resource_optimization_prompt,
    register_risk_analysis_prompt,
    register_sprint_review_prompt,
)
from src.projeqtor_mcp_server.resources import (
    register_dashboard_resources,
    register_project_summary_resources,
    register_reference_resources,
)
from src.projeqtor_mcp_server.tools import (
    register_activity_tools,
    register_document_tools,
    register_financial_tools,
    register_meeting_tools,
    register_project_tools,
    register_resource_tools,
    register_risk_tools,
    register_search_tools,
    register_ticket_tools,
)

INSTRUCTIONS = """
Serveur MCP ProjeQtOr v2 Python. Utilise les tools pour lire et écrire les données de gestion de projet.
Les lectures sont sûres. Les écritures chiffrent le payload JSON avec AES-CTR via la clé API utilisateur ProjeQtOr.
Ne jamais demander ni exposer les credentials. Les erreurs sont nettoyées pour être exploitables par un agent IA.
""".strip()


def create_server(settings: Settings, logger: logging.Logger) -> FastMCP:
    """Create a fully wired ProjeQtOr MCP FastMCP server."""
    mcp = FastMCP(
        name=f"projeqtor-mcp-server-python-v{__version__}",
        instructions=INSTRUCTIONS,
        log_level=settings.log_level,
        host=settings.mcp_http_host,
        port=settings.mcp_http_port,
        streamable_http_path="/mcp",
        stateless_http=True,
        json_response=False,
    )
    client = ProjeQtOrApiClient(settings, logger)

    register_project_tools(mcp, client)
    register_activity_tools(mcp, client)
    register_ticket_tools(mcp, client)
    register_resource_tools(mcp, client)
    register_risk_tools(mcp, client)
    register_financial_tools(mcp, client)
    register_document_tools(mcp, client)
    register_meeting_tools(mcp, client)
    register_search_tools(mcp, client)

    register_project_summary_resources(mcp, client)
    register_dashboard_resources(mcp, client)
    register_reference_resources(mcp, client)

    register_project_status_report_prompt(mcp)
    register_risk_analysis_prompt(mcp)
    register_resource_optimization_prompt(mcp)
    register_sprint_review_prompt(mcp)

    return mcp
