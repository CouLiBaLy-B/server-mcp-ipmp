import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';

// ─── MCP Resources (read-only data endpoints) ─────────────────────────────────

export function registerResources(
  server: McpServer,
  client: ProjeqtorApiClient,
  log: Logger,
) {
  // projeqtor://projects/{id}/summary
  server.resource(
    'project_summary',
    'projeqtor://projects/{id}/summary',
    {
      mimeType: 'application/json',
      description:
        'Consolidated project summary including KPIs, activity count, risk exposure, and financial status.',
    },
    withErrorHandling(async (uri, params) => {
      const projectId = params?.id ?? String(uri).split('/').pop();
      const [project, activities, risks, tickets, expenses] = await Promise.all([
        client.getById('Project', projectId),
        client.getAll('Activity', { idProject: projectId }),
        client.getAll('Risk', { idProject: projectId }),
        client.getAll('Ticket', { idProject: projectId }),
        client.getAll('Expense', { idProject: projectId }),
      ]);

      const p = project as Record<string, unknown>;
      const acts = activities as Array<Record<string, unknown>>;
      const rsks = risks as Array<Record<string, unknown>>;
      const tkts = tickets as Array<Record<string, unknown>>;
      const exps = expenses as Array<Record<string, unknown>>;

      const activeRisks = rsks.filter((r) => r.status === '1' || r.status === '2');
      const totalRiskExposure = activeRisks.reduce(
        (sum, r) => sum + (Number(r.probability ?? 0) * Number(r.impact ?? 0)),
        0,
      );
      const openTickets = tkts.filter((t) => t.status === '1' || t.status === '2');
      const totalExpenses = exps.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

      return {
        contents: [
          {
            uri: String(uri),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                project: { id: p.id, name: p.name, status: p.status, progress: p.progress ?? 0 },
                kpis: {
                  totalActivities: acts.length,
                  completedActivities: acts.filter((a) => a.status === '3').length,
                  activeRisks: activeRisks.length,
                  totalRiskExposure,
                  openTickets: openTickets.length,
                  totalExpenses,
                  budget: p.budget ?? 0,
                  budgetRemaining: (p.budget ?? 0) - totalExpenses,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    }, 'project_summary_resource'),
  );

  // projeqtor://dashboard/overview
  server.resource(
    'dashboard_overview',
    'projeqtor://dashboard/overview',
    {
      mimeType: 'application/json',
      description:
        'Global dashboard overview across all projects: project count, status breakdown, and progress.',
    },
    withErrorHandling(async (uri) => {
      const projects = await client.getAll('Project');
      const ps = projects as Array<Record<string, unknown>>;

      return {
        contents: [
          {
            uri: String(uri),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                totalProjects: ps.length,
                activeProjects: ps.filter((p) => p.status === '1').length,
                closedProjects: ps.filter((p) => p.status === '3' || p.status === '4').length,
                projects: ps.map((p) => ({
                  id: p.id,
                  name: p.name,
                  status: p.status,
                  progress: p.progress ?? 0,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    }, 'dashboard_overview_resource'),
  );

  // projeqtor://reference/statuses
  server.resource(
    'reference_statuses',
    'projeqtor://reference/statuses',
    {
      mimeType: 'application/json',
      description: 'List of all available status codes and their meanings across ProjeQtOr entities.',
    },
    withErrorHandling(async (uri) => {
      const statuses = await client.getAll('Status');
      return {
        contents: [
          {
            uri: String(uri),
            mimeType: 'application/json',
            text: JSON.stringify({ statuses }, null, 2),
          },
        ],
      };
    }, 'reference_statuses_resource'),
  );

  // projeqtor://reference/types
  server.resource(
    'reference_types',
    'projeqtor://reference/types',
    {
      mimeType: 'application/json',
      description: 'List of all available type codes (project types, activity types, ticket types, etc.).',
    },
    withErrorHandling(async (uri) => {
      const [typeProject, typeActivity, typeTicket] = await Promise.all([
        client.getAll('TypeProject'),
        client.getAll('TypeActivity'),
        client.getAll('TypeTicket'),
      ]);

      return {
        contents: [
          {
            uri: String(uri),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                projectTypes: typeProject,
                activityTypes: typeActivity,
                ticketTypes: typeTicket,
              },
              null,
              2,
            ),
          },
        ],
      };
    }, 'reference_types_resource'),
  );

  // projeqtor://resources/{id}/availability
  server.resource(
    'resource_availability',
    'projeqtor://resources/{id}/availability',
    {
      mimeType: 'application/json',
      description:
        'Availability information for a specific resource: current assignments, workload, and capacity.',
    },
    withErrorHandling(async (uri, params) => {
      const resourceId = params?.id ?? String(uri).split('/').pop();
      const [resource, assignments] = await Promise.all([
        client.getById('Resource', resourceId),
        client.getAll('Assignment', { idResource: resourceId }),
      ]);

      const r = resource as Record<string, unknown>;
      const asgn = assignments as Array<Record<string, unknown>>;
      const totalAssignedHours = asgn.reduce((sum, a) => sum + Number(a.assignedWork ?? 0), 0);

      return {
        contents: [
          {
            uri: String(uri),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                resource: { id: r.id, name: r.name, type: r.type, email: r.email },
                activeAssignments: asgn.filter((a) => !a.endDate || new Date(a.endDate) >= new Date()).length,
                totalAssignedHours,
                availableCapacity: Math.max(0, (Number(r.capacity ?? 35) * 4) - totalAssignedHours),
                assignments: asgn.slice(0, 20),
              },
              null,
              2,
            ),
          },
        ],
      };
    }, 'resource_availability_resource'),
  );
}
