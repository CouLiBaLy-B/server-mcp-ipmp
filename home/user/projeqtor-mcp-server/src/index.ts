import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EnvConfig, Logger } from '../config.js';
import { ProjeqtorApiClient } from '../client/projeqtor-api.js';

// ─── Tools ───────────────────────────────────────────────────────────────────────

import { registerProjectTools } from './tools/projects.js';
import { registerActivityTools } from './tools/activities.js';
import { registerTicketTools } from './tools/tickets.js';
import { registerResourceTools } from './tools/resources.js';
import { registerPlanningTools } from './tools/planning.js';
import { registerRiskTools } from './tools/risks.js';
import { registerFinancialTools } from './tools/financial.js';
import { registerDocumentMeetingTools } from './tools/documents.js';
import { registerSearchTools } from './tools/search.js';

// ─── Resources & Prompts ────────────────────────────────────────────────────────

import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

// ─── Transports ──────────────────────────────────────────────────────────────────

import { startStdioTransport } from './transport/stdio.js';
import { startHttpTransport } from './transport/http.js';

// ─── Server Initialization ─────────────────────────────────────────────────────

async function main() {
  // 1. Load & validate configuration
  const config: EnvConfig = loadConfig();
  const logger: Logger = createLogger(config);

  logger.info('Starting ProjeQtOr MCP Server', {
    transport: config.MCP_TRANSPORT,
    baseUrl: config.PROJEQTOR_BASE_URL,
  });

  // 2. Create MCP Server instance
  const server = new McpServer({
    name: 'projeqtor-mcp-server',
    version: '1.0.0',
  });

  // 3. Create ProjeQtOr API Client
  const apiClient = new ProjeqtorApiClient(config, logger);

  // 4. Register all tools, resources, and prompts
  registerProjectTools(server, apiClient, logger);
  registerActivityTools(server, apiClient, logger);
  registerTicketTools(server, apiClient, logger);
  registerResourceTools(server, apiClient, logger);
  registerPlanningTools(server, apiClient, logger);
  registerRiskTools(server, apiClient, logger);
  registerFinancialTools(server, apiClient, logger);
  registerDocumentMeetingTools(server, apiClient, logger);
  registerSearchTools(server, apiClient, logger);
  registerResources(server, apiClient, logger);
  registerPrompts(server);

  logger.info('All MCP components registered successfully');

  // 5. Start transport
  if (config.MCP_TRANSPORT === 'http') {
    await startHttpTransport(server, config, logger);
  } else {
    await startStdioTransport(server, logger);
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

main().catch((err) => {
  process.stderr.write(`FATAL: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});