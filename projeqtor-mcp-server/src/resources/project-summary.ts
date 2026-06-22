import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../tools/common.js";

export function registerProjectSummaryResource(server: any, ctx: ToolContext): void {
  server.registerResource(
    "project_summary",
    new ResourceTemplate("projeqtor://projects/{id}/summary", { list: undefined }),
    { title: "Project summary", description: "Consolidated project summary with KPIs source data", mimeType: "application/json" },
    async (uri: URL, vars: any) => {
      const id = Array.isArray(vars.id) ? vars.id[0] : vars.id;
      const data = {
        project: await ctx.client.getObject("Project", id),
        activities: await ctx.client.search("Activity", [{ field: "idProject", operator: "=", value: id }]).catch(() => []),
        tickets: await ctx.client.search("Ticket", [{ field: "idProject", operator: "=", value: id }]).catch(() => []),
        risks: await ctx.client.search("Risk", [{ field: "idProject", operator: "=", value: id }]).catch(() => []),
        issues: await ctx.client.search("Issue", [{ field: "idProject", operator: "=", value: id }]).catch(() => []),
        work: await ctx.client.search("Work", [{ field: "idProject", operator: "=", value: id }]).catch(() => [])
      };
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
