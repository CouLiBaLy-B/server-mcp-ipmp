#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, type AppConfig } from "./config.js";
import { createLogger, type Logger } from "./utils/logger.js";
import { ProjeQtOrApiClient } from "./client/projeqtor-api.js";
import { startStdioTransport } from "./transport/stdio.js";
import { startHttpTransport } from "./transport/http.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerActivityTools } from "./tools/activities.js";
import { registerTicketTools } from "./tools/tickets.js";
import { registerResourceTools } from "./tools/resources.js";
import { registerPlanningTools } from "./tools/planning.js";
import { registerTimesheetTools } from "./tools/timesheets.js";
import { registerRiskTools } from "./tools/risks.js";
import { registerFinancialTools } from "./tools/financial.js";
import { registerDocumentTools } from "./tools/documents.js";
import { registerMeetingTools } from "./tools/meetings.js";
import { registerSearchTools } from "./tools/search.js";
import { registerProjectSummaryResource } from "./resources/project-summary.js";
import { registerDashboardResource } from "./resources/dashboard.js";
import { registerReferenceResources } from "./resources/reference-data.js";
import { registerProjectStatusReportPrompt } from "./prompts/project-status-report.js";
import { registerRiskAnalysisPrompt } from "./prompts/risk-analysis.js";
import { registerResourceOptimizationPrompt } from "./prompts/resource-optimization.js";
import { registerSprintReviewPrompt } from "./prompts/sprint-review.js";

/** Creates and wires a complete MCP server instance. */
export function createMcpServer(config: AppConfig, logger: Logger): McpServer {
  const server = new McpServer({
    name: "projeqtor-mcp-server",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
    instructions: "Use this server to read and write ProjeQtOr project-management data. Read tools are safe. Write tools encrypt payloads with the configured ProjeQtOr AES API key. Never ask the server to reveal credentials."
  });

  const client = new ProjeQtOrApiClient(config, logger);
  const ctx = { client };

  registerProjectTools(server, ctx);
  registerActivityTools(server, ctx);
  registerTicketTools(server, ctx);
  registerResourceTools(server, ctx);
  registerPlanningTools(server, ctx);
  registerTimesheetTools(server, ctx);
  registerRiskTools(server, ctx);
  registerFinancialTools(server, ctx);
  registerDocumentTools(server, ctx);
  registerMeetingTools(server, ctx);
  registerSearchTools(server, ctx);

  registerProjectSummaryResource(server, ctx);
  registerDashboardResource(server, ctx);
  registerReferenceResources(server, ctx);

  registerProjectStatusReportPrompt(server);
  registerRiskAnalysisPrompt(server);
  registerResourceOptimizationPrompt(server);
  registerSprintReviewPrompt(server);

  return server;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);

  const shutdown = async (signal: string) => {
    logger.info("Received shutdown signal", { signal });
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  if (config.MCP_TRANSPORT === "http") {
    await startHttpTransport(() => createMcpServer(config, logger), config, logger);
  } else {
    await startStdioTransport(createMcpServer(config, logger), logger);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ level: "error", message: "Fatal startup error", error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
