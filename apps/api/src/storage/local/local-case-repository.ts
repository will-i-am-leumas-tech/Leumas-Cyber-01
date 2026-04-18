import type { CaseListItem, CyberCase } from "../../schemas/case.schema";
import { CaseService } from "../../services/case-service";
import type { CaseRepository } from "../storage-adapter";
import { searchCaseList } from "../../search/search-index";

export class LocalJsonCaseRepository implements CaseRepository {
  private readonly caseService: CaseService;

  constructor(dataDir: string) {
    this.caseService = new CaseService(dataDir);
  }

  async save(cyberCase: CyberCase): Promise<CyberCase> {
    return this.caseService.saveCase(cyberCase);
  }

  async get(caseId: string): Promise<CyberCase | null> {
    return this.caseService.getCase(caseId);
  }

  async list(): Promise<CaseListItem[]> {
    return this.caseService.listCases();
  }

  async search(query: string): Promise<CaseListItem[]> {
    return searchCaseList(await this.list(), query);
  }
}
