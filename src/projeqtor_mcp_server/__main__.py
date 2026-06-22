from __future__ import annotations

import sys

from projeqtor_mcp_server.config import Transport, load_settings
from projeqtor_mcp_server.server import create_server
from projeqtor_mcp_server.utils.logger import configure_logging


def main() -> None:
    """CLI entrypoint. Runs stdio or Streamable HTTP depending on MCP_TRANSPORT."""
    try:
        settings = load_settings()
        logger = configure_logging(settings.log_level)
        mcp = create_server(settings, logger)
        if settings.mcp_transport == Transport.HTTP:
            logger.info("Starting ProjeQtOr MCP server on Streamable HTTP", extra={"meta": {"host": settings.mcp_http_host, "port": settings.mcp_http_port, "path": "/mcp"}})
            mcp.run(transport="streamable-http")
        else:
            logger.info("Starting ProjeQtOr MCP server on stdio")
            mcp.run(transport="stdio")
    except Exception as exc:  # noqa: BLE001 - startup boundary
        logger = configure_logging("ERROR")
        logger.error("Fatal startup error", extra={"meta": {"error": str(exc)}})
        sys.exit(1)


if __name__ == "__main__":
    main()
