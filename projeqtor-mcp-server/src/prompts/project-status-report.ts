import { z } from "zod";

export function registerProjectStatusReportPrompt(server: any): void {
  server.registerPrompt("project_status_report", {
    title: "Project status report",
    description: "Generate a complete project progress report from ProjeQtOr data.",
    argsSchema: { projectId: z.string().describe("Project id"), period: z.string().optional().describe("Reporting period, e.g. this week/month") }
  }, (args: any) => ({ messages: [{ role: "user", content: { type: "text", text: `Use get_project_kpis and projeqtor://projects/${args.projectId}/summary to write a concise status report for project ${args.projectId}${args.period ? ` for ${args.period}` : ""}. Include scope, schedule, cost, work consumed vs planned, key completed/late activities, tickets, risks/issues, decisions needed and next actions.` } }] }));
}
