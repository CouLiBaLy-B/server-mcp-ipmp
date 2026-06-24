"""Field-projection helpers to keep ProjeQtOr payloads small for the LLM.

ProjeQtOr REST objects carry dozens of internal columns (audit timestamps, ACL
ids, layout hints...) that bloat tool responses and waste context. List/search
tools project rows down to the fields an assistant actually reasons about, while
detail tools (`get_*`) keep returning the full object untouched.
"""

from __future__ import annotations

from typing import Any

# Charge/travail fields, expressed in DAYS (j) by ProjeQtOr. Rounded to avoid
# floats like 1.2000000000000002 eating tokens.
WORK_FIELDS = {"assignedWork", "plannedWork", "realWork", "leftWork", "work"}
WORK_DIGITS = 2

# Fields kept for tracker-style classes (Risk, Issue, Action...) that share the
# common ProjeQtOr columns and have no dedicated projection below.
GENERIC_TRACKER_FIELDS = {
    "id",
    "reference",
    "name",
    "idProject",
    "nameProject",
    "nameStatus",
    "namePriority",
    "nameResource",
    "creationDateTime",
    "lastUpdateDateTime",
}

# Field names verified against the live ipmp-beta instance for the classes that
# returned rows (Project, Activity, Assignment, Resource, Work, Dependency,
# Ticket). Milestone/Meeting/Document had no rows to inspect — their sets are
# best-effort; unknown keys are simply ignored at projection time.
KEPT_FIELDS: dict[str, set[str]] = {
    "Project": {"id", "name", "nameProject", "projectCode", "idStatus", "nameStatus", "idProjectType", "nameProjectType", "nameResource", "plannedStartDate", "plannedEndDate", "realStartDate", "realEndDate", "progress", "assignedWork", "plannedWork", "realWork", "leftWork"},
    "Activity": {"id", "name", "reference", "idProject", "nameProject", "idStatus", "nameStatus", "idResource", "nameResource", "plannedStartDate", "plannedEndDate", "realStartDate", "realEndDate", "progress", "assignedWork", "plannedWork", "realWork", "leftWork"},
    "Assignment": {"id", "idProject", "nameProject", "idResource", "nameResource", "idRole", "nameRole", "refId", "refName", "refType", "plannedStartDate", "plannedEndDate", "realStartDate", "realEndDate", "rate", "capacity", "assignedWork", "plannedWork", "realWork", "leftWork"},
    "Resource": {"id", "name", "initials", "email", "userName", "idle", "nameRole", "nameTeam", "nameOrganization", "capacity", "isUser", "isEmployee", "isMaterial", "isContact"},
    "Work": {"id", "idProject", "nameProject", "idResource", "nameResource", "idAssignment", "refId", "refName", "refType", "workDate", "work", "cost"},
    "Dependency": {"id", "predecessorId", "predecessorRefId", "predecessorRefType", "successorId", "successorRefId", "successorRefType", "dependencyType", "dependencyDelay", "comment"},
    "Ticket": {"id", "reference", "name", "idProject", "nameProject", "nameTicketType", "nameStatus", "namePriority", "nameUrgency", "nameCriticality", "nameResource", "creationDateTime", "lastUpdateDateTime"},
    "Milestone": {"id", "name", "reference", "idProject", "nameProject", "idStatus", "nameStatus", "plannedDate", "realDate", "targetDate", "expectedDate"},
    "Meeting": {"id", "reference", "name", "idProject", "nameProject", "idStatus", "nameStatus", "meetingDate", "nameResource"},
    "Document": {"id", "reference", "name", "idProject", "nameProject", "idStatus", "nameStatus", "nameDocumentType", "version", "lastUpdateDateTime"},
}

# Tracker classes that fall back to the generic projection.
for _klass in ("Risk", "Issue", "Opportunity", "Action", "Question", "Decision", "Requirement", "TestCase", "TestSession"):
    KEPT_FIELDS.setdefault(_klass, GENERIC_TRACKER_FIELDS)


def _project_row(item: dict[str, Any], kept: set[str]) -> dict[str, Any]:
    """Keep only `kept` fields that are present, rounding work/charge values."""
    result: dict[str, Any] = {}
    for key, value in item.items():
        if key not in kept:
            continue
        if key in WORK_FIELDS and value is not None:
            try:
                result[key] = round(float(value), WORK_DIGITS)
                continue
            except (TypeError, ValueError):
                pass
        result[key] = value
    return result


def project_items(object_class: str, data: Any) -> Any:
    """Project a list/search response for `object_class` down to kept fields.

    Passes data through unchanged when the class has no projection, when the
    payload is an error dict, or when the shape is not a row collection.
    """
    kept = KEPT_FIELDS.get(object_class)
    if kept is None:
        return data
    if isinstance(data, list):
        return [_project_row(row, kept) if isinstance(row, dict) else row for row in data]
    if isinstance(data, dict):
        if "error" in data:
            return data
        rows = data.get("items")
        if isinstance(rows, list):
            return {**data, "items": [_project_row(r, kept) if isinstance(r, dict) else r for r in rows]}
    return data
