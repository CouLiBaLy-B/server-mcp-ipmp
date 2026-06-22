import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { resourceSchema, assignmentSchema } from '../schemas/projeqtor-types.js';

export function registerResourceTools(server: McpServer, client: ProjeqtorApiClient, log: Logger) {
  server.tool(
    'list_resources',
    'List all human resources (team members) available in ProjeQtOr. Filter by type, active status, or profile. Returns resource details including name, email, role, and cost rate.',
    {
      type: z.string().optional().describe('Filter by resource type (e.g., "1"=employee, "2"=contractor)'),
      isActive: z.boolean().optional().describe('Filter by active status'),
      profile: z.string().optional().describe('Filter by profile/role ID'),
    },
    withErrorHandling(async ({ type, isActive, profile }) => {
      const params: Record<string, string> = {};
      if (type) params.resourceType = type;
      if (isActive !== undefined) params.isActive = isActive ? '1' : '0';
      if (profile) params.profile = profile;
      const resources = await client.getAll('Resource', Object.keys(params).length > 0 ? params : undefined);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: (resources as Array<unknown>).length, resources }, null, 2) }] };
    }, 'list_resources'),
  );

  server.tool(
    'assign_resource',
    'Assign a resource (team member) to an activity or project. Specify the resource ID, activity ID, and optionally the amount of work assigned and the assignment dates.',
    {
      idResource: z.string().describe('Resource/team member ID'),
      idActivity: z.string().describe('Activity/task ID to assign to'),
      assignedWork: z.number().optional().describe('Amount of work to assign (in hours)'),
      startDate: z.string().optional().describe('Assignment start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Assignment end date (YYYY-MM-DD)'),
    },
    withErrorHandling(async (args) => {
      const data = assignmentSchema.parse(args);
      const result = await client.create('Assignment', data);
      return { content: [{ type: 'text' as const, text: `Resource assigned successfully:\n${JSON.stringify(result, null, 2)}` }] };
    }, 'assign_resource'),
  );

  server.tool(
    'get_resource_workload',
    'Get the workload and capacity information for a specific resource over a time period. Shows assigned work, actual work done, remaining capacity, and any overallocation issues.',
    {
      idResource: z.string().describe('Resource/team member ID'),
      startDate: z.string().describe('Start date for the period (YYYY-MM-DD)'),
      endDate: z.string().describe('End date for the period (YYYY-MM-DD)'),
    },
    withErrorHandling(async ({ idResource, startDate, endDate }) => {
      const [resource, assignments, works] = await Promise.all([
        client.getById('Resource', idResource),
        client.getAll('Assignment', { idResource }),
        client.getAll('Work', { idResource, startDate: startDate.replace(/-/g, ''), endDate: endDate.replace(/-/g, '') }),
      ]);
      const r = resource as Record<string, unknown>;
      const asgn = assignments as Array<Record<string, unknown>>;
      const wk = works as Array<Record<string, unknown>>;
      const workload = {
        resource: r ?? { id: idResource },
        period: { startDate, endDate },
        assignments: asgn.length,
        workEntries: wk.length,
        totalAssignedWork: asgn.reduce((sum, a) => sum + Number(a.assignedWork ?? a.work ?? 0), 0),
        totalWorkDone: wk.reduce((sum, w) => sum + Number(w.work ?? w.realWork ?? 0), 0),
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(workload, null, 2) }] };
    }, 'get_resource_workload'),
  );
}
