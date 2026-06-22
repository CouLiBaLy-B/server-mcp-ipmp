import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { ticketSchema } from '../schemas/projeqtor-types.js';

// ─── Ticket Management Tools ─────────────────────────────────────────────

export function registerTicketTools(
  server: McpServer,
  client: ProjeqtorApiClient,
  log: Logger,
) {
  // list_tickets
  server.tool(
    'list_tickets',
    'List all tickets (bugs/issues) in ProjeQtOr. Filter by project, status, priority, assignee, or type. Great for getting an overview of open issues.',
    {
      idProject: z.string().optional().describe('Filter by project ID'),
      status: z.string().optional().describe('Filter by ticket status (e.g., "1"=new, "2"=in progress, "3"=resolved)'),
      priority: z.string().optional().describe('Filter by priority (1=lowest, 5=critical)'),
      responsibleId: z.string().optional().describe('Filter by assigned person/resource ID'),
      type: z.string().optional().describe('Filter by ticket type (bug, improvement, etc.)'),
    },
    withErrorHandling(async ({ idProject, status, priority, responsibleId, type }) => {
      const params: Record<string, string> = {};
      if (idProject) params.idProject = idProject;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (responsibleId) params.idResource = responsibleId;
      if (type) params.type = type;

      let tickets = await client.getAll('Ticket', Object.keys(params).length > 0 ? params : undefined);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: (tickets as Array<unknown>).length, tickets }, null, 2),
          },
        ],
      };
    }, 'list_tickets'),
  );

  // create_ticket
  server.tool(
    'create_ticket',
    'Create a new ticket (bug report, issue, or improvement request). Provide the project ID and ticket name at minimum. Include description, priority, and assignee for better tracking.',
    {
      idProject: z.string().describe('Project ID this ticket belongs to'),
      name: z.string().min(1).describe('Ticket title/summary'),
      description: z.string().optional().describe('Detailed description of the ticket'),
      type: z.string().optional().describe('Ticket type (e.g., "1"=bug, "2"=improvement)'),
      priority: z.string().optional().describe('Priority level (1=lowest, 5=critical)'),
      severity: z.string().optional().describe('Severity level'),
      responsibleId: z.string().optional().describe('Resource ID to assign the ticket to'),
      deadline: z.string().optional().describe('Deadline date (YYYY-MM-DD)'),
    },
    withErrorHandling(async (args) => {
      const data = ticketSchema.parse(args);
      const result = await client.create('Ticket', data);
      return {
        content: [{ type: 'text' as const, text: `Ticket created successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'create_ticket'),
  );

  // update_ticket
  server.tool(
    'update_ticket',
    'Update an existing ticket. Change status, priority, assignee, description, or any other field. Provide the ticket ID and only the fields you want to modify.',
    {
      id: z.string().describe('Ticket ID to update'),
      name: z.string().optional().describe('New ticket title'),
      description: z.string().optional().describe('New description'),
      status: z.string().optional().describe('New status (e.g., "1"=new, "2"=in progress, "3"=resolved, "4"=closed)'),
      priority: z.string().optional().describe('New priority level'),
      severity: z.string().optional().describe('New severity level'),
      responsibleId: z.string().optional().describe('New assignee resource ID'),
      deadline: z.string().optional().describe('New deadline'),
    },
    withErrorHandling(async (args) => {
      const { id, ...rest } = args;
      const result = await client.update('Ticket', { id, ...rest });
      return {
        content: [{ type: 'text' as const, text: `Ticket updated successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'update_ticket'),
  );

  // search_tickets
  server.tool(
    'search_tickets',
    'Advanced ticket search using multiple criteria. Combine filters to find specific tickets. Supports searching by text in name/description, date ranges, and exact field matches.',
    {
      idProject: z.string().optional().describe('Search within this project'),
      textSearch: z.string().optional().describe('Free-text search in ticket name and description'),
      status: z.string().optional().describe('Filter by status'),
      priority: z.string().optional().describe('Filter by priority'),
      responsibleId: z.string().optional().describe('Filter by assignee'),
      dateFrom: z.string().optional().describe('Only tickets created after this date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Only tickets created before this date (YYYY-MM-DD)'),
    },
    withErrorHandling(async ({ idProject, textSearch, status, priority, responsibleId, dateFrom, dateTo }) => {
      const params: Record<string, string> = {};
      if (idProject) params.idProject = idProject;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (responsibleId) params.idResource = responsibleId;
      if (dateFrom) params.creationDate = `>=${dateFrom.replace(/-/g, '')}`;
      if (dateTo) params.creationDate = params.creationDate
        ? `${params.creationDate},<=${dateTo.replace(/-/g, '')}`
        : `<=${dateTo.replace(/-/g, '')}`;

      let tickets = await client.getAll('Ticket', Object.keys(params).length > 0 ? params : undefined);

      // Client-side text filtering (API doesn't support full-text search)
      if (textSearch) {
        const lower = textSearch.toLowerCase();
        tickets = (tickets as Array<Record<string, unknown>>).filter(
          (t) =>
            String(t.name ?? '').toLowerCase().includes(lower) ||
            String(t.description ?? '').toLowerCase().includes(lower),
        );
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: (tickets as Array<unknown>).length, tickets }, null, 2),
          },
        ],
      };
    }, 'search_tickets'),
  );
}
