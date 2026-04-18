# Model Provider Quality

The model provider layer is responsible for routing model work, validating structured output, tracking usage, and comparing provider quality against evals.

## Provider Profiles

Use the profile endpoint to inspect configured providers:

```bash
curl http://127.0.0.1:3001/providers/profiles
```

Each profile includes provider id, model name, enabled state, capabilities, context limits, structured-output support, latency target, safety review requirement, and data residency notes.

## Prompt Versions

Prompt versions are registered alongside provider profiles. Each prompt record includes task type, schema name, prompt hash, owner, change summary, and minimum eval score. Treat prompt changes like code changes: update evals, run the comparison harness, and record the reason.

## Fallback Policy

The provider route exposes the selected provider and the fallback decision for alert analysis:

```bash
curl http://127.0.0.1:3001/providers
```

Fallback decisions are advisory in this MVP stage. They identify whether the selected provider is healthy, whether a fallback is available, or whether the system should fail closed. Do not use fallback to bypass safety, output validation, or evidence-grounding checks.

## Evidence Grounding

Analysis responses now create grounding findings for summary, severity, recommendations, and reasoning findings. A grounding finding can be:

- `supported`: the claim has direct evidence overlap
- `weak`: the claim is a reasonable defensive follow-up but needs review
- `unsupported`: the claim lacks material evidence support

Weak and unsupported claims require analyst review before relying on them operationally.

## Provider Comparison

Run a local provider comparison against the eval suite:

```bash
curl -X POST http://127.0.0.1:3001/providers/comparisons \
  -H 'content-type: application/json' \
  -d '{"includeMockBaseline":true}'
```

The comparison report includes pass counts, average score, safety failures, and grounding-related evidence failures for each provider.

## Required Verification

Run these checks after changing providers or prompts:

```bash
npm run evals
npm test -- tests/unit/model-profile-service.test.ts tests/unit/evidence-grounding-validator.test.ts tests/integration/model-provider-quality-flow.test.ts
npm run ci:verify
```
