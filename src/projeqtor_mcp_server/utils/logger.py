from __future__ import annotations

import json
import logging
import re
import sys
from typing import Any

_SENSITIVE = re.compile(r"(password|api[_-]?key|token|secret|authorization)", re.IGNORECASE)
_BASIC = re.compile(r"(Authorization:\s*Basic\s+)[A-Za-z0-9+/=]+", re.IGNORECASE)


class JsonStderrFormatter(logging.Formatter):
    """JSON log formatter that writes safe records to stderr only."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "meta"):
            payload["meta"] = sanitize(getattr(record, "meta"))
        if record.exc_info:
            payload["exception"] = record.exc_info[0].__name__ if record.exc_info[0] else "Exception"
        return json.dumps(payload, ensure_ascii=False)


def sanitize(value: Any) -> Any:
    """Redact credentials from strings, mappings and lists."""
    if isinstance(value, str):
        return _BASIC.sub(r"\1[REDACTED]", value)
    if isinstance(value, dict):
        return {k: "[REDACTED]" if _SENSITIVE.search(str(k)) else sanitize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize(v) for v in value]
    return value


def configure_logging(level: str) -> logging.Logger:
    """Configure root logger to stderr, preserving MCP stdio stdout."""
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JsonStderrFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
    return logging.getLogger("projeqtor_mcp_server")
