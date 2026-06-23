from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import Id, merge_extra, safe


def register_document_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register document metadata tools."""

    @mcp.tool(description="Lister les documents liés à un projet ou produit. Métadonnées uniquement.")
    async def list_documents(project_id: Id | None = None, product_id: Id | None = None) -> Any:
        criteria = []
        if project_id is not None:
            criteria.append(SearchCriterion("idProject", project_id))
        if product_id is not None:
            criteria.append(SearchCriterion("idProduct", product_id))
        return await safe(client.search("Document", criteria) if criteria else client.list_all("Document"))

    @mcp.tool(description="Créer une fiche métadonnée Document. L'upload binaire dépend des endpoints/plugins de l'instance.")
    async def create_document_record(name: str, project_id: Id | None = None, description: str | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"name": name, "idProject": project_id, "description": description}, extra)
        return await safe(client.create("Document", payload))
