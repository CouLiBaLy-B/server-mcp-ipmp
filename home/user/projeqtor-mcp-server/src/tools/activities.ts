import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { activitySchema } from '../schemas/projeqtor-types.js';

// ─── Activity & Planning Tools ─────────────────────────────────────────────

export function registerActivityTools(
  server: McpServer,
  client: ProjeqtorApiClient,
  log: Logger,
) {
  // list_activities
  server.tool(
    'list_activities',
    'List all activities (tasks) for a given project. You can filter by status, type, or responsible person. Returns activities with their dates, progress, and assigned work.',
    {
      idProject: z.string().describe('The project ID to list activities for'),
      status: z.string().optional().describe('Filter by activity status'),
      type: z.string().optional().describe('Filter by activity type'),
      responsibleId: z.string().optional().describe('Filter by assigned resource ID'),
    },
    withErrorHandling(async ({ idProject, status, type, responsibleId }) => {
      const activities = await client.getAll('Activity', { idProject });
      let filtered = activities as Array<Record<string, unknown>>;

      if (status) filtered = filtered.filter((a) => a.status === status);
      if (type) filtered = filtered.filter((a) => a.type === type);
      if (responsibleId) filtered = filtered.filter((a) => a.responsibleId === responsibleId);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: filtered.length, activities: filtered }, null, 2),
          },
        ],
      };
    }, 'list_activities'),
  );

  // create_activity
  server.tool(
    'create_activity',
    'Create a new activity (task) within a project. Provide the project ID and activity name at minimum. You can also set dates, estimated work, cost, and assign a responsible person.',
    {
      idProject: z.string().describe('Parent project ID'),
      name: z.string().min(1).describe('Activity name'),
      description: z.string().optional().describe('Activity description'),
      type: z.string().optional().describe('Activity type'),
      priority: z.string().optional().describe('Priority (1-5)'),
      plannedStartDate: z.string().optional().describe('Planned start date (YYYY-MM-DD)'),
      plannedEndDate: z.string().optional().describe('Planned end date (YYYY-MM-DD)'),
      work: z.number().optional().describe('Estimated work (in days)'),
      responsibleId: z.string().optional().describe('Responsible resource ID'),
      parentId: z.string().optional().describe('Parent activity ID for sub-tasks'),
    },
    withErrorHandling(async (args) => {
      const data = activitySchema.parse(args);
      const result = await client.create('Activity', data);
      return {
        content: [{ type: 'text' as const, text: `Activity created successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'create_activity'),
  );

  // update_activity
  server.tool(
    'update_activity',
    'Update an existing activity. Provide the activity ID and only the fields you want to change. Common updates include changing status, progress, dates, or assigned work.',
    {
      id: z.string().describe('Activity ID to update'),
      name: z.string().optional().describe('New activity name'),
      description: z.string().optional().describe('New description'),
      status: z.string().optional().describe('New status'),
      progress: z.number().min(0).max(100).optional().describe('New progress percentage'),
      plannedStartDate: z.string().optional().describe('New planned start date'),
      plannedEndDate: z.string().optional().describe('New planned end date'),
      realStartDate: z.string().optional().describe('New actual start date'),
      realEndDate: z.string().optional().describe('New actual end date'),
      work: z.number().optional().describe('New estimated work (days)'),
      realWork: z.number().optional().describe('New actual work (days)'),
      remainingWork: z.number().optional().describe('New remaining work (days)'),
      responsibleId: z.string().optional().describe('New responsible resource ID'),
    },
    withErrorHandling(async (args) => {
      const { id, ...rest } = args;
      const result = await client.update('Activity', { id, ...rest });
      return {
        content: [{ type: 'text' as const, text: `Activity updated successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'update_activity'),
  );

  // get_gantt_data
  server.tool(
    'get_gantt_data',
    'Retrieve Gantt chart data for a project. Returns all activities with their planned start/end dates, durations, dependencies, and progress — suitable for building a Gantt visualization.',
    {
      idProject: z.string().describe('The project ID to get Gantt data for'),
      includeDependencies: z.boolean().optional().default(true).describe('Whether to include dependency information'),
    },
    withErrorHandling(async ({ idProject, includeDependencies }) => {
      const activities = await client.getAll('Activity', { idProject });
      const ganttData = (activities as Array<Record<string, unknown>>).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        startDate: a.plannedStartDate,
        endDate: a.plannedEndDate,
        progress: a.progress ?? 0,
        parentId: a.idActivity ?? null,
        dependencies: includeDependencies ? a.dependencyIds ?? [] : undefined,
      }));

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ idProject, activities: ganttData }, null, 2) }],
      };
    }, 'get_gantt_data'),
  );

  // add_dependency
  server.tool(
    'add_dependency',
    'Add a dependency between two activities. The predecessor activity must be completed before the successor can start. Use this to build the project schedule network.',
    {
      predecessorId: z.string().describe('ID of the activity that must finish first'),
      successorId: z.string().describe('ID of the activity that depends on the predecessor'),
      dependencyType: z.enum(['FS', 'FF', 'SS', 'SF']).optional().default('FS').describe('Dependency type: FS=Finish-Start, FF=Finish-Finish, SS=Start-Start, SF=Start-Finish'),
      lag: z.number().optional().default(0).describe('Lag time in days (can be negative for lead time)'),
    },
    withErrorHandling(async ({ predecessorId, successorId, dependencyType, lag }) => {
      const depData = {
        idActivityPredecessor: predecessorId,
        idActivitySuccessor: successorId,
        dependencyType,
        lag,
      };
      const result = await client.create('Dependency', depData);
      return {
        content: [{ type: 'text' as const, text: `Dependency added successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'add_dependency'),
  );
}
