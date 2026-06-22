from __future__ import annotations

from typing import Any


class ProjeQtOrApiError(Exception):
    """Safe error raised for ProjeQtOr API failures."""

    def __init__(self, message: str, *, status_code: int | None = None, retryable: bool = False, details: Any = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable
        self.details = details


def format_error(exc: BaseException) -> str:
    """Convert exceptions to actionable MCP-safe messages without stack traces."""
    if isinstance(exc, ProjeQtOrApiError):
        retry = " La requête peut être retentée plus tard." if exc.retryable else " Vérifiez les paramètres, permissions ou champs ProjeQtOr."
        status = f" ({exc.status_code})" if exc.status_code else ""
        return f"Erreur API ProjeQtOr{status}: {exc}.{retry}"
    return f"Erreur inattendue: {exc}"
