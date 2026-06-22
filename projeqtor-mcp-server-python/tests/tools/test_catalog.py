import asyncio

from projeqtor_mcp_server.config import Settings
from projeqtor_mcp_server.server import create_server
from projeqtor_mcp_server.utils.logger import configure_logging


def test_server_catalog_contains_required_items() -> None:
    async def run() -> None:
        settings = Settings.model_validate({
            "PROJEQTOR_BASE_URL": "https://example.com",
            "PROJEQTOR_USERNAME": "u",
            "PROJEQTOR_PASSWORD": "p",
            "PROJEQTOR_API_KEY": "k",
        })
        server = create_server(settings, configure_logging("ERROR"))
        tools = await server.list_tools()
        prompts = await server.list_prompts()
        assert len(tools) >= 25
        assert {"list_projects", "create_ticket", "get_recent_changes"}.issubset({t.name for t in tools})
        assert {"project_status_report", "risk_analysis"}.issubset({p.name for p in prompts})
    asyncio.run(run())
