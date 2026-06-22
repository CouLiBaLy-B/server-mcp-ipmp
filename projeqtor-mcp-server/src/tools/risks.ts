import { IdSchema, RiskPayloadSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { mergeExtra, type ToolContext } from "./common.js";

export function registerRiskTools(server: any, ctx: ToolContext): void {
  server.registerTool("list_risks", {
    title: "List project risks",
    description: "List Risk objects for a project, optionally filtered by status.",
    inputSchema: { projectId: IdSchema, statusId: IdSchema.optional() }
  }, (a: any) => safeTool(() => ctx.client.search("Risk", [
    { field: "idProject", operator: "=", value: a.projectId },
    ...(a.statusId ? [{ field: "idStatus", operator: "=", value: a.statusId }] : [])
  ])));

  server.registerTool("create_risk", {
    title: "Create risk",
    description: "Create a ProjeQtOr Risk with impact/probability/criticality and mitigation/action plan. Write payload is AES-CTR encrypted.",
    inputSchema: RiskPayloadSchema.shape
  }, (a: any) => safeTool(() => ctx.client.create("Risk", mergeExtra({ ...a, description: a.mitigationPlan ?? a.description }))));

  server.registerTool("list_issues", {
    title: "List open issues",
    description: "List Issue objects for a project, optionally status-filtered. Use for active problems/blockers follow-up.",
    inputSchema: { projectId: IdSchema, statusId: IdSchema.optional() }
  }, (a: any) => safeTool(() => ctx.client.search("Issue", [
    { field: "idProject", operator: "=", value: a.projectId },
    ...(a.statusId ? [{ field: "idStatus", operator: "=", value: a.statusId }] : [])
  ])));
}
