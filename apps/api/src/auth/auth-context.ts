import type { FastifyRequest } from "fastify";
import type { AuthContext } from "../schemas/auth.schema";

type RequestWithAuth = FastifyRequest & {
  auth?: AuthContext;
};

export function getAuthContext(request: FastifyRequest): AuthContext | undefined {
  return (request as RequestWithAuth).auth;
}

export function setAuthContext(request: FastifyRequest, context: AuthContext): void {
  (request as RequestWithAuth).auth = context;
}
