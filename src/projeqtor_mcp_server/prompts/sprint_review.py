from __future__ import annotations

from mcp.server.fastmcp import FastMCP


def register_sprint_review_prompt(mcp: FastMCP) -> None:
    """Register sprint review prompt."""

    @mcp.prompt(description="Synthèse de revue de sprint/itération à partir de ProjeQtOr.")
    def sprint_review_summary(project_id: str, from_date: str, to_date: str, sprint_name: str = "") -> str:
        sprint = f" ({sprint_name})" if sprint_name else ""
        return f"Prépare la revue de sprint{sprint} du projet {project_id} du {from_date} au {to_date}. Utilise list_activities, list_tickets, get_recent_changes et project summary. Inclure livrés, non terminés, défauts, vélocité/charge, risques, décisions et actions d'amélioration."
