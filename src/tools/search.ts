import { z } from "zod";
import { CriteriaSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { formatProjeqtorTimestamp, daysAgo } from "../utils/date-utils.js";
import { type ToolContext } from "./common.js";

const defaultClasses = ["Project", "Activity", "Ticket", "Milestone", "Risk", "Opportunity", "Action", "Issue", "Question", "Decision", "Meeting", "Resource", "Document", "Requirement", "TestCase", "TestSession"];

export function registerSearchTools(server: any, ctx: ToolContext): void {
  server.registerTool("global_search", {
    title: "Global ProjeQtOr search",
    description: "Search across multiple ProjeQtOr classes. Uses name LIKE query by default plus optional structured criteria.",
    inputSchema: {
      query: z.string().min(1).describe("Text to search, usually matched against name/title fields"),
      classes: z.array(z.string()).optional().describe("Object classes to search. Defaults to common project-management entities."),
      criteria: z.array(CriteriaSchema).optional().describe("Extra criteria applied to every class")
    }
  }, (a: any) => safeTool(async () => {
    const classes = a.classes?.length ? a.classes : defaultClasses;
    const results: Record<string, unknown> = {};
    await Promise.all(classes.map(async (klass: string) => {
      results[klass] = await ctx.client.search(klass, [{ field: "name", operator: "LIKE", value: a.query }, ...(a.criteria ?? [])]).catch((e) => ({ error: String(e) }));
    }));
    return results;
  }));

  server.registerTool("get_recent_changes", {
    title: "Get recent changes",
    description: "Retrieve objects updated recently for one or more classes using ProjeQtOr /updated/{from}/{to}. Useful for daily standups and change summaries.",
    inputSchema: { days: z.number().int().positive().default(7), classes: z.array(z.string()).optional() }
  }, (a: any) => safeTool(async () => {
    const from = formatProjeqtorTimestamp(daysAgo(a.days));
    const to = formatProjeqtorTimestamp(new Date());
    const classes = a.classes?.length ? a.classes : ["Project", "Activity", "Ticket", "Risk", "Issue", "Meeting", "Document"];
    const results: Record<string, unknown> = {};
    await Promise.all(classes.map(async (klass: string) => { results[klass] = await ctx.client.updated(klass, from, to).catch((e) => ({ error: String(e) })); }));
    return { from, to, results };
  }));
}
