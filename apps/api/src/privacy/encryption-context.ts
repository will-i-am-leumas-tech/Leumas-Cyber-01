import type { DataClass, EncryptionContext } from "../schemas/privacy.schema";

export function buildEncryptionContext(input: {
  tenantId?: string;
  keyRef?: string;
  dataClass: DataClass;
}): EncryptionContext {
  return {
    tenantId: input.tenantId ?? "local-dev",
    keyRef: input.keyRef ?? "local-dev-managed-key",
    dataClass: input.dataClass,
    algorithm: "managed-by-storage-adapter"
  };
}
