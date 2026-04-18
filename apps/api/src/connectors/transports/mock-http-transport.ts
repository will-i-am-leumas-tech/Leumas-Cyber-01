import { readFile } from "node:fs/promises";
import path from "node:path";
import { findProjectRoot } from "../../utils/files";

export async function readFixtureRecords(relativePath: string): Promise<Array<Record<string, unknown>>> {
  const raw = await readFile(path.join(findProjectRoot(), relativePath), "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [parsed as Record<string, unknown>];
}

export function filterFixtureRecords(input: {
  records: Array<Record<string, unknown>>;
  query?: string;
  filters?: Record<string, unknown>;
  limit: number;
}): Array<Record<string, unknown>> {
  const query = input.query?.toLowerCase().trim() ?? "";
  const terms = query.match(/[a-z0-9_.:@\\/-]{3,}/g) ?? [];
  const filters = input.filters ?? {};

  return input.records
    .filter((record) => {
      const serialized = JSON.stringify(record).toLowerCase();
      const queryMatched = terms.length === 0 || terms.some((term) => serialized.includes(term));
      const filtersMatched = Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          return true;
        }
        return String(record[key] ?? "").toLowerCase() === String(value).toLowerCase();
      });
      return queryMatched && filtersMatched;
    })
    .slice(0, input.limit);
}
