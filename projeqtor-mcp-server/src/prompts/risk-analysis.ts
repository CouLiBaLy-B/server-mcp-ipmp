import { z } from "zod";

export function registerRiskAnalysisPrompt(server: any): void {
  server.registerPrompt("risk_analysis", {
    title: "Risk analysis",
    description: "Analyze and prioritize project risks from ProjeQtOr.",
    argsSchema: { projectId: z.string().describe("Project id"), riskTolerance: z.string().default("medium").describe("low, medium or high tolerance") }
  }, (args: any) => ({ messages: [{ role: "user", content: { type: "text", text: `Call list_risks and list_issues for project ${args.projectId}. Prioritize threats using probability, impact, criticality and age. Risk tolerance is ${args.riskTolerance}. Produce a heat-map style ranking, mitigation quality assessment, owners/actions, escalation candidates and missing data.` } }] }));
}
