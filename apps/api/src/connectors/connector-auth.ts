import type { ConnectorDefinition } from "../schemas/connectors.schema";

export interface ConnectorAuthStatus {
  configured: boolean;
  reason: string;
}

export function checkConnectorAuth(definition: ConnectorDefinition): ConnectorAuthStatus {
  if (definition.credentialRef.type === "none") {
    return {
      configured: true,
      reason: "Connector uses fixture-backed local auth."
    };
  }

  if (definition.credentialRef.type === "env") {
    return {
      configured: Boolean(process.env[definition.credentialRef.ref]),
      reason: process.env[definition.credentialRef.ref]
        ? `Environment credential ${definition.credentialRef.ref} is configured.`
        : `Environment credential ${definition.credentialRef.ref} is missing.`
    };
  }

  return {
    configured: false,
    reason: "Vault-backed connector credentials are not implemented in this MVP."
  };
}
