import type { IdentityPrincipal } from "../schemas/auth-v2.schema";
import { roleIdSchema } from "../schemas/auth.schema";

export interface OidcClaims {
  sub: string;
  email?: string;
  name?: string;
  roles?: unknown;
  groups?: unknown;
  tenant_ids?: unknown;
  tenantId?: unknown;
  attributes?: unknown;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" ? [value] : [];
}

function rolesFromClaims(value: unknown): IdentityPrincipal["roles"] {
  return stringArray(value)
    .map((role) => roleIdSchema.safeParse(role))
    .filter((result) => result.success)
    .map((result) => result.data);
}

function attributesFromClaims(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, attributeValue]) => [key, attributeValue])
  );
}

export function principalFromOidcClaims(claims: OidcClaims): IdentityPrincipal {
  const tenantIds = [...new Set([...stringArray(claims.tenant_ids), ...stringArray(claims.tenantId)])];
  return {
    id: `oidc_${claims.sub}`,
    subject: claims.sub,
    email: claims.email ?? `${claims.sub}@oidc.local`,
    tenantIds: tenantIds.length > 0 ? tenantIds : ["tenant_default"],
    roles: rolesFromClaims(claims.roles),
    attributes: attributesFromClaims(claims.attributes),
    groups: stringArray(claims.groups),
    provider: "oidc"
  };
}
