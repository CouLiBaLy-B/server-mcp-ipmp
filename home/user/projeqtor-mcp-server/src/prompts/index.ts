import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// ─── MCP Prompts (reusable templates for LLM workflows) ─────────────────────

export function registerPrompts(server: McpServer) {
  // project_status_report
  server.prompt(
    'project_status_report',
    'Generate a comprehensive project status report including progress, KPIs, risks, and recent activity.',
    {
      idProject: z.string().describe('Project ID to generate the report for'),
      includeFinancials: z.boolean().optional().default(false).describe('Include budget/expense analysis'),
    },
    ({ idProject, includeFinancials }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Generate a comprehensive status report for project ${idProject}.

Please follow this structure:
1. **Project Overview**: Name, status, progress %, start/end dates
2. **Activity Summary**: Total activities, completed, in-progress, not-started
3. **Risk Analysis**: Active risks sorted by exposure (probability × impact)
4. **Issue Tracking**: Open and resolved tickets/issues
5. **Recent Changes**: Modifications in the last 7 days
6. **Team Workload**: Resource assignments and capacity utilization
7. **Timeline Assessment**: Are we on track? Any delays?
${includeFinancials ? `
8. **Financial Status**: Budget vs actual expenses, cost variance
` : ''}
8. **Recommendations**: 3-5 actionable items to improve project health

Use the available MCP tools to gather all necessary data.
Be specific with numbers and percentages where possible.`,
          },
        },
      ],
    }),
  );

  // risk_analysis
  server.prompt(
    'risk_analysis',
    'Analyze and prioritize risks for a project. Identifies high-exposure risks and suggests mitigation strategies.',
    {
      idProject: z.string().describe('Project ID to analyze risks for'),
      threshold: z.number().optional().default(12).describe('Minimum risk exposure score to flag as critical (probability × impact)'),
    },
    ({ idProject, threshold }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Perform a detailed risk analysis for project ${idProject}.

Please follow this structure:
1. **Risk Inventory**: List all risks with their probability, impact, and exposure scores
2. **Critical Risks** (exposure ≥ ${threshold}): Detailed analysis with mitigation recommendations
3. **Risk Trends**: Are risks increasing or decreasing over time?
4. **Correlation Analysis**: Do any risks compound each other?
5. **Mitigation Plan**: Specific, actionable steps for each critical risk
6. **Risk Owner Assignment**: Who should be responsible for monitoring each risk?
7. **Escalation Triggers**: When should risks be escalated to management?

Use the available MCP tools to gather risk data.
Prioritize risks by exposure score (probability × impact).
For each critical risk, provide at least 2 mitigation strategies.`,
          },
        },
      ],
    }),
  );

  // resource_optimization
  server.prompt(
    'resource_optimization',
    'Analyze resource workload and suggest optimizations for better capacity utilization.',
    {
      idProject: z.string().describe('Project ID to analyze resource usage for'),
      periodWeeks: z.number().optional().default(4).describe('Number of weeks to analyze'),
    },
    ({ idProject, periodWeeks }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze resource utilization and optimization opportunities for project ${idProject} over the next ${periodWeeks} weeks.

Please follow this structure:
1. **Current Workload**: For each resource, show assigned hours, actual hours, and availability
2. **Over-allocated Resources**: Identify resources with >100% capacity utilization
3. **Under-utilized Resources**: Identify resources with <50% capacity utilization
4. **Skill Gaps**: Are there activities without appropriately skilled resources?
5. **Rebalancing Suggestions**: Specific recommendations to optimize resource allocation
6. **Hiring/Contracting Needs**: Do we need additional resources?
7. **Timeline Impact**: How would resource changes affect project delivery?

Use the available MCP tools to gather resource and assignment data.
Provide concrete, actionable recommendations with expected impact.`,
          },
        },
      ],
    }),
  );

  // sprint_review_summary
  server.prompt(
    'sprint_review_summary',
    'Generate a sprint review summary showing completed work, carry-over items, and retrospective insights.',
    {
      idProject: z.string().describe('Project ID for the sprint review'),
      sprintStartDate: z.string().describe('Sprint start date (YYYY-MM-DD)'),
      sprintEndDate: z.string().describe('Sprint end date (YYYY-MM-DD)'),
    },
    ({ idProject, sprintStartDate, sprintEndDate }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Generate a sprint review summary for project ${idProject}.

**Sprint Period**: ${sprintStartDate} to ${sprintEndDate}

Please follow this structure:
1. **Sprint Overview**: Duration, planned vs actual delivery
2. **Completed Work**: All activities/tickets finished during the sprint
3. **Carry-over Items**: Work that wasn't completed and why
4. **Sprint Velocity**: Story points or work units completed vs planned
5. **Quality Metrics**: Bug count, rework rate, test coverage
6. **Blockers Encountered**: What impeded progress during the sprint?
7. **Retrospective Insights**:
   - What went well?
   - What could be improved?
   - Action items for next sprint
8. **Next Sprint Preview**: Top priorities for the upcoming sprint

Use the available MCP tools to gather activity, ticket, and work data.
Focus on measurable outcomes and specific examples.
Include recommendations for process improvements.`,
          },
        },
      ],
    }),
  );
}
