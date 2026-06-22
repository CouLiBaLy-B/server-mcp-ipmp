import { z } from "zod";
import { IdSchema, JsonObjectSchema } from "../schemas/projeqtor-types.js";
import { safeTool } from "../utils/error-handler.js";
import { type ToolContext } from "./common.js";

export function registerDocumentTools(server: any, ctx: ToolContext): void {
  server.registerTool("list_documents", {
    title: "List project documents",
    description: "List Document objects linked to a project or product. Metadata only; binary upload/download is intentionally not handled by this REST wrapper.",
    inputSchema: { projectId: IdSchema.optional(), productId: IdSchema.optional() }
  }, (a: any) => safeTool(() => {
    const criteria = [
      ...(a.projectId ? [{ field: "idProject", operator: "=", value: a.projectId }] : []),
      ...(a.productId ? [{ field: "idProduct", operator: "=", value: a.productId }] : [])
    ];
    return criteria.length ? ctx.client.search("Document", criteria) : ctx.client.listAll("Document");
  }));

  server.registerTool("create_document_record", {
    title: "Create document metadata record",
    description: "Create a ProjeQtOr Document metadata record. Use for registering documents; actual binary attachment handling depends on ProjeQtOr instance endpoints/plugins.",
    inputSchema: { name: z.string().min(1), projectId: IdSchema.optional(), description: z.string().optional(), extra: JsonObjectSchema.optional() }
  }, (a: any) => safeTool(() => ctx.client.create("Document", { name: a.name, idProject: a.projectId, description: a.description, ...(a.extra ?? {}) })));
}
