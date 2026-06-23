from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import safe
from projeqtor_mcp_server.utils.dates import days_ago, format_projeqtor_timestamp


def register_dashboard_resources(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register dashboard overview resource."""

    @mcp.resource("projeqtor://dashboard/overview")
    async def dashboard_overview() -> str:
        """Vue d'ensemble portefeuille tous projets."""
        from_ts = format_projeqtor_timestamp(days_ago(7))
        to_ts = format_projeqtor_timestamp(datetime.now())
        data: dict[str, Any] = {
            "projects": await safe(client.list_all("Project")),
            "openTickets": await safe(client.search("Ticket", [SearchCriterion("idle", 0)])),
            "activeRisks": await safe(client.search("Risk", [SearchCriterion("idle", 0)])),
            "recentActivities": await safe(client.updated("Activity", from_ts, to_ts)),
        }
        return json.dumps(data, ensure_ascii=False, indent=2)
