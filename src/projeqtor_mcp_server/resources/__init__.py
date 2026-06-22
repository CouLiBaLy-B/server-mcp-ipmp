from __future__ import annotations

from .dashboard import register_dashboard_resources
from .project_summary import register_project_summary_resources
from .reference_data import register_reference_resources

__all__ = ["register_dashboard_resources", "register_project_summary_resources", "register_reference_resources"]
