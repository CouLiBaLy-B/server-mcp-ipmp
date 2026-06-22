from __future__ import annotations

from typing import Any, Annotated

from pydantic import Field
from mcp.server.fastmcp import FastMCP

from src.projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from src.projeqtor_mcp_server.tools.common import Id, IdField, merge_extra, safe


def register_activity_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register activity and planning tools."""

    @mcp.tool(description="Lister les activités d'un projet avec filtres optionnels statut et ressource responsable. Les charges (assignedWork, plannedWork, realWork, leftWork) sont en JOURS (j), jamais en heures.")
    async def list_activities(project_id: Annotated[Id, IdField], status_id: Id | None = None, resource_id: Id | None = None) -> Any:
        criteria = [SearchCriterion("idProject", project_id)]
        if status_id is not None:
            criteria.append(SearchCriterion("idStatus", status_id))
        if resource_id is not None:
            criteria.append(SearchCriterion("idResource", resource_id))
        return await safe(client.search("Activity", criteria))

    @mcp.tool(description="Créer une activité/tâche ProjeQtOr dans un projet. Payload chiffré AES-CTR.")
    async def create_activity(name: str, id_project: Id, id_activity_type: Id | None = None, id_status: Id | None = None, id_resource: Id | None = None, planned_start_date: str | None = None, planned_end_date: str | None = None, planned_work: float | None = None, description: str | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"name": name, "idProject": id_project, "idActivityType": id_activity_type, "idStatus": id_status, "idResource": id_resource, "plannedStartDate": planned_start_date, "plannedEndDate": planned_end_date, "plannedWork": planned_work, "description": description}, extra)
        return await safe(client.create("Activity", payload))

    @mcp.tool(description="Modifier une activité: dates, charge, statut, responsable ou champs natifs.")
    async def update_activity(id: Annotated[Id, IdField], updates: dict[str, Any]) -> Any:
        return await safe(client.update("Activity", {"id": id, **updates}))

    @mcp.tool(description="Récupérer les données Gantt d'un projet: activités, jalons et dépendances si disponibles. Charges/travail en JOURS (j), jamais en heures.")
    async def get_gantt_data(project_id: Annotated[Id, IdField]) -> Any:
        async def run() -> dict[str, Any]:
            return {
                "activities": await client.search("Activity", [SearchCriterion("idProject", project_id)]),
                "milestones": await safe(client.search("Milestone", [SearchCriterion("idProject", project_id)])),
                "dependencies": await safe(client.search("Dependency", [SearchCriterion("idProject", project_id)])),
            }
        return await safe(run())

    @mcp.tool(description="Ajouter une dépendance entre deux activités. Utiliser extra pour adapter les noms de champs à votre instance.")
    async def add_dependency(predecessor_activity_id: Id, successor_activity_id: Id, dependency_type: str = "FS", extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"idActivityPredecessor": predecessor_activity_id, "idActivitySuccessor": successor_activity_id, "dependencyType": dependency_type}, extra)
        return await safe(client.create("Dependency", payload))

    @mcp.tool(description="Snapshot planning complet: activités, jalons, affectations et dépendances d'un projet. Charges/travail en JOURS (j), jamais en heures.")
    async def get_project_planning_snapshot(project_id: Annotated[Id, IdField]) -> Any:
        async def run() -> dict[str, Any]:
            return {
                "activities": await client.search("Activity", [SearchCriterion("idProject", project_id)]),
                "milestones": await safe(client.search("Milestone", [SearchCriterion("idProject", project_id)])),
                "assignments": await safe(client.search("Assignment", [SearchCriterion("idProject", project_id)])),
                "dependencies": await safe(client.search("Dependency", [SearchCriterion("idProject", project_id)])),
            }
        return await safe(run())
