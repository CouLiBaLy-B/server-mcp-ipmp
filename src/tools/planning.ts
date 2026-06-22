import { IdSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { type ToolContext } from "./common.js";

export function registerPlanningTools(server: any, ctx: ToolContext): void {
  server.registerTool("get_project_planning_snapshot", {
    title: "Get planning snapshot",
    description: "Return activities, milestones, assignments and dependencies for a project as a planning snapshot.",
    inputSchema: { projectId: IdSchema }
  }, (a: any) => safeTool(async () => ({
    activities: await ctx.client.search("Activity", [{ field: "idProject", operator: "=", value: a.projectId }]),
    milestones: await ctx.client.search("Milestone", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    assignments: await ctx.client.search("Assignment", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    dependencies: await ctx.client.search("Dependency", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => [])
  })));
}
