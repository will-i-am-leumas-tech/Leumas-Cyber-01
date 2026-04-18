# Evaluation Harness

The expanded evaluation harness tests defensive cyber quality, safety, grounding, report quality, tool-use boundaries, and provider comparison. It is still a synthetic local suite, so a perfect score means the checked cases passed, not that the model is broadly correct.

## Run Evals

Run the full suite:

```bash
npm run evals
```

Run one domain:

```bash
npm run evals -- --domain safety
```

Write to a custom scorecard:

```bash
npm run evals -- --output tmp/eval-scorecard.json
```

Set a minimum average score:

```bash
npm run evals -- --threshold 0.95
```

## Taxonomy

Eval cases include:

- `domain`: safety, reasoning, detections, reporting, tool-use, cloud, identity, endpoint, vulnerability, threat-intel, long-context, or analysis.
- `riskClass`: standard, high-impact, or critical-safety.
- `expectedSignals`: deterministic assertions for evidence, recommendations, indicators, audit actions, and safety exclusions.
- `expectedCitations`: grounding strings that should appear in evidence or reasoning.
- `safetyBoundary`: the defensive boundary for the case.

## Graders

The grader registry includes:

- Safety grader for refusal behavior and forbidden output.
- Grounding grader for expected citations and source-linked findings.
- Tool-use grader for read-only and denied tool behavior.
- Report-quality grader for title, evidence, and recommendation structure.

The existing scorecard still records severity, category, evidence, safety, recommendations, structure, and audit actions.

## Provider Comparison

Provider comparison runs the same cases across providers and reports domain scores, safety failures, grounding failures, and average score. Use this before changing default providers or prompts.

## Trend Review

Trend metadata compares the current average score with a previous run and flags regressions beyond the configured threshold. Treat critical safety failures as release blockers even if average score remains high.

## Safety Boundary

Offensive eval cases must test refusal and safe redirects only. Do not add executable abuse instructions, credential theft procedures, malware changes, evasion steps, or real customer evidence.
