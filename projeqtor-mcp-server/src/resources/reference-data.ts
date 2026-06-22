import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../tools/common.js";

export function registerReferenceResources(server: any, ctx: ToolContext): void {
  server.registerResource("reference_statuses", "projeqtor://reference/statuses", { title: "Statuses", description: "Available ProjeQtOr statuses", mimeType: "application/json" }, async (uri: URL) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await ctx.client.listAll("Status"), null, 2) }]
  }));

  server.registerResource("reference_types", "projeqtor://reference/types", { title: "Types", description: "Project, activity and ticket types", mimeType: "application/json" }, async (uri: URL) => {
    const data = {
      projectTypes: await ctx.client.listAll("ProjectType").catch(() => []),
      activityTypes: await ctx.client.listAll("ActivityType").catch(() => []),
      ticketTypes: await ctx.client.listAll("TicketType").catch(() => []),
      priorities: await ctx.client.listAll("Priority").catch(() => [])
    };
    return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
  });

  server.registerResource(
    "resource_availability",
    new ResourceTemplate("projeqtor://resources/{id}/availability", { list: undefined }),
    { title: "Resource availability", description: "Resource assignments, work and leave periods for availability analysis", mimeType: "application/json" },
    async (uri: URL, vars: any) => {
      const id = Array.isArray(vars.id) ? vars.id[0] : vars.id;
      const data = {
        resource: await ctx.client.getObject("Resource", id),
        assignments: await ctx.client.search("Assignment", [{ field: "idResource", operator: "=", value: id }]).catch(() => []),
        work: await ctx.client.search("Work", [{ field: "idResource", operator: "=", value: id }]).catch(() => []),
        leaves: await ctx.client.search("LeavePeriod", [{ field: "idResource", operator: "=", value: id }]).catch(() => [])
      };
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
