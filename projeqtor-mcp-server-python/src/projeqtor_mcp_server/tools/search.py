from __future__ import annotations

from datetime import datetime
from typing import Any, Annotated

from pydantic import Field
from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import criteria_from_dicts, safe
from projeqtor_mcp_server.utils.dates import days_ago, format_projeqtor_timestamp

DEFAULT_CLASSES = ["Project", "Activity", "Ticket", "Milestone", "Risk", "Opportunity", "Action", "Issue", "Question", "Decision", "Meeting", "Resource", "Document", "Requirement", "TestCase", "TestSession"]


def register_search_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register cross-cutting search tools."""

    @mcp.tool(description="Recherche globale multi-entités. Par défaut recherche name LIKE query dans les classes principales.")
    async def global_search(query: str, classes: list[str] | None = None, criteria: list[dict[str, Any]] | None = None) -> Any:
        async def run() -> dict[str, Any]:
            selected = classes or DEFAULT_CLASSES
            extra = criteria_from_dicts(criteria or [])
            out: dict[str, Any] = {}
            for klass in selected:
                out[klass] = await safe(client.search(klass, [SearchCriterion("name", query, "LIKE"), *extra]))
            return out
        return await safe(run())

    @mcp.tool(description="Objets modifiés récemment via /updated/{from}/{to}. Utile pour standup et synthèse de changements.")
    async def get_recent_changes(days: Annotated[int, Field(gt=0)] = 7, classes: list[str] | None = None) -> Any:
        async def run() -> dict[str, Any]:
            from_ts = format_projeqtor_timestamp(days_ago(days))
            to_ts = format_projeqtor_timestamp(datetime.now())
            selected = classes or ["Project", "Activity", "Ticket", "Risk", "Issue", "Meeting", "Document"]
            return {"from": from_ts, "to": to_ts, "results": {klass: await safe(client.updated(klass, from_ts, to_ts)) for klass in selected}}
        return await safe(run())
