from __future__ import annotations

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import safe


def register_reference_resources(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register reference data resources."""

    @mcp.resource("projeqtor://reference/statuses")
    async def reference_statuses() -> str:
        """Liste des statuts ProjeQtOr."""
        return json.dumps(await safe(client.list_all("Status")), ensure_ascii=False, indent=2)

    @mcp.resource("projeqtor://reference/types")
    async def reference_types() -> str:
        """Types projet/activité/ticket et priorités."""
        data: dict[str, Any] = {
            "projectTypes": await safe(client.list_all("ProjectType")),
            "activityTypes": await safe(client.list_all("ActivityType")),
            "ticketTypes": await safe(client.list_all("TicketType")),
            "priorities": await safe(client.list_all("Priority")),
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    @mcp.resource("projeqtor://resources/{id}/availability")
    async def resource_availability(id: str) -> str:
        """Disponibilité d'une ressource: affectations, work logs, congés."""
        data: dict[str, Any] = {
            "resource": await safe(client.get_object("Resource", id)),
            "assignments": await safe(client.search("Assignment", [SearchCriterion("idResource", id)])),
            "work": await safe(client.search("Work", [SearchCriterion("idResource", id)])),
            "leaves": await safe(client.search("LeavePeriod", [SearchCriterion("idResource", id)])),
        }
        return json.dumps(data, ensure_ascii=False, indent=2)
