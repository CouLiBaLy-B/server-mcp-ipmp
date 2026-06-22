import { z } from "zod";
import { IdSchema, JsonObjectSchema, DateSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { type ToolContext } from "./common.js";

export function registerMeetingTools(server: any, ctx: ToolContext): void {
  server.registerTool("list_meetings", {
    title: "List meetings",
    description: "List Meeting objects for a project, optionally since a date.",
    inputSchema: { projectId: IdSchema.optional(), since: DateSchema.optional() }
  }, (a: any) => safeTool(() => {
    const criteria = [
      ...(a.projectId ? [{ field: "idProject", operator: "=", value: a.projectId }] : []),
      ...(a.since ? [{ field: "meetingDate", operator: ">=", value: a.since }] : [])
    ];
    return criteria.length ? ctx.client.search("Meeting", criteria) : ctx.client.listAll("Meeting");
  }));

  server.registerTool("create_meeting", {
    title: "Create meeting",
    description: "Create a Meeting record with date, project and description/agenda.",
    inputSchema: { name: z.string().min(1), projectId: IdSchema.optional(), meetingDate: DateSchema, description: z.string().optional(), extra: JsonObjectSchema.optional() }
  }, (a: any) => safeTool(() => ctx.client.create("Meeting", { name: a.name, idProject: a.projectId, meetingDate: a.meetingDate, description: a.description, ...(a.extra ?? {}) })));

  server.registerTool("list_decisions", {
    title: "List decisions/questions",
    description: "List project Decisions and Questions for governance follow-up.",
    inputSchema: { projectId: IdSchema }
  }, (a: any) => safeTool(async () => ({
    decisions: await ctx.client.search("Decision", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    questions: await ctx.client.search("Question", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => [])
  })));
}
