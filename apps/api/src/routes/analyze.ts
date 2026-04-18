import type { FastifyInstance, FastifyRequest } from "fastify";
import { analyzeInputSchema, type AnalyzeInput } from "../schemas/input.schema";
import type { AnalyzePipeline } from "../pipeline/analyze-pipeline";

interface AnalyzeRouteDeps {
  pipeline: AnalyzePipeline;
}

async function multipartToAnalyzeInput(request: FastifyRequest): Promise<AnalyzeInput> {
  const multipartRequest = request as FastifyRequest & {
    parts: () => AsyncIterableIterator<Record<string, unknown>>;
  };

  const input: Record<string, unknown> = {};
  const textParts: string[] = [];
  const files: Array<{ filename: string; mediaType?: string; text: string; json?: unknown }> = [];

  for await (const part of multipartRequest.parts()) {
    if (part.type === "file") {
      const filePart = part as unknown as Record<string, unknown> & {
        filename: string;
        mimetype?: string;
        toBuffer: () => Promise<Buffer>;
      };
      const buffer = await filePart.toBuffer();
      const fileText = buffer.toString("utf8");
      input.filename = filePart.filename;
      const file: { filename: string; mediaType?: string; text: string; json?: unknown } = {
        filename: filePart.filename,
        mediaType: filePart.mimetype,
        text: fileText
      };

      if (filePart.filename.toLowerCase().endsWith(".json")) {
        try {
          file.json = JSON.parse(fileText);
        } catch {
          // Keep malformed JSON as raw text so analysts can still review it.
        }
      }
      files.push(file);
      continue;
    }

    if (part.type === "field") {
      const fieldPart = part as unknown as Record<string, unknown> & {
        fieldname: string;
        value: unknown;
      };

      if (fieldPart.fieldname === "json" && typeof fieldPart.value === "string") {
        input.json = JSON.parse(fieldPart.value);
      } else if (fieldPart.fieldname === "text" && typeof fieldPart.value === "string") {
        textParts.push(fieldPart.value);
      } else {
        input[fieldPart.fieldname] = String(fieldPart.value);
      }
    }
  }

  if (textParts.length > 0) {
    input.text = textParts.join("\n\n");
  }

  if (files.length > 0) {
    input.files = files;
  }

  if (!input.mode) {
    input.mode = "logs";
  }

  return analyzeInputSchema.parse(input);
}

async function requestToAnalyzeInput(request: FastifyRequest): Promise<AnalyzeInput> {
  const maybeMultipart = request as FastifyRequest & { isMultipart?: () => boolean };
  if (maybeMultipart.isMultipart?.()) {
    return multipartToAnalyzeInput(request);
  }

  return analyzeInputSchema.parse(request.body);
}

export function registerAnalyzeRoutes(app: FastifyInstance, deps: AnalyzeRouteDeps): void {
  app.post("/analyze", async (request) => {
    const input = await requestToAnalyzeInput(request);
    return deps.pipeline.run(input);
  });
}
