import { z } from "zod";

export function registerSprintReviewPrompt(server: any): void {
  server.registerPrompt("sprint_review_summary", {
    title: "Sprint review summary",
    description: "Create an agile sprint/end-iteration summary from activities and tickets.",
    argsSchema: { projectId: z.string(), sprintName: z.string().optional(), from: z.string(), to: z.string() }
  }, (args: any) => ({ messages: [{ role: "user", content: { type: "text", text: `Prepare a sprint review summary for project ${args.projectId}${args.sprintName ? ` (${args.sprintName})` : ""} from ${args.from} to ${args.to}. Use list_activities, list_tickets, get_recent_changes and project summary. Include delivered items, unfinished work, defects, velocity/work consumed, risks, decisions and improvement actions.` } }] }));
}
