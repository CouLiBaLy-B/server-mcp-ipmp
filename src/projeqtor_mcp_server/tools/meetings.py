from __future__ import annotations

from typing import Any, Annotated

from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import Id, IdField, merge_extra, safe


def register_meeting_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register meeting, decision and question tools."""

    @mcp.tool(description="Lister les réunions, optionnellement pour un projet et depuis une date.")
    async def list_meetings(project_id: Id | None = None, since: str | None = None) -> Any:
        criteria = []
        if project_id is not None:
            criteria.append(SearchCriterion("idProject", project_id))
        if since is not None:
            criteria.append(SearchCriterion("meetingDate", since, ">="))
        return await safe(client.search("Meeting", criteria) if criteria else client.list_all("Meeting"))

    @mcp.tool(description="Créer une réunion avec date, projet et ordre du jour/description.")
    async def create_meeting(name: str, meeting_date: str, project_id: Id | None = None, description: str | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"name": name, "meetingDate": meeting_date, "idProject": project_id, "description": description}, extra)
        return await safe(client.create("Meeting", payload))

    @mcp.tool(description="Lister les décisions et questions d'un projet pour le suivi de gouvernance.")
    async def list_decisions(project_id: Annotated[Id, IdField]) -> Any:
        async def run() -> dict[str, Any]:
            return {
                "decisions": await safe(client.search("Decision", [SearchCriterion("idProject", project_id)])),
                "questions": await safe(client.search("Question", [SearchCriterion("idProject", project_id)])),
            }
        return await safe(run())
