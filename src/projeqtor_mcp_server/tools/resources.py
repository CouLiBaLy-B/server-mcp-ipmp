from __future__ import annotations

from typing import Annotated, Any

from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.filters import project_items
from projeqtor_mcp_server.tools.common import Id, IdField, merge_extra, safe, safe_list


def register_resource_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register resource, assignment and timesheet tools."""

    @mcp.tool(description="Lister les ressources. Par défaut (active_only=true) masque les ressources inactives (idle=1). Retourne toujours une liste de ressources projetée.")
    async def list_resources(active_only: bool = True) -> Any:
        async def run() -> Any:
            data = await client.list_all("Resource")
            rows = data if isinstance(data, list) else data.get("items") if isinstance(data, dict) else None
            if not isinstance(rows, list):
                return project_items("Resource", data)
            if active_only:
                rows = [r for r in rows if str(r.get("idle", "0")) != "1"]
            return project_items("Resource", rows)
        return await safe(run())

    @mcp.tool(description="Affecter une ressource à une activité en créant une Assignment. Payload chiffré AES-CTR.")
    async def assign_resource(activity_id: Id, resource_id: Id, assigned_work: float | None = None, rate: float | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"idActivity": activity_id, "idResource": resource_id, "assignedWork": assigned_work, "rate": rate}, extra)
        return await safe(client.create("Assignment", payload))

    @mcp.tool(description="Charge d'une ressource sur une période: ressource, affectations et work logs.")
    async def get_resource_workload(resource_id: Annotated[Id, IdField], from_date: str, to_date: str) -> Any:
        async def run() -> dict[str, Any]:
            return {
                "resource": await client.get_object("Resource", resource_id),
                "assignments": await safe_list("Assignment", client.search("Assignment", [SearchCriterion("idResource", resource_id)])),
                "work": await safe_list("Work", client.search("Work", [SearchCriterion("idResource", resource_id), SearchCriterion("workDate", from_date, ">="), SearchCriterion("workDate", to_date, "<=")])),
            }
        return await safe(run())

    @mcp.tool(description="Saisir du temps sur une activité pour une ressource. Payload chiffré AES-CTR.")
    async def log_work(activity_id: Id, resource_id: Id, work_date: str, work: float, comment: str | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"idActivity": activity_id, "idResource": resource_id, "workDate": work_date, "work": work, "comment": comment}, extra)
        return await safe(client.create("Work", payload))

    @mcp.tool(description="Consulter la feuille de temps Work d'une ressource sur une période.")
    async def get_timesheet(resource_id: Annotated[Id, IdField], from_date: str, to_date: str) -> Any:
        return await safe_list("Work", client.search("Work", [SearchCriterion("idResource", resource_id), SearchCriterion("workDate", from_date, ">="), SearchCriterion("workDate", to_date, "<=")]))
