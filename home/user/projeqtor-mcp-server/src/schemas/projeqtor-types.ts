import { z } from 'zod';

// ─── Shared Zod schemas for ProjeQtOr entities ──────────────────────────────────

export const objectId = z.string().or(z.number()).describe('Object ID');
export const objectClass = z.string().describe('ProjeQtOr object class name (e.g., Project, Activity, Ticket)');

// Project schemas
export const projectSchema = z.object({
  id: objectId.optional(),
  name: z.string().min(1).describe('Project name'),
  description: z.string().optional().describe('Project description'),
  type: z.string().optional().describe('Project type'),
  status: z.string().optional().describe('Project status'),
  priority: z.string().optional().describe('Priority (1=lowest, 5=highest)'),
  progress: z.number().min(0).max(100).optional().describe('Progress percentage'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  budget: z.number().optional().describe('Project budget'),
  clientId: z.string().optional().describe('Client ID'),
  projectManagerId: z.string().optional().describe('Project manager resource ID'),
});

// Activity schemas
export const activitySchema = z.object({
  id: objectId.optional(),
  idProject: z.string().min(1).describe('Parent project ID'),
  name: z.string().min(1).describe('Activity name'),
  description: z.string().optional().describe('Activity description'),
  type: z.string().optional().describe('Activity type'),
  status: z.string().optional().describe('Activity status'),
  priority: z.string().optional().describe('Priority'),
  plannedStartDate: z.string().optional().describe('Planned start date'),
  plannedEndDate: z.string().optional().describe('Planned end date'),
  realStartDate: z.string().optional().describe('Actual start date'),
  realEndDate: z.string().optional().describe('Actual end date'),
  work: z.number().optional().describe('Estimated work (days)'),
  realWork: z.number().optional().describe('Actual work done (days)'),
  remainingWork: z.number().optional().describe('Remaining work (days)'),
  cost: z.number().optional().describe('Estimated cost'),
  realCost: z.number().optional().describe('Actual cost'),
  responsibleId: z.string().optional().describe('Responsible resource ID'),
  parentId: z.string().optional().describe('Parent activity ID (for sub-tasks)'),
});

// Ticket schemas
export const ticketSchema = z.object({
  id: objectId.optional(),
  idProject: z.string().min(1).describe('Parent project ID'),
  name: z.string().min(1).describe('Ticket name/summary'),
  description: z.string().optional().describe('Detailed description'),
  type: z.string().optional().describe('Ticket type (bug, improvement, etc.)'),
  status: z.string().optional().describe('Ticket status'),
  priority: z.string().optional().describe('Priority'),
  severity: z.string().optional().describe('Severity level'),
  responsibleId: z.string().optional().describe('Assigned resource ID'),
  creationDate: z.string().optional().describe('Creation date'),
  deadline: z.string().optional().describe('Deadline'),
});

// Resource schemas
export const resourceSchema = z.object({
  id: objectId.optional(),
  name: z.string().min(1).describe('Resource name'),
  type: z.string().optional().describe('Resource type'),
  email: z.string().email().optional().describe('Email address'),
  cost: z.number().optional().describe('Daily cost'),
  isActive: z.boolean().optional().describe('Whether resource is active'),
});

// Work / Timesheet schemas
export const workSchema = z.object({
  id: objectId.optional(),
  idResource: z.string().min(1).describe('Resource ID'),
  idActivity: z.string().min(1).describe('Activity/Ticket ID'),
  date: z.string().describe('Work date (YYYY-MM-DD)'),
  work: z.number().positive().describe('Work duration (in hours)'),
  description: z.string().optional().describe('Work description'),
  idAssignment: z.string().optional().describe('Assignment ID'),
});

// Risk schemas
export const riskSchema = z.object({
  id: objectId.optional(),
  idProject: z.string().min(1).describe('Parent project ID'),
  name: z.string().min(1).describe('Risk name'),
  description: z.string().optional().describe('Risk description'),
  type: z.string().optional().describe('Risk type'),
  probability: z.number().min(1).max(5).optional().describe('Probability (1-5)'),
  impact: z.number().min(1).max(5).optional().describe('Impact (1-5)'),
  status: z.string().optional().describe('Risk status'),
  mitigationPlan: z.string().optional().describe('Mitigation plan'),
  responsibleId: z.string().optional().describe('Responsible resource ID'),
});

// Issue schemas
export const issueSchema = z.object({
  id: objectId.optional(),
  idProject: z.string().min(1).describe('Parent project ID'),
  name: z.string().min(1).describe('Issue name'),
  description: z.string().optional().describe('Issue description'),
  type: z.string().optional().describe('Issue type'),
  status: z.string().optional().describe('Issue status'),
  priority: z.string().optional().describe('Priority'),
  responsibleId: z.string().optional().describe('Responsible resource ID'),
});

// Financial schemas
export const expenseSchema = z.object({
  id: objectId.optional(),
  idProject: z.string().min(1).describe('Parent project ID'),
  name: z.string().min(1).describe('Expense name'),
  amount: z.number().positive().describe('Expense amount'),
  date: z.string().describe('Expense date (YYYY-MM-DD)'),
  type: z.string().optional().describe('Expense type'),
  description: z.string().optional().describe('Description'),
  idResource: z.string().optional().describe('Resource ID'),
});

export const budgetSchema = z.object({
  id: objectId.optional(),
  idProject: z.string().min(1).describe('Parent project ID'),
  name: z.string().min(1).describe('Budget name'),
  amount: z.number().positive().describe('Budget amount'),
  type: z.string().optional().describe('Budget type'),
});

// Meeting schemas
export const meetingSchema = z.object({
  id: objectId.optional(),
  name: z.string().min(1).describe('Meeting name'),
  idProject: z.string().optional().describe('Related project ID'),
  date: z.string().optional().describe('Meeting date'),
  location: z.string().optional().describe('Meeting location'),
  description: z.string().optional().describe('Agenda / description'),
  participants: z.string().optional().describe('Participant IDs (comma-separated)'),
});

// Document schemas
export const documentSchema = z.object({
  id: objectId.optional(),
  name: z.string().min(1).describe('Document name'),
  idProject: z.string().optional().describe('Related project ID'),
  type: z.string().optional().describe('Document type'),
  description: z.string().optional().describe('Document description'),
  url: z.string().optional().describe('Document URL or path'),
});

// Assignment schemas
export const assignmentSchema = z.object({
  id: objectId.optional(),
  idResource: z.string().min(1).describe('Resource ID'),
  idActivity: z.string().min(1).describe('Activity/Project ID'),
  assignedWork: z.number().optional().describe('Assigned work (hours)'),
  startDate: z.string().optional().describe('Assignment start date'),
  endDate: z.string().optional().describe('Assignment end date'),
});

// Search / Filter schemas
export const searchCriteriaSchema = z.object({
  objectClass: objectClass,
  field: z.string().describe('Field name to search on'),
  operator: z.enum(['=', '!=', 'like', '>', '<', '>=', '<=', 'in', 'isNull']).default('=').describe('Comparison operator'),
  value: z.string().describe('Search value'),
});

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.string().describe('Start date (YYYYMMDDHHMMSS)'),
  endDate: z.string().describe('End date (YYYYMMDDHHMMSS)'),
});

// Export all schemas grouped by domain
export const schemas = {
  objectId,
  objectClass,
  project: projectSchema,
  activity: activitySchema,
  ticket: ticketSchema,
  resource: resourceSchema,
  work: workSchema,
  risk: riskSchema,
  issue: issueSchema,
  expense: expenseSchema,
  budget: budgetSchema,
  meeting: meetingSchema,
  document: documentSchema,
  assignment: assignmentSchema,
  searchCriteria: searchCriteriaSchema,
  dateRange: dateRangeSchema,
};
