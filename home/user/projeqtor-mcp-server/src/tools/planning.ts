import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { workSchema } from '../schemas/projeqtor-types.js';
import { daysBetween, now as nowPq, toProjeqtorDate } from '../utils/date-utils.js';

// ─── Planning & Timesheet Tools ─────────────────────────────────────────────────

export function registerPlanningTools(
  server: McpServer,
  client: ProjeqtorApiClient,
  log: Logger,
) {
  // log_work
  server.tool(
    'log_work',
    'Record time worked (timesheet entry) on an activity or task. Specify the resource, activity, date, and duration in hours. This is the primary way to track actual effort spent.',
    {
      idResource: z.string().describe('Resource/team member ID who did the work'),
      idActivity: z.string().describe('Activity/task ID the work was done on'),
      date: z.string().describe('Date of work (YYYY-MM-DD)'),
      work: z.number().positive().describe('Duration of work in hours'),
      description: z.string().optional().describe('Description of the work performed'),
      idAssignment: z.string().optional().describe('Assignment ID (if known)'),
    },
    withErrorHandling(async (args) => {
      const data = workSchema.parse(args);
      const result = await client.create('Work', data);
      return {
        content: [{ type: 'text' as const, text: `Time logged successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'log_work'),
  );

  // get_timesheet
  server.tool(
    'get_timesheet',
    'Get timesheet/work entries for a resource over a specific period. Shows all logged work with dates, activities, and durations. Useful for reviewing time entries and validating timesheets.',
    {
      idResource: z.string().describe('Resource/team member ID'),
      startDate: z.string().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().describe('End date (YYYY-MM-DD)'),
    },
    withErrorHandling(async ({ idResource, startDate, endDate }) => {
      const days = daysBetween(
        toProjeqtorDate(new Date(startDate)),
        toProjeqtorDate(new Date(endDate)),
      );

      const works = await client.getAll('Work', {
        idResource,
        date: `>=${startDate.replace(/-/g, '')},<=${endDate.replace(/-/g, '')}`,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                idResource,
                period: { startDate, endDate, totalDays: days },
                entries: works,
                totalHours: (works as Array<Record<string, unknown>>).reduce(
                  (sum, w) => sum + Number(w.work ?? 0),
                  0,
                ),
              },
              null,
              2,
            ),
          },
        ],
      };
    }, 'get_timesheet'),
  );

  // get_planning
  server.tool(
    'get_planning',
    'Get the planning/schedule for a project. Returns all activities with their planned dates, actual dates, progress, and dependencies. This is essentially the project schedule view.',
    {
      idProject: z.string().describe('Project ID'),
      includeClosed: z.boolean().optional().default(false).describe('Whether to include closed/completed activities'),
    },
    withErrorHandling(async ({ idProject, includeClosed }) => {
      const activities = await client.getAll('Activity', { idProject });

      let filtered = activities as Array<Record<string, unknown>>;
      if (!includeClosed) {
        filtered = filtered.filter((a) => {
          const status = String(a.status ?? '');
          return status !== '3' && status !== '4'; // Assuming 3=done, 4=closed
        });
      }

      const planning = filtered.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        plannedStart: a.plannedStartDate,
        plannedEnd: a.plannedEndDate,
        realStart: a.realStartDate,
        realEnd: a.realEndDate,
        progress: a.progress ?? 0,
        status: a.status,
        responsibleId: a.responsibleId,
        parentId: a.parentId,
      }));

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ idProject, activities: planning }, null, 2) }],
      };
    }, 'get_planning'),
  );
}
