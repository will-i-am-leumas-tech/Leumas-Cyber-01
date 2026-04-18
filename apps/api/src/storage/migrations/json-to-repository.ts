import type { CaseService } from "../../services/case-service";
import type { CaseRepository } from "../storage-adapter";

export interface MigrationResult {
  migratedCases: number;
  skippedCases: number;
  errors: string[];
}

export async function migrateCasesToRepository(input: {
  source: CaseService;
  target: CaseRepository;
}): Promise<MigrationResult> {
  const list = await input.source.listCases();
  const errors: string[] = [];
  let migratedCases = 0;
  let skippedCases = 0;

  for (const item of list) {
    const cyberCase = await input.source.getCase(item.id);
    if (!cyberCase) {
      skippedCases += 1;
      continue;
    }
    try {
      await input.target.save(cyberCase);
      migratedCases += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Failed to migrate ${item.id}`);
    }
  }

  return {
    migratedCases,
    skippedCases,
    errors
  };
}
