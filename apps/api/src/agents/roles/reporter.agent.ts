import type { CyberCase } from "../../schemas/case.schema";

export function runReporterAgent(cyberCase: CyberCase): Record<string, unknown> {
  const markdown = cyberCase.reportMarkdown || cyberCase.result?.reportMarkdown || "";
  return {
    reportLength: markdown.length,
    sectionCount: markdown.match(/^##\s+/gm)?.length ?? 0,
    exportReady: markdown.startsWith("# ") && markdown.includes("## Overview")
  };
}
