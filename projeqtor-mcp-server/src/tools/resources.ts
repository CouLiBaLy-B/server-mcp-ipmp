import { z } from "zod";
import { IdSchema, JsonObjectSchema, DateSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { type ToolContext } from "./common.js";

export function registerResourceTools(server: any, ctx: ToolContext): void {
  server.registerTool("list_resources", {
    title: "List resources",
    description: "List ProjeQtOr Resource objects, optionally only active resources when the isResource/isContact fields are present.",
    inputSchema: { activeOnly: z.boolean().default(true).describe("Filter out inactive resources when data exposes idle flag") }
  }, (a: any) => safeTool(async () => {
    const data = await ctx.client.listAll<any>("Resource");
    const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : undefined;
    return a.activeOnly && arr ? arr.filter((r: any) => r.idle !== "1" && r.isResource !== "0") : data;
  }));

  server.registerTool("assign_resource", {
    title: "Assign resource to activity",
    description: "Create an Assignment linking a resource to an activity with optional planned work/rate. Write payload is AES-CTR encrypted.",
    inputSchema: { activityId: IdSchema, resourceId: IdSchema, assignedWork: z.number().nonnegative().optional(), rate: z.number().nonnegative().optional(), extra: JsonObjectSchema.optional() }
  }, (a: any) => safeTool(() => ctx.client.create("Assignment", { idActivity: a.activityId, idResource: a.resourceId, assignedWork: a.assignedWork, rate: a.rate, ...(a.extra ?? {}) })));

  server.registerTool("get_resource_workload", {
    title: "Get resource workload",
    description: "Return assignments and work logs for a resource over a period so the LLM can analyze load/capacity.",
    inputSchema: { resourceId: IdSchema, from: DateSchema, to: DateSchema }
  }, (a: any) => safeTool(async () => ({
    resource: await ctx.client.getObject("Resource", a.resourceId),
    assignments: await ctx.client.search("Assignment", [{ field: "idResource", operator: "=", value: a.resourceId }]),
    work: await ctx.client.search("Work", [
      { field: "idResource", operator: "=", value: a.resourceId },
      { field: "workDate", operator: ">=", value: a.from },
      { field: "workDate", operator: "<=", value: a.to }
    ])
  })));

  server.registerTool("log_work", {
    title: "Log work/time entry",
    description: "Create a Work time entry for a resource on an activity. Use this for timesheet entry. Write payload is AES-CTR encrypted.",
    inputSchema: { activityId: IdSchema, resourceId: IdSchema, workDate: DateSchema, work: z.number().positive().describe("Worked amount, usually in days"), comment: z.string().optional(), extra: JsonObjectSchema.optional() }
  }, (a: any) => safeTool(() => ctx.client.create("Work", { idActivity: a.activityId, idResource: a.resourceId, workDate: a.workDate, work: a.work, comment: a.comment, ...(a.extra ?? {}) })));
}
