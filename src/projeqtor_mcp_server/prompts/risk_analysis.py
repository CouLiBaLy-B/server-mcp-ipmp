from __future__ import annotations

from mcp.server.fastmcp import FastMCP


def register_risk_analysis_prompt(mcp: FastMCP) -> None:
    """Register risk analysis prompt."""

    @mcp.prompt(description="Analyse et priorise les risques d'un projet ProjeQtOr.")
    def risk_analysis(project_id: str, risk_tolerance: str = "medium") -> str:
        return f"Appelle list_risks et list_issues pour le projet {project_id}. Tolérance au risque: {risk_tolerance}. Priorise par probabilité, impact, criticité et ancienneté. Produis un classement, plans de mitigation, responsables/actions, escalades recommandées et données manquantes."
