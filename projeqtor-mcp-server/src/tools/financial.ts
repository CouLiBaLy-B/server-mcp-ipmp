import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { expenseSchema } from '../schemas/projeqtor-types.js';

export function registerFinancialTools(server: McpServer, client: ProjeqtorApiClient, log: Logger) {
  server.tool(
    'get_project_budget',
    'Get budget information for a project. Returns planned budget, actual costs, remaining budget, and variance analysis.',
    { idProject: z.string().describe('Project ID to get budget for') },
    withErrorHandling(async ({ idProject }) => {
      const [project, budgets, expenses] = await Promise.all([
        client.getById('Project', idProject),
        client.getAll('Budget', { idProject }),
        client.getAll('Expense', { idProject }),
      ]);
      const p = project as Record<string, unknown>;
      const bg = budgets as Array<Record<string, unknown>>;
      const ex = expenses as Array<Record<string, unknown>>;
      const totalBudget = bg.reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
      const totalExpenses = ex.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
      const plannedBudget = Number(p.budget ?? totalBudget);
      const remainingBudget = plannedBudget - totalExpenses;
      const variance = totalExpenses > 0 ? ((totalExpenses - plannedBudget) / plannedBudget) * 100 : 0;
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            projectId: idProject, projectName: p.name,
            plannedBudget, actualCost: totalExpenses, remainingBudget,
            variancePercent: variance.toFixed(2),
            budgetEntries: budgets, expenseEntries: expenses,
          }, null, 2),
        }],
      };
    }, 'get_project_budget'),
  );

  server.tool(
    'create_expense',
    'Record a new expense for a project. Include the amount, date, type, and description. Expenses are tracked against the project budget.',
    {
      idProject: z.string().describe('Parent project ID'),
      name: z.string().min(1).describe('Expense name/title'),
      amount: z.number().positive().describe('Expense amount (in the project currency)'),
      date: z.string().describe('Expense date (YYYY-MM-DD)'),
      type: z.string().optional().describe('Expense type/category'),
      description: z.string().optional().describe('Detailed description'),
      idResource: z.string().optional().describe('Resource ID who incurred the expense'),
    },
    withErrorHandling(async (args) => {
      const data = expenseSchema.parse(args);
      const result = await client.create('Expense', data);
      return { content: [{ type: 'text' as const, text: `Expense recorded successfully:\n${JSON.stringify(result, null, 2)}` }] };
    }, 'create_expense'),
  );

  server.tool(
    'list_expenses',
    'List all expenses for a project. Filter by date range, type, or resource. Returns a summary of all financial outflows for the project.',
    {
      idProject: z.string().describe('Project ID to list expenses for'),
      dateFrom: z.string().optional().describe('Filter expenses from this date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter expenses until this date (YYYY-MM-DD)'),
      type: z.string().optional().describe('Filter by expense type'),
      idResource: z.string().optional().describe('Filter by resource who incurred the expense'),
    },
    withErrorHandling(async ({ idProject, dateFrom, dateTo, type, idResource }) => {
      const params: Record<string, string> = { idProject };
      if (dateFrom) params.date = '>=' + dateFrom.replace(/-/g, '');
      if (dateTo) params.date = params.date ? params.date + ',<=' + dateTo.replace(/-/g, '') : '<=' + dateTo.replace(/-/g, '');
      if (type) params.type = type;
      if (idResource) params.idResource = idResource;
      const expenses = await client.getAll('Expense', Object.keys(params).length > 0 ? params : undefined);
      const total = (expenses as Array<Record<string, unknown>>).reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: (expenses as Array<unknown>).length, total, expenses }, null, 2) }] };
    }, 'list_expenses'),
  );

  server.tool(
    'get_project_financial_summary',
    'Get a comprehensive financial summary for a project including budget, expenses, cost variance, and profitability indicators.',
    { idProject: z.string().describe('Project ID') },
    withErrorHandling(async ({ idProject }) => {
      const [project, budgets, expenses, works] = await Promise.all([
        client.getById('Project', idProject),
        client.getAll('Budget', { idProject }),
        client.getAll('Expense', { idProject }),
        client.getAll('Work', { idProject }),
      ]);
      const p = project as Record<string, unknown>;
      const totalBudget = (budgets as Array<Record<string, unknown>>).reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
      const totalExpenses = (expenses as Array<Record<string, unknown>>).reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
      const totalWorkHours = (works as Array<Record<string, unknown>>).reduce((sum, w) => sum + Number(w.work ?? 0), 0);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            projectId: idProject, projectName: p.name,
            totalBudget, totalExpenses, remainingBudget: totalBudget - totalExpenses,
            budgetUtilizationPercent: totalBudget > 0 ? ((totalExpenses / totalBudget) * 100).toFixed(1) : 'N/A',
            totalWorkHours,
            costPerHour: totalWorkHours > 0 ? (totalExpenses / totalWorkHours).toFixed(2) : 'N/A',
          }, null, 2),
        }],
      };
    }, 'get_project_financial_summary'),
  );
}
