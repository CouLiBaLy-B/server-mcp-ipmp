import { z } from "zod";
import { IdSchema, JsonObjectSchema, DateSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { type ToolContext } from "./common.js";

export function registerFinancialTools(server: any, ctx: ToolContext): void {
  server.registerTool("get_project_budget", {
    title: "Get project budget",
    description: "Return Budget, Expense, Quotation, Order, Bill and Payment data linked to a project for financial analysis.",
    inputSchema: { projectId: IdSchema }
  }, (a: any) => safeTool(async () => ({
    budgets: await ctx.client.search("Budget", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    expenses: await ctx.client.search("Expense", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    quotations: await ctx.client.search("Quotation", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    orders: await ctx.client.search("Order", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    bills: await ctx.client.search("Bill", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => []),
    payments: await ctx.client.search("Payment", [{ field: "idProject", operator: "=", value: a.projectId }]).catch(() => [])
  })));

  server.registerTool("create_expense", {
    title: "Create expense",
    description: "Record an Expense for a project. Use extra for type/provider/currency fields specific to your ProjeQtOr configuration.",
    inputSchema: { projectId: IdSchema, name: z.string().min(1), amount: z.number().nonnegative(), expenseDate: DateSchema.optional(), description: z.string().optional(), extra: JsonObjectSchema.optional() }
  }, (a: any) => safeTool(() => ctx.client.create("Expense", { idProject: a.projectId, name: a.name, amount: a.amount, expenseDate: a.expenseDate, description: a.description, ...(a.extra ?? {}) })));
}
