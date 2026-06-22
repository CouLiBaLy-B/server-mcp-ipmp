import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { projectSchema } from '../schemas/projeqtor-types.js';

export function registerProjectTools(server: McpServer, client: ProjeqtorApiClient, log: Logger) {
  server.tool(
    'list_projects',
    'List all projects in ProjeQtOr. Optionally filter by status and/or project type. Returns a summary of each project with key details.',
    {
      status: z.string().optional().describe('Filter by project status (e.g., "1" for active, "2" for closed)'),
      type: z.string().optional().describe('Filter by project type'),
      nameFilter: z.string().optional().describe('Filter by project name (partial match)'),
    },
    withErrorHandling(async ({ status, type, nameFilter }) => {
      const params: Record<string, string> = {};
      if (status) params.projectStatus = status;
      if (type) params.projectType = type;
      let projects = await client.getAll('Project', Object.keys(params).length > 0 ? params : undefined);
      if (nameFilter) {
        const lower = nameFilter.toLowerCase();
        projects = (projects as Array<Record<string, unknown>>).filter((p) => String(p.name ?? '').toLowerCase().includes(lower));
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: projects.length, projects }, null, 2) }] };
    }, 'list_projects'),
  );

  server.tool(
    'get_project',
    'Get full details of a specific project by its ID. Returns all project fields including description, dates, budget, progress, and manager information.',
    { id: z.string().describe('The unique project ID') },
    withErrorHandling(async ({ id }) => {
      const project = await client.getById('Project', id);
      return { content: [{ type: 'text' as const, text: JSON.stringify(project, null, 2) }] };
    }, 'get_project'),
  );

  server.tool(
    'create_project',
    'Create a new project in ProjeQtOr. Provide at minimum a name. Optional fields include description, type, dates, budget, and client. All dates must be in YYYY-MM-DD format.',
    {
      name: z.string().min(1).describe('Project name (required)'),
      description: z.string().optional().describe('Project description'),
      type: z.string().optional().describe('Project type'),
      status: z.string().optional().describe('Initial status (default is "1" for active)'),
      priority: z.string().optional().describe('Priority level (1=lowest, 5=highest)'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
      budget: z.number().optional().describe('Project budget'),
      clientId: z.string().optional().describe('Client ID'),
      projectManagerId: z.string().optional().describe('Project manager resource ID'),
    },
    withErrorHandling(async (args) => {
      const data = projectSchema.parse(args);
      const result = await client.create('Project', data);
      return { content: [{ type: 'text' as const, text: `Project created successfully:\n${JSON.stringify(result, null, 2)}` }] };
    }, 'create_project'),
  );

  server.tool(
    'update_project',
    'Update an existing project. Provide the project ID and any fields you want to modify. Only include fields that need changing — unspecified fields will not be modified. Dates must be in YYYY-MM-DD format.',
    {
      id: z.string().describe('The unique project ID to update'),
      name: z.string().optional().describe('New project name'),
      description: z.string().optional().describe('New description'),
      type: z.string().optional().describe('New project type'),
      status: z.string().optional().describe('New status'),
      priority: z.string().optional().describe('New priority'),
      progress: z.number().min(0).max(100).optional().describe('New progress percentage'),
      startDate: z.string().optional().describe('New start date'),
      endDate: z.string().optional().describe('New end date'),
      budget: z.number().optional().describe('New budget'),
    },
    withErrorHandling(async (args) => {
      const { id, ...rest } = args;
      const result = await client.update('Project', { id, ...rest });
      return { content: [{ type: 'text' as const, text: `Project updated successfully:\n${JSON.stringify(result, null, 2)}` }] };
    }, 'update_project'),
  );

  server.tool(
    'get_project_kpis',
    'Get KPIs and progress metrics for a specific project. Returns progress percentage, planned vs actual cost and work, schedule variance, and other key performance indicators.',
    { id: z.string().describe('The unique project ID') },
    withErrorHandling(async ({ id }) => {
      const project = await client.getById('Project', id);
      const p = project as Record<string, unknown>;
      const kpis = {
        projectId: id, name: p.name ?? 'Unknown', progress: p.progress ?? 0,
        plannedStartDate: p.plannedStartDate ?? null, plannedEndDate: p.plannedEndDate ?? null,
        realStartDate: p.realStartDate ?? null, realEndDate: p.realEndDate ?? null,
        plannedWork: p.plannedWork ?? 0, realWork: p.realWork ?? 0, remainingWork: p.remainingWork ?? 0,
        plannedCost: p.budget ?? p.plannedCost ?? 0, realCost: p.realCost ?? 0,
        status: p.projectStatus ?? p.status ?? 'unknown',
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(kpis, null, 2) }] };
    }, 'get_project_kpis'),
  );
}
