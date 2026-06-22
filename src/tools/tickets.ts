import { TicketPayloadSchema, IdSchema, CriteriaSchema, JsonObjectSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { mergeExtra, type ToolContext } from "./common.js";

export function registerTicketTools(server: any, ctx: ToolContext): void {
  server.registerTool("list_tickets", {
    title: "List tickets",
    description: "List ProjeQtOr tickets with optional filters: project, status, priority and responsible resource.",
    inputSchema: { projectId: IdSchema.optional(), statusId: IdSchema.optional(), priorityId: IdSchema.optional(), resourceId: IdSchema.optional() }
  }, (a: any) => safeTool(() => {
    const criteria = [
      ...(a.projectId ? [{ field: "idProject", operator: "=", value: a.projectId }] : []),
      ...(a.statusId ? [{ field: "idStatus", operator: "=", value: a.statusId }] : []),
      ...(a.priorityId ? [{ field: "idPriority", operator: "=", value: a.priorityId }] : []),
      ...(a.resourceId ? [{ field: "idResource", operator: "=", value: a.resourceId }] : [])
    ];
    return criteria.length ? ctx.client.search("Ticket", criteria) : ctx.client.listAll("Ticket");
  }));

  server.registerTool("create_ticket", {
    title: "Create ticket",
    description: "Create a ProjeQtOr Ticket for bug tracking/support. Write payload is AES-CTR encrypted.",
    inputSchema: TicketPayloadSchema.shape
  }, (a: any) => safeTool(() => ctx.client.create("Ticket", mergeExtra(a))));

  server.registerTool("update_ticket", {
    title: "Update ticket",
    description: "Update ticket status, priority, assignment or any ProjeQtOr ticket field.",
    inputSchema: { id: IdSchema, updates: JsonObjectSchema }
  }, (a: any) => safeTool(() => ctx.client.update("Ticket", { id: a.id, ...a.updates })));

  server.registerTool("search_tickets", {
    title: "Advanced ticket search",
    description: "Search Ticket objects with SQL-like criteria supported by ProjeQtOr's /search endpoint. Use for name contains, date ranges or custom fields.",
    inputSchema: { criteria: CriteriaSchema.array().min(1) }
  }, (a: any) => safeTool(() => ctx.client.search("Ticket", a.criteria)));
}
