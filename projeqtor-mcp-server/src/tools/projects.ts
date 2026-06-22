import { z } from "zod";
import { ProjectPayloadSchema, IdSchema, JsonObjectSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { mergeExtra, type ToolContext } from "./common.js";

export function registerProjectTools(server: any, ctx: ToolContext): void {
  server.registerTool("list_projects", {
    title: "List ProjeQtOr projects",
    description: "List all projects. Optional filters are applied client-side when ProjeQtOr field names idStatus or idProjectType are present.",
    inputSchema: {
      statusId: IdSchema.optional().describe("Optional status id to filter projects"),
      typeId: IdSchema.optional().describe("Optional project type id to filter projects")
    }
  }, (args: { statusId?: string | number; typeId?: string | number }) => safeTool(async () => {
    const data = await ctx.client.listAll<any>("Project");
    const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : undefined;
    if (!arr) return data;
    return arr.filter((p: any) => (args.statusId === undefined || String(p.idStatus) === String(args.statusId)) && (args.typeId === undefined || String(p.idProjectType) === String(args.typeId)));
  }));

  server.registerTool("get_project", {
    title: "Get project details",
    description: "Get complete details for one ProjeQtOr Project by id.",
    inputSchema: { id: IdSchema }
  }, (args: { id: string | number }) => safeTool(() => ctx.client.getObject("Project", args.id)));

  server.registerTool("create_project", {
    title: "Create project",
    description: "Create a ProjeQtOr Project. Use extra for instance-specific fields. Write payload is AES-CTR encrypted.",
    inputSchema: ProjectPayloadSchema.shape
  }, (args: any) => safeTool(() => ctx.client.create("Project", mergeExtra(args))));

  server.registerTool("update_project", {
    title: "Update project",
    description: "Update an existing ProjeQtOr Project. Include only fields to change plus id. Write payload is AES-CTR encrypted.",
    inputSchema: { id: IdSchema, updates: JsonObjectSchema.describe("Fields to update using native ProjeQtOr names") }
  }, (args: { id: string | number; updates: Record<string, unknown> }) => safeTool(() => ctx.client.update("Project", { id: args.id, ...args.updates })));

  server.registerTool("get_project_kpis", {
    title: "Get project KPIs",
    description: "Return consolidated KPI source data for a project: project details, activities, work logs, expenses and budget when available. The LLM can calculate percentage, cost and schedule indicators from these fields.",
    inputSchema: { id: IdSchema }
  }, (args: { id: string | number }) => safeTool(async () => ({
    project: await ctx.client.getObject("Project", args.id),
    activities: await ctx.client.search("Activity", [{ field: "idProject", operator: "=", value: args.id }]),
    work: await ctx.client.search("Work", [{ field: "idProject", operator: "=", value: args.id }]),
    expenses: await ctx.client.search("Expense", [{ field: "idProject", operator: "=", value: args.id }]).catch((e) => ({ unavailable: true, reason: String(e) })),
    budget: await ctx.client.search("Budget", [{ field: "idProject", operator: "=", value: args.id }]).catch((e) => ({ unavailable: true, reason: String(e) }))
  })));
}
