export function nowIso(): string {
  return new Date().toISOString();
}

export function compareIsoDesc(a: string, b: string): number {
  return b.localeCompare(a);
}
