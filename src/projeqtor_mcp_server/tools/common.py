from __future__ import annotations

from collections.abc import Awaitable
from typing import Any, TypeVar

from pydantic import Field

from projeqtor_mcp_server.client.projeqtor_api import SearchCriterion
from projeqtor_mcp_server.utils.errors import format_error

T = TypeVar("T")
Id = str | int
IdField = Field(description="Identifiant numérique ou chaîne ProjeQtOr")


async def safe(coro: Awaitable[T]) -> T | dict[str, Any]:
    """Return tool result or a safe error payload, never a raw stack trace."""
    try:
        return await coro
    except Exception as exc:  # noqa: BLE001 - MCP boundary: convert every exception to safe text
        return {"error": format_error(exc)}


def criteria_from_dicts(criteria: list[dict[str, Any]]) -> list[SearchCriterion]:
    """Convert MCP JSON criteria dictionaries to SearchCriterion objects."""
    return [SearchCriterion(field=str(c["field"]), operator=str(c.get("operator", "=")), value=c["value"]) for c in criteria]


def merge_extra(payload: dict[str, Any], extra: dict[str, Any] | None) -> dict[str, Any]:
    """Merge optional `extra` native ProjeQtOr fields and remove nulls."""
    clean = {k: v for k, v in payload.items() if v is not None and k != "extra"}
    clean.update(extra or {})
    return clean
