import { z } from "zod";

export const IdSchema = z.union([z.string().min(1), z.number().int().positive()]).describe("ProjeQtOr numeric identifier");
export const OptionalIdSchema = IdSchema.optional();
export const DateSchema = z.string().describe("Date in ISO format YYYY-MM-DD unless ProjeQtOr custom fields require another format");
export const JsonObjectSchema = z.record(z.string(), z.unknown()).describe("Raw ProjeQtOr fields; use native field names such as name, idProject, idStatus");

export const ProjectPayloadSchema = z.object({
  name: z.string().min(1).describe("Project name"),
  idProjectType: OptionalIdSchema.describe("Project type id"),
  idStatus: OptionalIdSchema.describe("Status id"),
  idOrganization: OptionalIdSchema.describe("Organization id"),
  description: z.string().optional(),
  plannedStartDate: DateSchema.optional(),
  plannedEndDate: DateSchema.optional(),
  extra: JsonObjectSchema.optional().describe("Additional ProjeQtOr fields merged into the payload")
});

export const ActivityPayloadSchema = z.object({
  name: z.string().min(1),
  idProject: IdSchema,
  idActivityType: OptionalIdSchema,
  idStatus: OptionalIdSchema,
  idResource: OptionalIdSchema,
  plannedStartDate: DateSchema.optional(),
  plannedEndDate: DateSchema.optional(),
  plannedWork: z.number().nonnegative().optional().describe("Planned work, typically in days in ProjeQtOr"),
  description: z.string().optional(),
  extra: JsonObjectSchema.optional()
});

export const TicketPayloadSchema = z.object({
  name: z.string().min(1),
  idProject: OptionalIdSchema,
  idTicketType: OptionalIdSchema,
  idStatus: OptionalIdSchema,
  idPriority: OptionalIdSchema,
  idResource: OptionalIdSchema.describe("Responsible resource id"),
  description: z.string().optional(),
  extra: JsonObjectSchema.optional()
});

export const RiskPayloadSchema = z.object({
  name: z.string().min(1),
  idProject: IdSchema,
  idRiskType: OptionalIdSchema,
  idStatus: OptionalIdSchema,
  impact: z.string().optional(),
  probability: z.string().optional(),
  criticality: z.string().optional(),
  mitigationPlan: z.string().optional().describe("Action/mitigation plan, mapped to description if no native field exists"),
  extra: JsonObjectSchema.optional()
});

export const CriteriaSchema = z.object({
  field: z.string().min(1).describe("ProjeQtOr field name, e.g. idProject, idStatus, name"),
  operator: z.string().default("=").describe("SQL-like operator supported by ProjeQtOr search endpoint, e.g. =, !=, LIKE, >=, <="),
  value: z.union([z.string(), z.number(), z.boolean()]).describe("Criterion value")
});

export const PeriodSchema = z.object({
  from: DateSchema.describe("Start date inclusive"),
  to: DateSchema.describe("End date inclusive")
});

export type ProjectPayload = z.infer<typeof ProjectPayloadSchema>;
export type ActivityPayload = z.infer<typeof ActivityPayloadSchema>;
export type TicketPayload = z.infer<typeof TicketPayloadSchema>;
export type RiskPayload = z.infer<typeof RiskPayloadSchema>;
