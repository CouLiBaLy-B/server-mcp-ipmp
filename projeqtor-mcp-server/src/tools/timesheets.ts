import { IdSchema, DateSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { type ToolContext } from "./common.js";

export function registerTimesheetTools(server: any, ctx: ToolContext): void {
  server.registerTool("get_timesheet", {
    title: "Get timesheet entries",
    description: "List Work entries for a resource over a date range. Use log_work to create entries.",
    inputSchema: { resourceId: IdSchema, from: DateSchema, to: DateSchema }
  }, (a: any) => safeTool(() => ctx.client.search("Work", [
    { field: "idResource", operator: "=", value: a.resourceId },
    { field: "workDate", operator: ">=", value: a.from },
    { field: "workDate", operator: "<=", value: a.to }
  ])));
}
