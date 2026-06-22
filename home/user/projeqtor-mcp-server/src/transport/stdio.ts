import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/logger.js';

/**
 * Stdio transport for MCP server.
 * Used for local integrations (Claude Desktop, Cursor, VS Code Copilot).
 */
export async function startStdioTransport(
  server: McpServer,
  logger: Logger,
) {
  const transport = new StdioServerTransport();

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('Starting Stdio transport');
  await server.connect(transport);
  logger.info('Stdio transport connected — ready for MCP requests');
}
