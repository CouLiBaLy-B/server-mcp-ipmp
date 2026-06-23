from __future__ import annotations

from typing import Annotated, Any

from mcp.server.fastmcp import FastMCP

from projeqtor_mcp_server.client.projeqtor_api import ProjeQtOrApiClient, SearchCriterion
from projeqtor_mcp_server.tools.common import Id, IdField, merge_extra, safe


def register_financial_tools(mcp: FastMCP, client: ProjeQtOrApiClient) -> None:
    """Register financial tools."""

    @mcp.tool(description="Consulter les données financières liées à un projet: budgets, dépenses, devis, commandes, factures, paiements.")
    async def get_project_budget(project_id: Annotated[Id, IdField]) -> Any:
        async def run() -> dict[str, Any]:
            return {
                "budgets": await safe(client.search("Budget", [SearchCriterion("idProject", project_id)])),
                "expenses": await safe(client.search("Expense", [SearchCriterion("idProject", project_id)])),
                "quotations": await safe(client.search("Quotation", [SearchCriterion("idProject", project_id)])),
                "orders": await safe(client.search("Order", [SearchCriterion("idProject", project_id)])),
                "bills": await safe(client.search("Bill", [SearchCriterion("idProject", project_id)])),
                "payments": await safe(client.search("Payment", [SearchCriterion("idProject", project_id)])),
            }
        return await safe(run())

    @mcp.tool(description="Enregistrer une dépense projet. Payload chiffré AES-CTR.")
    async def create_expense(project_id: Id, name: str, amount: float, expense_date: str | None = None, description: str | None = None, extra: dict[str, Any] | None = None) -> Any:
        payload = merge_extra({"idProject": project_id, "name": name, "amount": amount, "expenseDate": expense_date, "description": description}, extra)
        return await safe(client.create("Expense", payload))
