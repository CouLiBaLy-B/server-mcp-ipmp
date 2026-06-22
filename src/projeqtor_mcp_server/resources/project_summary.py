from __future__ import annotations

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from src.projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from src.projeqtor_mcp_server.tools.common import safe


def register_project_summary_resources(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register project summary resource templates."""

    @mcp.resource("projeqtor://projects/{id}/summary")
    async def project_summary(id: str) -> str:
        """Résumé consolidé d'un projet: projet, activités, tickets, risques, issues, work."""
        data: dict[str, Any] = {
            "project": await safe(client.get_object("Project", id)),
            "activities": await safe(client.search("Activity", [SearchCriterion("idProject", id)])),
            "tickets": await safe(client.search("Ticket", [SearchCriterion("idProject", id)])),
            "risks": await safe(client.search("Risk", [SearchCriterion("idProject", id)])),
            "issues": await safe(client.search("Issue", [SearchCriterion("idProject", id)])),
            "work": await safe(client.search("Work", [SearchCriterion("idProject", id)])),
        }
        return json.dumps(data, ensure_ascii=False, indent=2)
