import http from 'node:http';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Logger } from '../utils/logger.js';

/**
 * Streamable HTTP transport for MCP server.
 * Used for remote access and production deployments.
 */
export async function startHttpTransport(
  server: McpServer,
  config: { MCP_HTTP_PORT: number; MCP_HTTP_HOST: string },
  logger: Logger,
) {
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      });
      res.end();
      return;
    }

    // Add CORS headers to all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Initialize session (POST /mcp)
    if (req.method === 'POST' && req.url === '/mcp') {
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (sessionId: string) => {
            sessions.set(sessionId, transport);
            logger.info('New MCP session created', { sessionId });
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
            logger.info('MCP session closed', { sessionId: transport.sessionId });
          }
        };

        await server.connect(transport);
      } catch (err) {
        logger.error('Failed to initialize MCP session', { error: err });
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }

    // Handle existing session (GET/POST/DELETE /mcp)
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    // Unknown session
    if (sessionId && !sessions.has(sessionId)) {
      res.writeHead(404);
      res.end('Session not found');
      return;
    }

    // Not found
    res.writeHead(404);
    res.end('Not Found');
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down HTTP server`);
    httpServer.close(() => {
      server.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  httpServer.listen(config.MCP_HTTP_PORT, config.MCP_HTTP_HOST, () => {
    logger.info(`HTTP transport listening on ${config.MCP_HTTP_HOST}:${config.MCP_HTTP_PORT}`);
  });
}
