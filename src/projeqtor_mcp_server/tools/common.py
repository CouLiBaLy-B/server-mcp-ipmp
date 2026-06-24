from __future__ import annotations

from collections.abc import Awaitable
from typing import Any, TypeVar

from pydantic import Field

from projeqtor_mcp_server.client.projeqtor_api import SearchCriterion
from projeqtor_mcp_server.filters import project_items
from projeqtor_mcp_server.utils.errors import format_error

T = TypeVar("T")
Id = str | int
IdField = Field(description="Identifiant numérique ou chaîne ProjeQtOr")


async def safe(coro: Awaitable[T]) -> T | dict[str, Any]:
    """Return tool result or a safe error payload, never a raw stack trace."""
    try:
        return await coro
    except Exception as exc:
        return {"error": format_error(exc)}


async def safe_list(object_class: str, coro: Awaitable[Any]) -> Any:
    """Run a list/search call safely, then project rows to LLM-sized fields.

    Use for collection responses; keep plain `safe` for `get_*` detail tools
    that must return the full object.
    """
    return project_items(object_class, await safe(coro))


def criteria_from_dicts(criteria: list[dict[str, Any]]) -> list[SearchCriterion]:
    """Convert MCP JSON criteria dictionaries to SearchCriterion objects."""
    return [SearchCriterion(field=str(c["field"]), operator=str(c.get("operator", "=")), value=c["value"]) for c in criteria]


def merge_extra(payload: dict[str, Any], extra: dict[str, Any] | None) -> dict[str, Any]:
    """Merge optional `extra` native ProjeQtOr fields and remove nulls."""
    clean = {k: v for k, v in payload.items() if v is not None and k != "extra"}
    clean.update(extra or {})
    return clean
