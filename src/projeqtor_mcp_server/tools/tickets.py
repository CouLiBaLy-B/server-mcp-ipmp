from __future__ import annotations

from typing import Any, Annotated

from pydantic import Field
from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import Id, IdField, criteria_from_dicts, merge_extra, safe


def register_ticket_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register ticket tools."""

    @mcp.tool(description="Lister les tickets avec filtres optionnels: projet, statut, priorité, responsable.")
    async def list_tickets(project_id: Id | None = None, status_id: Id | None = None, priority_id: Id | None = None, resource_id: Id | None = None) -> Any:
        criteria = []
        if project_id is not None:
            criteria.append(SearchCriterion("idProject", project_id))
        if status_id is not None:
            criteria.append(SearchCriterion("idStatus", status_id))
        if priority_id is not None:
            criteria.append(SearchCriterion("idPriority", priority_id))
        if resource_id is not None:
            criteria.append(SearchCriterion("idResource", resource_id))
        return await safe(client.search("Ticket", criteria) if criteria else client.list_all("Ticket"))

    @mcp.tool(description="Créer un ticket ProjeQtOr bug/support. Payload chiffré AES-CTR.")
    async def create_ticket(name: str, id_project: Id | None = None, id_ticket_type: Id | None = None, id_status: Id | None = None, id_priority: Id | None = None, id_resource: Id | None = None, description: str | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"name": name, "idProject": id_project, "idTicketType": id_ticket_type, "idStatus": id_status, "idPriority": id_priority, "idResource": id_resource, "description": description}, extra)
        return await safe(client.create("Ticket", payload))

    @mcp.tool(description="Mettre à jour un ticket: statut, priorité, affectation ou champs natifs.")
    async def update_ticket(id: Annotated[Id, IdField], updates: dict[str, Any]) -> Any:
        return await safe(client.update("Ticket", {"id": id, **updates}))

    @mcp.tool(description="Recherche avancée de tickets via critères SQL-like: [{field, operator, value}].")
    async def search_tickets(criteria: Annotated[list[dict[str, Any]], Field(description="Critères: field, operator, value")]) -> Any:
        return await safe(client.search("Ticket", criteria_from_dicts(criteria)))
