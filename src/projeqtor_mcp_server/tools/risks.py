from __future__ import annotations

from typing import Annotated, Any

from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import Id, IdField, merge_extra, safe


def register_risk_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register risk, issue and action tracking tools."""

    @mcp.tool(description="Lister les risques d'un projet, optionnellement par statut.")
    async def list_risks(project_id: Annotated[Id, IdField], status_id: Id | None = None) -> Any:
        criteria = [SearchCriterion("idProject", project_id)]
        if status_id is not None:
            criteria.append(SearchCriterion("idStatus", status_id))
        return await safe(client.search("Risk", criteria))

    @mcp.tool(description="Créer un risque avec impact/probabilité/criticité et plan de mitigation. Payload chiffré AES-CTR.")
    async def create_risk(name: str, id_project: Id, id_risk_type: Id | None = None, id_status: Id | None = None, impact: str | None = None, probability: str | None = None, criticality: str | None = None, mitigation_plan: str | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"name": name, "idProject": id_project, "idRiskType": id_risk_type, "idStatus": id_status, "impact": impact, "probability": probability, "criticality": criticality, "description": mitigation_plan}, extra)
        return await safe(client.create("Risk", payload))

    @mcp.tool(description="Lister les problèmes/issues d'un projet, optionnellement par statut.")
    async def list_issues(project_id: Annotated[Id, IdField], status_id: Id | None = None) -> Any:
        criteria = [SearchCriterion("idProject", project_id)]
        if status_id is not None:
            criteria.append(SearchCriterion("idStatus", status_id))
        return await safe(client.search("Issue", criteria))
