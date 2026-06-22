import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Logger } from "../utils/logger.js";

/** Starts MCP over stdio. Never write logs to stdout in this mode. */
export async function startStdioTransport(server: McpServer, logger: Logger): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("ProjeQtOr MCP server started on stdio");
}
