import type { FastifyRequest } from "fastify";
import type { PermissionAction, PermissionResource } from "../schemas/auth.schema";

export interface RoutePermission {
  resource: PermissionResource;
  action: PermissionAction;
}

export function routePermission(request: FastifyRequest): RoutePermission | undefined {
  const url = request.url.split("?")[0];
  const method = request.method.toUpperCase();

  if (url === "/admin/access-decisions") {
    return { resource: "audit", action: "read" };
  }
  if (url.startsWith("/admin")) {
    return { resource: "system", action: "manage" };
  }
  if (url.startsWith("/audit") || url.startsWith("/system/versions")) {
    return { resource: "audit", action: "read" };
  }
  if (url.startsWith("/metrics") || url.startsWith("/health/dependencies")) {
    return { resource: "system", action: "read" };
  }
  if (url === "/analyze") {
    return { resource: "case", action: "create" };
  }
  if (url.includes("/tool-calls") || url.startsWith("/tools")) {
    return { resource: "tool", action: method === "GET" ? "read" : "execute" };
  }
  if (url.startsWith("/sandbox")) {
    return { resource: "tool", action: method === "GET" ? "read" : "execute" };
  }
  if (url.startsWith("/knowledge")) {
    return { resource: "system", action: method === "GET" ? "read" : "manage" };
  }
  if (url.startsWith("/approvals")) {
    return { resource: "action", action: "read" };
  }
  if (url.includes("/action")) {
    return { resource: "action", action: url.includes("/approval") ? "approve" : method === "GET" ? "read" : "execute" };
  }
  if (url.startsWith("/validation")) {
    return { resource: "system", action: method === "GET" ? "read" : "manage" };
  }
  if (url.includes("/members")) {
    return { resource: "case", action: method === "GET" ? "read" : "manage" };
  }
  if (url.startsWith("/cases")) {
    return { resource: "case", action: method === "GET" ? "read" : "write" };
  }

  return undefined;
}
