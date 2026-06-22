import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { meetingSchema, documentSchema } from '../schemas/projeqtor-types.js';

export function registerDocumentMeetingTools(server: McpServer, client: ProjeqtorApiClient, log: Logger) {
  server.tool(
    'list_meetings',
    'List all meetings for a project. Returns meeting details including dates, locations, participants, and agendas. Filter by date range or status.',
    {
      idProject: z.string().optional().describe('Filter by project ID'),
      status: z.string().optional().describe('Filter by status (e.g., "1"=planned, "2"=done, "3"=cancelled)'),
      dateFrom: z.string().optional().describe('Filter meetings from this date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter meetings until this date (YYYY-MM-DD)'),
    },
    withErrorHandling(async ({ idProject, status, dateFrom, dateTo }) => {
      const params: Record<string, string> = {};
      if (idProject) params.idProject = idProject;
      if (status) params.status = status;
      if (dateFrom) params.date = '>=' + dateFrom.replace(/-/g, '');
      if (dateTo) params.date = params.date ? params.date + ',<=' + dateTo.replace(/-/g, '') : '<=' + dateTo.replace(/-/g, '');
      const meetings = await client.getAll('Meeting', Object.keys(params).length > 0 ? params : undefined);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: (meetings as Array<unknown>).length, meetings }, null, 2) }] };
    }, 'list_meetings'),
  );

  server.tool(
    'create_meeting',
    'Create a new meeting. Include name, date, location, and participants. Optionally link to a project and add an agenda/description.',
    {
      name: z.string().min(1).describe('Meeting name/title'),
      idProject: z.string().optional().describe('Related project ID'),
      date: z.string().optional().describe('Meeting date (YYYY-MM-DD)'),
      location: z.string().optional().describe('Meeting location or URL'),
      description: z.string().optional().describe('Agenda or meeting description'),
    },
    withErrorHandling(async (args) => {
      const data = meetingSchema.parse(args);
      const result = await client.create('Meeting', data);
      return { content: [{ type: 'text' as const, text: `Meeting created successfully:\n${JSON.stringify(result, null, 2)}` }] };
    }, 'create_meeting'),
  );

  server.tool(
    'list_documents',
    'List all documents for a project. Filter by type, status, or name. Returns document metadata including name, type, creation date, and associated project.',
    {
      idProject: z.string().optional().describe('Filter by project ID'),
      type: z.string().optional().describe('Filter by document type'),
      nameFilter: z.string().optional().describe('Filter by document name (partial match)'),
    },
    withErrorHandling(async ({ idProject, type, nameFilter }) => {
      const params: Record<string, string> = {};
      if (idProject) params.idProject = idProject;
      if (type) params.type = type;
      let docs = await client.getAll('Document', Object.keys(params).length > 0 ? params : undefined);
      if (nameFilter) {
        const lower = nameFilter.toLowerCase();
        docs = (docs as Array<Record<string, unknown>>).filter((d) => String(d.name ?? '').toLowerCase().includes(lower));
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: (docs as Array<unknown>).length, documents: docs }, null, 2) }] };
    }, 'list_documents'),
  );

  server.tool(
    'list_decisions',
    'List all recorded decisions for a project. Decisions are formal choices made during meetings or project reviews. Filter by status to see pending, approved, or rejected decisions.',
    {
      idProject: z.string().describe('Project ID to list decisions for'),
      status: z.string().optional().describe('Filter by status (e.g., "1"=pending, "2"=approved, "3"=rejected)'),
    },
    withErrorHandling(async ({ idProject, status }) => {
      const params: Record<string, string> = { idProject };
      if (status) params.status = status;
      const decisions = await client.getAll('Decision', params);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: (decisions as Array<unknown>).length, decisions }, null, 2) }] };
    }, 'list_decisions'),
  );

  server.tool(
    'list_questions',
    'List all open questions for a project. Questions are items raised during project execution that need answers or clarification.',
    {
      idProject: z.string().describe('Project ID to list questions for'),
      status: z.string().optional().describe('Filter by status (e.g., "1"=open, "2"=answered, "3"=closed)'),
    },
    withErrorHandling(async ({ idProject, status }) => {
      const params: Record<string, string> = { idProject };
      if (status) params.status = status;
      const questions = await client.getAll('Question', params);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: (questions as Array<unknown>).length, questions }, null, 2) }] };
    }, 'list_questions'),
  );
}
