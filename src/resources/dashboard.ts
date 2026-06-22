import type { ToolContext } from "../tools/common.js";
import { formatProjeqtorTimestamp, daysAgo } from "../utils/date-utils.js";

export function registerDashboardResource(server: any, ctx: ToolContext): void {
  server.registerResource(
    "dashboard_overview",
    "projeqtor://dashboard/overview",
    { title: "ProjeQtOr dashboard overview", description: "Global portfolio overview across projects, tickets, risks and recent changes", mimeType: "application/json" },
    async (uri: URL) => {
      const from = formatProjeqtorTimestamp(daysAgo(7));
      const to = formatProjeqtorTimestamp(new Date());
      const data = {
        projects: await ctx.client.listAll("Project").catch((e) => ({ error: String(e) })),
        openTickets: await ctx.client.search("Ticket", [{ field: "idle", operator: "=", value: 0 }]).catch(() => []),
        activeRisks: await ctx.client.search("Risk", [{ field: "idle", operator: "=", value: 0 }]).catch(() => []),
        recentActivities: await ctx.client.updated("Activity", from, to).catch(() => [])
      };
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
