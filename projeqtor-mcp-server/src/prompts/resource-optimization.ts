import { z } from "zod";

export function registerResourceOptimizationPrompt(server: any): void {
  server.registerPrompt("resource_optimization", {
    title: "Resource optimization",
    description: "Suggest workload and capacity optimizations.",
    argsSchema: { resourceId: z.string().optional(), projectId: z.string().optional(), from: z.string(), to: z.string() }
  }, (args: any) => ({ messages: [{ role: "user", content: { type: "text", text: `Analyze ProjeQtOr resource load from ${args.from} to ${args.to}. ${args.resourceId ? `Use get_resource_workload for resource ${args.resourceId}.` : "Use list_resources then workload tools for relevant resources."} ${args.projectId ? `Focus on project ${args.projectId}.` : ""} Identify overloads, under-utilization, bottleneck skills, reassignment options and schedule trade-offs.` } }] }));
}
