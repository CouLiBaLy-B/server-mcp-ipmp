from __future__ import annotations

from typing import Annotated, Any

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import Id, IdField, merge_extra, safe


def register_project_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register project-related MCP tools."""

    @mcp.tool(description="Lister tous les projets ProjeQtOr, avec filtres optionnels statut et type appliqués côté serveur si possible. Les champs de charge/travail (assignedWork, plannedWork, realWork, leftWork) sont en JOURS (j), jamais en heures.")
    async def list_projects(status_id: Annotated[Id | None, Field(description="Filtre idStatus optionnel")] = None, type_id: Annotated[Id | None, Field(description="Filtre idProjectType optionnel")] = None) -> Any:
        criteria = []
        if status_id is not None:
            criteria.append(SearchCriterion("idStatus", status_id))
        if type_id is not None:
            criteria.append(SearchCriterion("idProjectType", type_id))
        return await safe(client.search("Project", criteria) if criteria else client.list_all("Project"))

    @mcp.tool(description="Récupérer le détail complet d'un projet ProjeQtOr par identifiant. Les champs de charge/travail (assignedWork, plannedWork, realWork, leftWork) sont en JOURS (j), jamais en heures.")
    async def get_project(id: Annotated[Id, IdField]) -> Any:
        return await safe(client.get_object("Project", id))

    @mcp.tool(description="Créer un projet ProjeQtOr. Les champs dans extra sont fusionnés au payload natif et l'écriture est chiffrée AES-CTR.")
    async def create_project(name: str, id_project_type: Id | None = None, id_status: Id | None = None, description: str | None = None, planned_start_date: str | None = None, planned_end_date: str | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"name": name, "idProjectType": id_project_type, "idStatus": id_status, "description": description, "plannedStartDate": planned_start_date, "plannedEndDate": planned_end_date}, extra)
        return await safe(client.create("Project", payload))

    @mcp.tool(description="Modifier un projet existant. Fournir id et les champs ProjeQtOr natifs à mettre à jour.")
    async def update_project(id: Annotated[Id, IdField], updates: Annotated[dict[str, Any], Field(description="Champs natifs ProjeQtOr à modifier")]) -> Any:
        return await safe(client.update("Project", {"id": id, **updates}))

    @mcp.tool(description="Obtenir les données sources KPI d'un projet: projet, activités, travail, dépenses et budgets si disponibles. Tout le travail/charge (work, assignedWork, plannedWork, realWork, leftWork) est en JOURS (j), jamais en heures.")
    async def get_project_kpis(id: Annotated[Id, IdField]) -> Any:
        async def run() -> dict[str, Any]:
            return {
                "project": await client.get_object("Project", id),
                "activities": await client.search("Activity", [SearchCriterion("idProject", id)]),
                "work": await client.search("Work", [SearchCriterion("idProject", id)]),
                "expenses": await safe(client.search("Expense", [SearchCriterion("idProject", id)])),
                "budget": await safe(client.search("Budget", [SearchCriterion("idProject", id)])),
            }
        return await safe(run())
