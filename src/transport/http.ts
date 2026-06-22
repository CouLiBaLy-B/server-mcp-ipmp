import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "../config.js";
import type { Logger } from "../utils/logger.js";

export type ServerFactory = () => McpServer;

/** Starts stateless Streamable HTTP MCP transport on /mcp. */
export async function startHttpTransport(createServer: ServerFactory, config: AppConfig, logger: Logger): Promise<void> {
  const app = express();
  app.use(cors({ origin: true, exposedHeaders: ["Mcp-Session-Id"] }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok", server: "projeqtor-mcp-server" }));

  app.post("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error("MCP HTTP request failed", error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    } finally {
      await server.close().catch(() => undefined);
    }
  });

  app.get("/mcp", (_req, res) => res.status(405).json({ error: "This stateless MCP endpoint accepts POST requests only" }));
  app.delete("/mcp", (_req, res) => res.status(405).json({ error: "No HTTP session to delete in stateless mode" }));

  await new Promise<void>((resolve) => {
    app.listen(config.MCP_HTTP_PORT, config.MCP_HTTP_HOST, () => resolve());
  });
  logger.info("ProjeQtOr MCP server started on Streamable HTTP", { host: config.MCP_HTTP_HOST, port: config.MCP_HTTP_PORT, path: "/mcp" });
}
