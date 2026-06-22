import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { resourceSchema, assignmentSchema } from '../schemas/projeqtor-types.js';

// ─── Resource & Assignment Tools ─────────────────────────────────────────────

export function registerResourceTools(
  server: McpServer,
  client: ProjeqtorApiClient,
  log: Logger,
) {
  // list_resources
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

      let resources = await client.getAll('Resource', Object.keys(params).length > 0 ? params : undefined);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: (resources as Array<unknown>).length, resources }, null, 2),
          },
        ],
      };
    }, 'list_resources'),
  );

  // assign_resource
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
      return {
        content: [{ type: 'text' as const, text: `Resource assigned successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'assign_resource'),
  );

  // get_resource_workload
  server.tool(
    'get_resource_workload',
    'Get the workload and capacity information for a specific resource over a time period. Shows assigned work, actual work done, remaining capacity, and any overallocation issues.',
    {
      idResource: z.string().describe('Resource/team member ID'),
      startDate: z.string().describe('Start date for the period (YYYY-MM-DD)'),
      endDate: z.string().describe('End date for the period (YYYY-MM-DD)'),
    },
    withErrorHandling(async ({ idResource, startDate, endDate }) => {
      const params: Record<string, string> = {
        idResource,
        startDate: startDate.replace(/-/g, ''),
        endDate: endDate.replace(/-/g, ''),
      };

      // Get assignments for the resource
      const assignments = await client.getAll('Assignment', { idResource });

      // Get work entries for the period
      const works = await client.getAll('Work', {
        idResource,
        startDate: startDate.replace(/-/g, ''),
        endDate: endDate.replace(/-/g, ''),
      });

      // Get resource details
      const resource = await client.getById('Resource', idResource);

      const workload = {
        resource: (resource as Record<string, unknown>) ?? { id: idResource },
        period: { startDate, endDate },
        assignments: (assignments as Array<unknown>).length,
        workEntries: (works as Array<unknown>).length,
        totalAssignedWork: (assignments as Array<Record<string, unknown>>).reduce(
          (sum, a) => sum + Number(a.assignedWork ?? a.work ?? 0),
          0,
        ),
        totalWorkDone: (works as Array<Record<string, unknown>>).reduce(
          (sum, w) => sum + Number(w.work ?? w.realWork ?? 0),
          0,
        ),
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(workload, null, 2) }],
      };
    }, 'get_resource_workload'),
  );
}
