import type { FastifyInstance, FastifyRequest } from "fastify";
import { createId } from "../utils/ids";

type RequestWithId = FastifyRequest & {
  requestId?: string;
};

export function getRequestId(request: FastifyRequest): string {
  return (request as RequestWithId).requestId ?? "request_unknown";
}

export function registerRequestContext(app: FastifyInstance): void {
  app.addHook("onRequest", async (request, reply) => {
    const header = request.headers["x-request-id"];
    const requestId = Array.isArray(header) ? header[0] : header ?? createId("request");
    (request as RequestWithId).requestId = requestId;
    reply.header("x-request-id", requestId);
  });
}
