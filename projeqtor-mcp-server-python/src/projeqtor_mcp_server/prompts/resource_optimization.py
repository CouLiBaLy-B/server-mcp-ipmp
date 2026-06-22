from __future__ import annotations

from mcp.server.fastmcp import FastMCP


def register_resource_optimization_prompt(mcp: FastMCP) -> None:
    """Register resource optimization prompt."""

    @mcp.prompt(description="Suggestions d'optimisation charge/capacité des ressources.")
    def resource_optimization(from_date: str, to_date: str, resource_id: str = "", project_id: str = "") -> str:
        focus = f"Ressource {resource_id}." if resource_id else "Toutes ressources pertinentes."
        project = f" Projet {project_id}." if project_id else ""
        return f"Analyse la charge ProjeQtOr de {from_date} à {to_date}. {focus}{project} Utilise list_resources et get_resource_workload. Identifie surcharges, sous-charge, goulets, options de réaffectation et impacts planning."
