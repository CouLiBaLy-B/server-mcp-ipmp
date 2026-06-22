from __future__ import annotations

import os
from enum import Enum
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel, Field, HttpUrl, ValidationError, field_validator


class Transport(str, Enum):
    """Supported MCP transports."""

    STDIO = "stdio"
    HTTP = "http"


class Settings(BaseModel):
    """Runtime configuration loaded from environment variables."""

    projeqtor_base_url: HttpUrl = Field(alias="PROJEQTOR_BASE_URL")
    projeqtor_username: str = Field(min_length=1, alias="PROJEQTOR_USERNAME")
    projeqtor_password: str = Field(min_length=1, alias="PROJEQTOR_PASSWORD")
    projeqtor_api_key: str = Field(min_length=1, alias="PROJEQTOR_API_KEY")
    projeqtor_aes_key_length: Literal[128, 192, 256] = Field(default=128, alias="PROJEQTOR_AES_KEY_LENGTH")

    mcp_transport: Transport = Field(default=Transport.STDIO, alias="MCP_TRANSPORT")
    mcp_http_host: str = Field(default="0.0.0.0", alias="MCP_HTTP_HOST")
    mcp_http_port: int = Field(default=3000, gt=0, alias="MCP_HTTP_PORT")

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", alias="LOG_LEVEL"
    )
    projeqtor_timeout_seconds: float = Field(default=30.0, gt=0, alias="PROJEQTOR_TIMEOUT_SECONDS")
    projeqtor_retry_attempts: int = Field(default=3, ge=0, le=8, alias="PROJEQTOR_RETRY_ATTEMPTS")
    projeqtor_retry_base_delay_seconds: float = Field(
        default=0.3, gt=0, alias="PROJEQTOR_RETRY_BASE_DELAY_SECONDS"
    )

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        return str(value).upper()

    @property
    def base_url(self) -> str:
        """Return base URL without trailing slash and without /api suffix."""
        url = str(self.projeqtor_base_url).rstrip("/")
        return url[:-4] if url.endswith("/api") else url


def load_settings() -> Settings:
    """Load `.env` if present and validate environment variables."""
    load_dotenv()
    try:
        return Settings.model_validate(os.environ)
    except ValidationError as exc:
        details = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
        raise RuntimeError(f"Invalid configuration: {details}") from exc
