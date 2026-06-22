"""Exemple deepagents (LangChain) consommant le serveur MCP ProjeQtOr.

Deux modes — décommenter UNE config dans `servers` :
  A) serveur HTTP distant (streamable_http) — aucun clone
  B) exécution locale depuis GitHub via uvx — sans git clone manuel

Install :
  pip install deepagents langchain-mcp-adapters
"""

import asyncio
import os

from deepagents import create_deep_agent
from langchain_mcp_adapters.client import MultiServerMCPClient

# --- A : serveur HTTP distant ---
SERVER_REMOTE = {
    "projeqtor": {
        "transport": "streamable_http",
        "url": "https://ton-host:8080/mcp",
        "headers": {"Authorization": "Bearer GATE_TOKEN"},
    }
}

# --- B : exécution locale depuis GitHub via uvx ---
SERVER_UVX = {
    "projeqtor": {
        "transport": "stdio",
        "command": "uvx",
        "args": [
            "--from",
            "git+https://github.com/CouLiBaLy-B/server-mcp-ipmp.git",
            "projeqtor-mcp-server-python",
        ],
        "env": {
            **os.environ,
            "MCP_TRANSPORT": "stdio",
            "PROJEQTOR_BASE_URL": "https://mon-instance.projeqtor.com",
            "PROJEQTOR_BEARER_TOKEN": "...",
            "PROJEQTOR_API_KEY": "...",
            "PROJEQTOR_AES_KEY_LENGTH": "128",
        },
    }
}


async def main() -> None:
    client = MultiServerMCPClient(SERVER_REMOTE)  # ou SERVER_UVX
    tools = await client.get_tools()              # MCP tools -> LangChain BaseTool
    print(f"{len(tools)} tools chargés")

    agent = create_deep_agent(
        tools=tools,
        model="anthropic:claude-3-5-sonnet-latest",  # adapter au provider voulu
        instructions="Assistant de gestion de projet ProjeQtOr. Réponds en français.",
    )
    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": "Liste les projets disponibles."}]}
    )
    print(result["messages"][-1].content)


if __name__ == "__main__":
    asyncio.run(main())
