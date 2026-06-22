from __future__ import annotations

from .project_status_report import register_project_status_report_prompt
from .resource_optimization import register_resource_optimization_prompt
from .risk_analysis import register_risk_analysis_prompt
from .sprint_review import register_sprint_review_prompt

__all__ = [
    "register_project_status_report_prompt",
    "register_resource_optimization_prompt",
    "register_risk_analysis_prompt",
    "register_sprint_review_prompt",
]
