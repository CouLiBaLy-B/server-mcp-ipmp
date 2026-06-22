from __future__ import annotations

from datetime import datetime, timedelta


def format_projeqtor_timestamp(dt: datetime) -> str:
    """Format datetime as ProjeQtOr timestamp YYYYMMDDHHMMSS."""
    return dt.strftime("%Y%m%d%H%M%S")


def days_ago(days: int) -> datetime:
    """Return local datetime `days` days ago."""
    return datetime.now() - timedelta(days=days)
