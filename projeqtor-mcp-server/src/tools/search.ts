import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { daysAgo, now } from '../utils/date-utils.js';

const SEARCHABLE_CLASSES = [
  'Project', 'Activity', 'Ticket', 'Milestone', 'Risk', 'Opportunity',
  'Action', 'Issue', 'Question', 'Decision', 'Meeting', 'Resource',
  'Assignment', 'Work', 'Document', 'Expense', 'Budget',
] as const;

export function registerSearchTools(server: McpServer, client: ProjeqtorApiClient, log: Logger) {
  server.tool(
    'global_search',
    'Search across ALL ProjeQtOr entities for objects matching a text pattern. This searches names and descriptions of projects, activities, tickets, risks, resources, and more. Use this when you don\'t know which entity type contains what you\'re looking for. Returns results grouped by entity type.',
    {
      searchTerm: z.string().min(2).describe('Text to search for in names and descriptions'),
      classes: z.array(z.enum(SEARCHABLE_CLASSES)).optional().describe('Limit search to specific entity classes. If omitted, searches all classes.'),
      idProject: z.string().optional().describe('Limit search to a specific project'),
    },
    withErrorHandling(async ({ searchTerm, classes, idProject }) => {
      const targets = classes ?? SEARCHABLE_CLASSES;
      const results: Record<string, unknown[]> = {};
      await Promise.all(
        targets.map(async (objectClass) => {
          try {
            const params: Record<string, string> = {};
            if (idProject) params.idProject = idProject;
            const items = await client.getAll(objectClass, Object.keys(params).length > 0 ? params : undefined);
            const lower = searchTerm.toLowerCase();
            const matched = (items as Array<Record<string, unknown>>).filter(
              (item) => String(item.name ?? '').toLowerCase().includes(lower) || String(item.description ?? '').toLowerCase().includes(lower),
            );
            if (matched.length > 0) results[objectClass] = matched;
          } catch { /* skip */ }
        }),
      );
      const totalHits = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ searchTerm, totalHits, results }, null, 2) }] };
    }, 'global_search'),
  );

  server.tool(
    'get_recent_changes',
    'Get all objects modified in ProjeQtOr within a recent time window. Useful for change tracking, audit, and staying up-to-date with project activity. Specify the number of days to look back (default: 7).',
    {
      daysBack: z.number().int().positive().default(7).describe('Number of days to look back for changes (1-365)'),
      objectClass: z.enum(SEARCHABLE_CLASSES).optional().describe('Limit to a specific entity class. If omitted, returns changes for Projects, Activities, and Tickets only.'),
    },
    withErrorHandling(async ({ daysBack, objectClass }) => {
      const from = daysAgo(Math.min(daysBack, 365));
      const to = now();
      const targets = objectClass ? [objectClass] : (['Project', 'Activity', 'Ticket'] as const);
      const results: Record<string, unknown[]> = {};
      await Promise.all(
        targets.map(async (cls) => {
          try {
            const items = await client.getUpdated(cls, from, to);
            if ((items as Array<unknown>).length > 0) results[cls] = items as unknown[];
          } catch { /* skip */ }
        }),
      );
      const totalChanges = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ period: { from, to, daysBack: Math.min(daysBack, 365) }, totalChanges, changes: results }, null, 2),
        }],
      };
    }, 'get_recent_changes'),
  );
}
