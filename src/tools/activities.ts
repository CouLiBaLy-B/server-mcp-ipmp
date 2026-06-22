import { z } from "zod";
import { ActivityPayloadSchema, IdSchema, JsonObjectSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { mergeExtra, type ToolContext } from "./common.js";

export function registerActivityTools(server: any, ctx: ToolContext): void {
  server.registerTool("list_activities", {
    title: "List activities for a project",
    description: "List ProjeQtOr Activity objects for a project, optionally filtered by status or responsible resource.",
    inputSchema: { projectId: IdSchema, statusId: IdSchema.optional(), resourceId: IdSchema.optional() }
  }, (a: any) => safeTool(() => ctx.client.search("Activity", [
    { field: "idProject", operator: "=", value: a.projectId },
    ...(a.statusId ? [{ field: "idStatus", operator: "=", value: a.statusId }] : []),
    ...(a.resourceId ? [{ field: "idResource", operator: "=", value: a.resourceId }] : [])
  ])));

  server.registerTool("create_activity", {
    title: "Create activity/task",
    description: "Create a ProjeQtOr Activity task in a project. Write payload is AES-CTR encrypted.",
    inputSchema: ActivityPayloadSchema.shape
  }, (a: any) => safeTool(() => ctx.client.create("Activity", mergeExtra(a))));

  server.registerTool("update_activity", {
    title: "Update activity/task",
    description: "Update dates, planned work, status, resource or any native ProjeQtOr Activity field.",
    inputSchema: { id: IdSchema, updates: JsonObjectSchema }
  }, (a: any) => safeTool(() => ctx.client.update("Activity", { id: a.id, ...a.updates })));

  server.registerTool("get_gantt_data", {
    title: "Get Gantt data",
    description: "Get project activities and dependencies used to build a Gantt chart. Returns raw Activity and Dependency/Link data where available.",
    inputSchema: { projectId: IdSchema }
  }, (a: any) => safeTool(async () => ({
    activities: await ctx.client.search("Activity", [{ field: "idProject", operator: "=", value: a.projectId }]),
    milestones: await ctx.client.search("Milestone", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    dependencies: await ctx.client.search("Dependency", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => [])
  })));

  server.registerTool("add_dependency", {
    title: "Add dependency between activities",
    description: "Create a dependency/link between two activities. Field names vary by ProjeQtOr version; extra overrides are supported.",
    inputSchema: {
      predecessorActivityId: IdSchema.describe("Activity that must finish/start first"),
      successorActivityId: IdSchema.describe("Dependent activity"),
      dependencyType: z.string().default("FS").describe("Dependency type, typically FS/SS/FF/SF depending on instance configuration"),
      extra: JsonObjectSchema.optional()
    }
  }, (a: any) => safeTool(() => ctx.client.create("Dependency", {
    idActivityPredecessor: a.predecessorActivityId,
    idActivitySuccessor: a.successorActivityId,
    dependencyType: a.dependencyType,
    ...(a.extra ?? {})
  })));
}
