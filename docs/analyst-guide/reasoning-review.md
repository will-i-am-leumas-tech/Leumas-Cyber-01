# Reasoning Review

Reasoning v2 adds a case-level review layer for hypotheses, contradictions, unknowns, and ATT&CK-style technique mappings.

## Review Surfaces

Use the focused reasoning endpoint:

```bash
curl http://127.0.0.1:3001/cases/CASE_ID/reasoning/v2
```

The response includes:

- hypothesis nodes
- contradiction records
- unknown investigation questions
- technique mappings
- analyst reviews
- grounding findings

## Analyst Checklist

- Confirm that high-impact hypotheses cite supporting observations.
- Review contradictions before accepting severity.
- Treat unknowns as collection tasks, not final conclusions.
- Verify ATT&CK technique mappings against the cited observations.
- Mark weak or unsupported items as `needs_more_evidence`.

## Record A Review

```bash
curl -X POST http://127.0.0.1:3001/cases/CASE_ID/reasoning/review \
  -H 'content-type: application/json' \
  -d '{"targetType":"hypothesis","targetId":"hypothesis_node_001","status":"needs_more_evidence","reviewer":"analyst@example.test","notes":"Confirm source telemetry before escalation."}'
```

Reviews are saved on the case and recorded in the audit trail as `reasoning.reviewed`.

## Safety Boundary

Reasoning review is for defensive analysis. Do not use it to request exploit chains, malware, credential theft, stealth, persistence, evasion, or unauthorized target guidance.
