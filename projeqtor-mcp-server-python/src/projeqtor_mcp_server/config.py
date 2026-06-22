from __future__ import annotations

import os
from enum import Enum
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel, Field, HttpUrl, ValidationError, field_validator, model_validator


class Transport(str, Enum):
    """Supported MCP transports."""

    STDIO = "stdio"
    HTTP = "http"


class Settings(BaseModel):
    """Runtime configuration loaded from environment variables."""

    projeqtor_base_url: HttpUrl = Field(alias="PROJEQTOR_BASE_URL")
    # Auth: bearer token OR Basic (username + password). At least one required —
    # enforced by `_check_auth` below. Bearer wins when both are present.
    projeqtor_username: str | None = Field(default=None, alias="PROJEQTOR_USERNAME")
    projeqtor_password: str | None = Field(default=None, alias="PROJEQTOR_PASSWORD")
    projeqtor_bearer_token: str | None = Field(default=None, alias="PROJEQTOR_BEARER_TOKEN")
    # AES key is only needed for write operations (PUT/POST/DELETE); reads work
    # without it. Optional so a read-only/bearer setup needs no placeholder.
    projeqtor_api_key: str | None = Field(default=None, alias="PROJEQTOR_API_KEY")
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

    @field_validator("projeqtor_aes_key_length", mode="before")
    @classmethod
    def coerce_aes_key_length(cls, value: object) -> object:
        # Env vars arrive as strings; Literal[int] won't coerce "128" -> 128.
        if isinstance(value, str) and value.strip().isdigit():
            return int(value)
        return value

    @model_validator(mode="after")
    def _check_auth(self) -> Settings:
        has_basic = bool(self.projeqtor_username and self.projeqtor_password)
        if not self.projeqtor_bearer_token and not has_basic:
            raise ValueError(
                "Authentication required: set PROJEQTOR_BEARER_TOKEN, "
                "or PROJEQTOR_USERNAME + PROJEQTOR_PASSWORD."
            )
        return self

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
