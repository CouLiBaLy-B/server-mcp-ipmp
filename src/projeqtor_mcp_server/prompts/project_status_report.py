from __future__ import annotations

from mcp.server.fastmcp import FastMCP


def register_project_status_report_prompt(mcp: FastMCP) -> None:
    """Register project status report prompt."""

    @mcp.prompt(description="Génère un rapport d'avancement projet complet à partir des données ProjeQtOr.")
    def project_status_report(project_id: str, period: str = "la période courante") -> str:
        return f"Utilise get_project_kpis et la resource projeqtor://projects/{project_id}/summary pour rédiger un rapport d'avancement du projet {project_id} pour {period}. Inclure périmètre, planning, coût, charge consommée vs planifiée, activités en retard, tickets, risques/issues, décisions attendues et prochaines actions."
