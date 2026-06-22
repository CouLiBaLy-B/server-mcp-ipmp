from __future__ import annotations

import asyncio
import json
import logging
import random
from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import quote

import httpx

from projeqtor_mcp_server.client.aes_ctr import encrypt_aes_ctr
from projeqtor_mcp_server.config import Settings
from projeqtor_mcp_server.utils.errors import ProjeQtOrApiError

WriteMethod = Literal["PUT", "POST", "DELETE"]


@dataclass(frozen=True)
class SearchCriterion:
    """Criterion for ProjeQtOr `/search` endpoint."""

    field: str
    value: str | int | float | bool
    operator: str = "="

    def to_path_segment(self) -> str:
        return quote(f"{self.field}:{self.operator}:{self.value}", safe="")


class ProjeQtOrApiClient:
    """Async HTTP client wrapping the ProjeQtOr REST API."""

    def __init__(self, settings: Settings, logger: logging.Logger) -> None:
        self._settings = settings
        self._logger = logger
        self._api_base = f"{settings.base_url}/api"
        self._auth = httpx.BasicAuth(settings.projeqtor_username, settings.projeqtor_password)

    async def get_object(self, object_class: str, object_id: str | int) -> Any:
        """Retrieve one object by class and id."""
        return await self._request("GET", f"/{quote(object_class)}/{quote(str(object_id))}")

    async def list_all(self, object_class: str) -> Any:
        """List all objects of a class."""
        return await self._request("GET", f"/{quote(object_class)}/all")

    async def filter(self, object_class: str, filter_id: str | int) -> Any:
        """Retrieve objects using a predefined ProjeQtOr filter id."""
        return await self._request("GET", f"/{quote(object_class)}/filter/{quote(str(filter_id))}")

    async def search(self, object_class: str, criteria: list[SearchCriterion]) -> Any:
        """Search objects with SQL-like criteria encoded as URL path segments."""
        segments = "/".join(c.to_path_segment() for c in criteria)
        return await self._request("GET", f"/{quote(object_class)}/search/{segments}")

    async def updated(self, object_class: str, from_ts: str, to_ts: str) -> Any:
        """Retrieve objects updated between two ProjeQtOr timestamps."""
        return await self._request("GET", f"/{quote(object_class)}/updated/{from_ts}/{to_ts}")

    async def create(self, object_class: str, data: dict[str, Any]) -> Any:
        """Create an object with AES-CTR encrypted payload."""
        return await self._write("PUT", object_class, data)

    async def update(self, object_class: str, data: dict[str, Any]) -> Any:
        """Update an object with AES-CTR encrypted payload."""
        return await self._write("POST", object_class, data)

    async def delete(self, object_class: str, data: dict[str, Any]) -> Any:
        """Delete an object with AES-CTR encrypted payload."""
        return await self._write("DELETE", object_class, data)

    async def _write(self, method: WriteMethod, object_class: str, data: dict[str, Any]) -> Any:
        encrypted = encrypt_aes_ctr(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            self._settings.projeqtor_api_key,
            self._settings.projeqtor_aes_key_length,
        )
        return await self._request(method, f"/{quote(object_class)}", json_body={"data": encrypted})

    async def _request(self, method: str, path: str, json_body: Any | None = None) -> Any:
        url = f"{self._api_base}{path}"
        last_exc: BaseException | None = None
        timeout = httpx.Timeout(self._settings.projeqtor_timeout_seconds)

        for attempt in range(self._settings.projeqtor_retry_attempts + 1):
            try:
                async with httpx.AsyncClient(auth=self._auth, timeout=timeout) as http:
                    response = await http.request(
                        method,
                        url,
                        json=json_body,
                        headers={"Accept": "application/json"},
                    )
                payload = _decode_response(response)
                if response.is_error:
                    retryable = response.status_code == 429 or response.status_code >= 500
                    raise ProjeQtOrApiError(
                        _extract_message(payload) or response.reason_phrase,
                        status_code=response.status_code,
                        retryable=retryable,
                        details=payload,
                    )
                return payload
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_exc = ProjeQtOrApiError(str(exc), retryable=True)
            except ProjeQtOrApiError as exc:
                last_exc = exc
                if not exc.retryable:
                    raise

            if attempt >= self._settings.projeqtor_retry_attempts:
                break
            delay = self._settings.projeqtor_retry_base_delay_seconds * (2**attempt) + random.random() / 10
            self._logger.warning("Retrying ProjeQtOr request", extra={"meta": {"method": method, "path": path, "attempt": attempt + 1, "delay": delay}})
            await asyncio.sleep(delay)

        if last_exc:
            raise last_exc
        raise ProjeQtOrApiError("Unknown ProjeQtOr API failure", retryable=True)


def _decode_response(response: httpx.Response) -> Any:
    text = response.text
    if not text:
        return None
    try:
        return response.json()
    except ValueError:
        return text


def _extract_message(payload: Any) -> str | None:
    if isinstance(payload, dict):
        for key in ("message", "error", "errorMessage", "result"):
            value = payload.get(key)
            if isinstance(value, str):
                return value
    return payload if isinstance(payload, str) else None
