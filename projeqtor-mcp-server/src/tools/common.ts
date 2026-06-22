import { z } from "zod";
import type { ProjeQtOrApiClient } from "../client/projeqtor-api.js";
import { safeTool } from "../utils/error-handler.js";
import { formatProjeqtorTimestamp, daysAgo } from "../utils/date-utils.js";

export interface ToolContext { client: ProjeQtOrApiClient; }

export const idShape = { id: z.union([z.string().min(1), z.number().int().positive()]).describe("ProjeQtOr object id") };

export function mergeExtra<T extends { extra?: Record<string, unknown> }>(payload: T): Record<string, unknown> {
  const { extra, ...rest } = payload;
  return { ...rest, ...(extra ?? {}) };
}

export function registerCrudGet(server: any, ctx: ToolContext, name: string, objectClass: string, description: string) {
  server.registerTool(name, { title: name, description, inputSchema: idShape }, (args: { id: string | number }) => safeTool(() => ctx.client.getObject(objectClass, args.id)));
}

export function recentChanges(ctx: ToolContext, objectClass: string, days: number) {
  const from = formatProjeqtorTimestamp(daysAgo(days));
  const to = formatProjeqtorTimestamp(new Date());
  return ctx.client.updated(objectClass, from, to);
}
