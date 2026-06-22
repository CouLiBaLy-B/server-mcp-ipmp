import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProjeqtorApiClient } from '../client/projeqtor-api.js';
import type { Logger } from '../config.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { riskSchema, issueSchema } from '../schemas/projeqtor-types.js';

// ─── Risk & Issue Management Tools ─────────────────────────────────────────────

export function registerRiskTools(
  server: McpServer,
  client: ProjeqtorApiClient,
  log: Logger,
) {
  // list_risks
  server.tool(
    'list_risks',
    'List all risks for a project. Each risk has a probability and impact score, allowing you to calculate risk exposure (probability × impact). Filter by status to see only active risks.',
    {
      idProject: z.string().describe('Project ID to list risks for'),
      status: z.string().optional().describe('Filter by risk status (e.g., "1"=identified, "2"=mitigated, "3"=occurred)'),
    },
    withErrorHandling(async ({ idProject, status }) => {
      const params: Record<string, string> = { idProject };
      if (status) params.status = status;

      const risks = await client.getAll('Risk', params);
      const enriched = (risks as Array<Record<string, unknown>>).map((r) => ({
        ...r,
        exposure: (Number(r.probability ?? 0) * Number(r.impact ?? 0)),
      }));

      enriched.sort((a, b) => b.exposure - a.exposure);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: enriched.length, risks: enriched }, null, 2),
          },
        ],
      };
    }, 'list_risks'),
  );

  // create_risk
  server.tool(
    'create_risk',
    'Create a new risk in a project. Include name, description, probability (1-5), impact (1-5), and a mitigation plan. The risk exposure score will be calculated automatically.',
    {
      idProject: z.string().describe('Parent project ID'),
      name: z.string().min(1).describe('Risk name/title'),
      description: z.string().optional().describe('Detailed risk description'),
      type: z.string().optional().describe('Risk type category'),
      probability: z.number().min(1).max(5).describe('Probability score (1=very unlikely, 5=almost certain)'),
      impact: z.number().min(1).max(5).describe('Impact score (1=negligible, 5=catastrophic)'),
      mitigationPlan: z.string().optional().describe('Plan to mitigate or reduce this risk'),
      responsibleId: z.string().optional().describe('Resource ID responsible for monitoring this risk'),
    },
    withErrorHandling(async (args) => {
      const data = riskSchema.parse(args);
      const result = await client.create('Risk', data);
      return {
        content: [{ type: 'text' as const, text: `Risk created successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'create_risk'),
  );

  // update_risk
  server.tool(
    'update_risk',
    'Update an existing risk. Modify probability, impact, status, or mitigation plan as the risk evolves. Provide the risk ID and only the fields you want to change.',
    {
      id: z.string().describe('Risk ID to update'),
      name: z.string().optional().describe('New risk name'),
      description: z.string().optional().describe('New description'),
      probability: z.number().min(1).max(5).optional().describe('New probability score'),
      impact: z.number().min(1).max(5).optional().describe('New impact score'),
      status: z.string().optional().describe('New risk status'),
      mitigationPlan: z.string().optional().describe('Updated mitigation plan'),
    },
    withErrorHandling(async (args) => {
      const { id, ...rest } = args;
      const result = await client.update('Risk', { id, ...rest });
      return {
        content: [{ type: 'text' as const, text: `Risk updated successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'update_risk'),
  );

  // list_issues
  server.tool(
    'list_issues',
    'List all active issues/problems for a project. Issues are different from risks — they represent problems that have already occurred and need resolution.',
    {
      idProject: z.string().describe('Project ID to list issues for'),
      status: z.string().optional().describe('Filter by issue status (e.g., "1"=open, "2"=in progress, "3"=resolved, "4"=closed)'),
      priority: z.string().optional().describe('Filter by priority'),
      responsibleId: z.string().optional().describe('Filter by assigned person'),
    },
    withErrorHandling(async ({ idProject, status, priority, responsibleId }) => {
      const params: Record<string, string> = { idProject };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (responsibleId) params.idResource = responsibleId;

      const issues = await client.getAll('Issue', params);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: (issues as Array<unknown>).length, issues }, null, 2),
          },
        ],
      };
    }, 'list_issues'),
  );

  // create_issue
  server.tool(
    'create_issue',
    'Create a new issue/problem in a project. Issues represent actual problems that need fixing (as opposed to risks which are potential future problems). Include description, priority, and assignee.',
    {
      idProject: z.string().describe('Parent project ID'),
      name: z.string().min(1).describe('Issue name/title'),
      description: z.string().optional().describe('Detailed issue description'),
      type: z.string().optional().describe('Issue type'),
      priority: z.string().optional().describe('Priority level (1=low, 5=critical)'),
      responsibleId: z.string().optional().describe('Resource ID to assign the issue to'),
    },
    withErrorHandling(async (args) => {
      const data = issueSchema.parse(args);
      const result = await client.create('Issue', data);
      return {
        content: [{ type: 'text' as const, text: `Issue created successfully:\n${JSON.stringify(result, null, 2)}` }],
      };
    }, 'create_issue'),
  );

  // list_opportunities
  server.tool(
    'list_opportunities',
    'List all opportunities for a project. Opportunities are positive risks — situations that could benefit the project if exploited. Filter by status to see only active ones.',
    {
      idProject: z.string().describe('Project ID to list opportunities for'),
      status: z.string().optional().describe('Filter by opportunity status'),
    },
    withErrorHandling(async ({ idProject, status }) => {
      const params: Record<string, string> = { idProject };
      if (status) params.status = status;

      const opportunities = await client.getAll('Opportunity', params);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ count: (opportunities as Array<unknown>).length, opportunities }, null, 2),
          },
        ],
      };
    }, 'list_opportunities'),
  );
}
